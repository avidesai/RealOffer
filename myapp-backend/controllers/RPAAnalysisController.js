// controllers/RPAAnalysisController.js

const Document = require('../models/Document');
const { generateSASToken } = require('../config/azureStorage');

const createDocumentAnalysisClient = require('@azure-rest/ai-document-intelligence').default;
const { getLongRunningPoller } = require('@azure-rest/ai-document-intelligence');
const { AzureKeyCredential } = require('@azure/core-auth');

const ENDPOINT = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
const API_KEY = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;

const client = createDocumentAnalysisClient(ENDPOINT, new AzureKeyCredential(API_KEY));

/** Normalize SDK response status that can be "202" or 202. */
function httpStatus(resp) {
  const n = Number(resp?.status);
  return Number.isNaN(n) ? -1 : n;
}

/** Safely pluck values from Azure field objects. */
function getField(fields, ...keys) {
  for (const k of keys) {
    const f = fields?.[k];
    if (!f) continue;
    if (f.value !== undefined && f.value !== null) return String(f.value).trim();
    if (f.content) return String(f.content).trim();
  }
  return '';
}

/** Turn free-text keys into stable field IDs (e.g., "Purchase Price" -> "PurchasePrice"). */
function normalizeKey(key) {
  return String(key || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // zero-width chars
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+([a-z])/g, (_, c) => c.toUpperCase())
    .replace(/^[a-z]/, c => c.toUpperCase());
}

/** Map layout KVP fields to your MakeOfferModal shape. Tweak keys for your RPA. */
function mapFieldsToOffer(fields) {
  const out = {};

  // Money and amounts
  out.purchasePrice =
    getField(fields, 'PurchasePrice', 'OfferPrice', 'TotalAmount', 'Amount') || '';

  out.initialDeposit =
    getField(fields, 'InitialDeposit', 'EarnestMoney', 'Deposit') || '';

  // Dates
  out.closeOfEscrow =
    getField(fields, 'CloseOfEscrow', 'CloseDate', 'EscrowCloseDate') || '';

  // Buyer name
  out.buyerName = getField(fields, 'BuyerName', 'Buyer', 'Buyer1Name') || '';

  // Contingency day counts
  out.financeContingencyDays =
    getField(fields, 'FinanceContingencyDays', 'LoanContingencyDays') || '';
  out.appraisalContingencyDays =
    getField(fields, 'AppraisalContingencyDays') || '';
  out.inspectionContingencyDays =
    getField(fields, 'InspectionContingencyDays', 'InvestigationContingencyDays') || '';

  // Free text
  out.specialTerms =
    getField(fields, 'AdditionalTerms', 'SpecialTerms', 'OtherTerms') || '';

  // Flags default empty so UI logic can set Waived if blank days, etc.
  out.financeContingency = '';
  out.appraisalContingency = '';
  out.inspectionContingency = '';
  out.sellerRentBack = '';
  out.sellerRentBackDays = out.sellerRentBackDays || '';

  return out;
}

/** Build per-page surface for proximity labeling. */
function collectWordsByPage(layout) {
  const pages = layout?.pages || [];
  return pages.map(p => {
    const words = [];
    if (Array.isArray(p.lines)) {
      for (const line of p.lines) {
        const text = (line.content || '').trim();
        if (!text) continue;
        words.push({
          text,
          polygon: line.polygon || [],
          bbox: bboxFromPolygon(line.polygon || []),
          kind: 'line'
        });
      }
    }
    return { pageNumber: p.pageNumber, words, selectionMarks: p.selectionMarks || [] };
  });
}

/** Axis-aligned bbox from polygon. */
function bboxFromPolygon(poly) {
  if (!poly || poly.length < 8) return null;
  let xmin = Infinity, ymin = Infinity, xmax = -Infinity, ymax = -Infinity;
  for (let i = 0; i < poly.length; i += 2) {
    const x = poly[i], y = poly[i + 1];
    if (x < xmin) xmin = x;
    if (x > xmax) xmax = x;
    if (y < ymin) ymin = y;
    if (y > ymax) ymax = y;
  }
  return [xmin, ymin, xmax, ymax];
}

/** Loose proximity check. */
function bboxNear(b1, b2, inflate = 12) {
  if (!b1 || !b2) return false;
  const [x1a, y1a, x2a, y2a] = [b1[0] - inflate, b1[1] - inflate, b1[2] + inflate, b1[3] + inflate];
  const [x1b, y1b, x2b, y2b] = b2;
  const xOverlap = Math.max(0, Math.min(x2a, x2b) - Math.max(x1a, x1b));
  const yOverlap = Math.max(0, Math.min(y2a, y2b) - Math.max(y1a, y1b));
  return xOverlap > 0 || yOverlap > 0;
}

/** Label selection marks by nearest line text. */
function labelSelectionMarks(pagesSurface) {
  const labeled = [];
  for (const page of pagesSurface) {
    for (const mark of page.selectionMarks) {
      const mbox = bboxFromPolygon(mark.polygon || []);
      let best = { score: Number.POSITIVE_INFINITY, text: '' };
      for (const w of page.words) {
        if (!w.bbox) continue;
        const dx = Math.max(0, Math.max(w.bbox[0] - mbox[2], mbox[0] - w.bbox[2]));
        const dy = Math.max(0, Math.max(w.bbox[1] - mbox[3], mbox[1] - w.bbox[3]));
        const dist = dx + dy;
        if (bboxNear(mbox, w.bbox, 6) || dist < best.score) {
          best = { score: dist, text: w.text };
        }
      }
      labeled.push({
        pageNumber: page.pageNumber,
        state: mark.state, // 'selected' or 'unselected'
        label: (best.text || '').toLowerCase(),
        rawContent: (mark.content || '').toLowerCase(),
        bbox: mbox
      });
    }
  }
  return labeled;
}

/** Apply checkbox heuristics to mappedData given labeled selection marks. */
function applyCheckboxHeuristics(mappedData, labeledMarks) {
  const hints = {
    financeContingency: ['loan contingency', 'loan', 'financing contingency', 'financing'],
    appraisalContingency: ['appraisal contingency', 'appraisal'],
    inspectionContingency: ['inspection contingency', 'investigation contingency', 'inspection'],
    sellerRentBack: ['seller in possession', 'seller in posession', 'sip', 'seller rent back', 'rent back']
  };

  const selectedLabels = new Set(
    labeledMarks.filter(m => m.state === 'selected').map(m => m.label).filter(Boolean)
  );

  const containsAny = (label, tokens) => tokens.some(t => label.includes(t));

  for (const [field, tokens] of Object.entries(hints)) {
    if (!mappedData[field]) {
      const hit = [...selectedLabels].some(lbl => containsAny(lbl, tokens));
      if (hit) mappedData[field] = 'Included';
    }
  }
  return mappedData;
}

/** Build a fields-like object from result.body.keyValuePairs if documents[0].fields is empty. */
function buildFieldsFromKvps(resultBody) {
  const kvps = Array.isArray(resultBody?.keyValuePairs) ? resultBody.keyValuePairs : [];
  const fields = {};
  for (const kv of kvps) {
    const keyText = kv.key?.content?.trim();
    if (!keyText) continue;
    const norm = normalizeKey(keyText);
    const valueText = kv.value?.content?.trim() ?? '';
    fields[norm] = {
      valueType: 'string',
      value: valueText,
      content: valueText,
    };
  }
  return fields;
}

exports.analyzeRPADocument = async (req, res) => {
  try {
    if (!ENDPOINT || !API_KEY) {
      return res.status(500).json({ error: 'Azure credentials not configured' });
    }
    const { documentId } = req.body;
    if (!documentId) return res.status(400).json({ error: 'documentId is required' });

    const doc = await Document.findById(documentId);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (doc.docType !== 'pdf') return res.status(400).json({ error: 'Only PDFs supported' });

    const sas = generateSASToken(doc.azureKey);
    const pdfUrl = `${doc.thumbnailUrl}?${sas}`; // your schema’s real PDF URL

    // Single pass: prebuilt-layout with keyValuePairs + ocrHighResolution
    const start = await client
      .path('/documentModels/{modelId}:analyze', 'prebuilt-layout')
      .post({
        contentType: 'application/json',
        body: { urlSource: pdfUrl },
        queryParameters: {
          stringIndexType: 'utf16CodeUnit',
          features: ['keyValuePairs', 'ocrHighResolution'],
          outputContentFormat: 'markdown'
        }
      });

    if (httpStatus(start) !== 202) {
      console.error('Analyze start failed', httpStatus(start), start.body?.error || start.body);
      return res.status(500).json({ error: 'Failed to start document analysis' });
    }

    const poller = getLongRunningPoller(client, start);
    const result = await poller.pollUntilDone();

    // Correct success check: look at body.status (not HTTP status)
    const jobState = (result?.body?.status || '').toLowerCase();
    if (jobState && jobState !== 'succeeded' && jobState !== 'partiallysucceeded') {
      console.error('Layout analysis did not succeed', {
        http: httpStatus(result),
        jobState,
        error: result?.body?.error
      });
      return res.status(500).json({ error: 'Document analysis did not complete successfully' });
    }

    // Fields may be under documents[0].fields when keyValuePairs is enabled…
    let rawFields = result?.body?.documents?.[0]?.fields || {};
    // …but if the service didn’t populate documents, synthesize from keyValuePairs.
    if (!rawFields || Object.keys(rawFields).length === 0) {
      rawFields = buildFieldsFromKvps(result.body);
    }

    // Flatten fields for UI debugging
    const simplifiedFields = {};
    for (const [key, field] of Object.entries(rawFields)) {
      if (!field) continue;
      const t = field.valueType;
      simplifiedFields[key] =
        t === 'string' ? field.value :
        t === 'number' ? String(field.value) :
        t === 'date' ? (field.value ? new Date(field.value).toISOString().split('T')[0] : field.content) :
        t === 'boolean' ? (field.value ? 'Yes' : 'No') :
        field.content ?? field.value ?? '';
    }

    // Checkboxes
    const pagesSurface = collectWordsByPage(result.body);
    const labeledMarks = labelSelectionMarks(pagesSurface);

    // Map to your UI shape + apply checkbox heuristics
    let mappedData = mapFieldsToOffer(rawFields);
    mappedData = applyCheckboxHeuristics(mappedData, labeledMarks);

    return res.json({
      success: true,
      mappedData,
      extracted: simplifiedFields,
      rawAzureResponse: { layout: result.body }
    });
  } catch (error) {
    const inner = error?.response?.data?.error?.innererror;
    if (inner) console.error('Azure innererror:', inner);
    console.error('Error analyzing RPA document:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      dataError: error.response?.data?.error
    });

    let message = 'Error analyzing RPA document';
    if (error.response?.status === 401) message = 'Azure Document Intelligence authentication failed';
    else if (error.response?.status === 429) message = 'Rate limit exceeded. Please try again later.';
    else if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') message = 'Connection timeout. Please try again.';
    else if (error.response?.data?.error?.message) message = error.response.data.error.message;

    return res.status(500).json({ message, error: error.message });
  }
};
