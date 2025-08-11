// controllers/RPAAnalysisController.js

const Document = require('../models/Document');
const { generateSASToken } = require('../config/azureStorage');

const createDocumentAnalysisClient = require('@azure-rest/ai-document-intelligence').default;
const { getLongRunningPoller } = require('@azure-rest/ai-document-intelligence');
const { AzureKeyCredential } = require('@azure/core-auth');

const ENDPOINT = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
const API_KEY = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;

// Initialize once
const client = createDocumentAnalysisClient(ENDPOINT, new AzureKeyCredential(API_KEY));

/**
 * Helper to safely pluck values from Azure field objects.
 */
function getField(fields, ...keys) {
  for (const k of keys) {
    const f = fields?.[k];
    if (!f) continue;
    if (f.value !== undefined && f.value !== null) return String(f.value).trim();
    if (f.content) return String(f.content).trim();
  }
  return '';
}

/**
 * Map Azure prebuilt-document fields to your MakeOfferModal data contract.
 * Adjust the keys here to match what you actually see in your RPA PDFs.
 */
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

  // Contingency day counts if present as plain KVPs
  out.financeContingencyDays =
    getField(fields, 'FinanceContingencyDays', 'LoanContingencyDays') || '';

  out.appraisalContingencyDays =
    getField(fields, 'AppraisalContingencyDays') || '';

  out.inspectionContingencyDays =
    getField(fields, 'InspectionContingencyDays', 'InvestigationContingencyDays') || '';

  // Free text terms
  out.specialTerms =
    getField(fields, 'AdditionalTerms', 'SpecialTerms', 'OtherTerms') || '';

  // Defaults your UI expects
  out.financeContingency = '';
  out.appraisalContingency = '';
  out.inspectionContingency = '';
  out.sellerRentBack = '';
  out.sellerRentBackDays = out.sellerRentBackDays || '';

  return out;
}

/**
 * From layout pages, build a simple surface of words with bounding boxes.
 */
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

/**
 * Compute axis-aligned bbox [xmin, ymin, xmax, ymax] from polygon [x1,y1, x2,y2, ...].
 */
function bboxFromPolygon(poly) {
  if (!poly || poly.length < 8) return null;
  let xmin = Number.POSITIVE_INFINITY;
  let ymin = Number.POSITIVE_INFINITY;
  let xmax = Number.NEGATIVE_INFINITY;
  let ymax = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < poly.length; i += 2) {
    const x = poly[i];
    const y = poly[i + 1];
    if (x < xmin) xmin = x;
    if (x > xmax) xmax = x;
    if (y < ymin) ymin = y;
    if (y > ymax) ymax = y;
  }
  return [xmin, ymin, xmax, ymax];
}

/**
 * Simple proximity check.
 */
function bboxNear(b1, b2, inflate = 12) {
  if (!b1 || !b2) return false;
  const [x1a, y1a, x2a, y2a] = [b1[0] - inflate, b1[1] - inflate, b1[2] + inflate, b1[3] + inflate];
  const [x1b, y1b, x2b, y2b] = b2;
  const xOverlap = Math.max(0, Math.min(x2a, x2b) - Math.max(x1a, x1b));
  const yOverlap = Math.max(0, Math.min(y2a, y2b) - Math.max(y1a, y1b));
  return xOverlap > 0 || yOverlap > 0;
}

/**
 * Try to label each selection mark by finding the nearest line text.
 */
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
        state: mark.state, // selected or unselected
        label: (best.text || '').toLowerCase(),
        rawContent: (mark.content || '').toLowerCase(),
        bbox: mbox
      });
    }
  }
  return labeled;
}

/**
 * Apply checkbox heuristics to mappedData given labeled selection marks.
 */
function applyCheckboxHeuristics(mappedData, labeledMarks) {
  const hints = {
    financeContingency: [
      'loan contingency',
      'loan',
      'financing contingency',
      'financing'
    ],
    appraisalContingency: [
      'appraisal contingency',
      'appraisal'
    ],
    inspectionContingency: [
      'inspection contingency',
      'investigation contingency',
      'inspection'
    ],
    sellerRentBack: [
      'seller in possession',
      'seller in posession',
      'sip',
      'seller rent back',
      'rent back'
    ]
  };

  const selectedLabels = new Set(
    labeledMarks
      .filter(m => m.state === 'selected')
      .map(m => m.label)
      .filter(Boolean)
  );

  function labelContainsAny(label, tokens) {
    const l = label.toLowerCase();
    return tokens.some(t => l.includes(t));
    }

  for (const [field, tokens] of Object.entries(hints)) {
    if (!mappedData[field]) {
      const hit = [...selectedLabels].some(lbl => labelContainsAny(lbl, tokens));
      if (hit) mappedData[field] = 'Included';
    }
  }

  return mappedData;
}

exports.analyzeRPADocument = async (req, res) => {
  try {
    if (!ENDPOINT || !API_KEY) {
      return res.status(500).json({ error: 'Azure credentials not configured' });
    }

    const { documentId } = req.body;
    if (!documentId) {
      return res.status(400).json({ error: 'documentId is required' });
    }

    const doc = await Document.findById(documentId);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (doc.docType !== 'pdf') return res.status(400).json({ error: 'Only PDFs supported' });

    // Build the actual PDF SAS URL
    const sas = generateSASToken(doc.azureKey);
    const pdfUrl = `${doc.thumbnailUrl}?${sas}`; // thumbnailUrl is your real blob URL

    // Pass 1: prebuilt-document to extract fields and content
    const startGeneral = await client
      .path('/documentModels/{modelId}:analyze', 'prebuilt-document')
      .post({
        contentType: 'application/json',
        body: { urlSource: pdfUrl },
        queryParameters: {
          stringIndexType: 'utf16CodeUnit'
        }
      });

    if (startGeneral.status !== 202) {
      console.error('Analyze start failed', startGeneral.status, startGeneral.body?.error || startGeneral.body);
      return res.status(500).json({ error: 'Failed to start document analysis' });
    }

    const pollerGeneral = getLongRunningPoller(client, startGeneral);
    const general = await pollerGeneral.pollUntilDone();

    if (general.status !== 'succeeded') {
      console.error('General analysis did not succeed', general);
      return res.status(500).json({ error: 'Document analysis did not complete successfully' });
    }

    const generalBody = general.body || {};
    const doc0 = generalBody.documents?.[0] || {};
    const rawFields = doc0.fields || {};

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

    // Pass 2: prebuilt-layout to capture selectionMarks for checkboxes
    const startLayout = await client
      .path('/documentModels/{modelId}:analyze', 'prebuilt-layout')
      .post({
        contentType: 'application/json',
        body: { urlSource: pdfUrl },
        queryParameters: {
          stringIndexType: 'utf16CodeUnit',
          features: ['ocrHighResolution'],
          outputContentFormat: 'markdown'
        }
      });

    if (startLayout.status !== 202) {
      console.error('Layout analyze start failed', startLayout.status, startLayout.body?.error || startLayout.body);
      return res.status(500).json({ error: 'Failed to start layout analysis' });
    }

    const pollerLayout = getLongRunningPoller(client, startLayout);
    const layout = await pollerLayout.pollUntilDone();

    const pagesSurface = collectWordsByPage(layout.body);
    const labeledMarks = labelSelectionMarks(pagesSurface);

    // Build mapped data object
    let mappedData = mapFieldsToOffer(rawFields);
    mappedData = applyCheckboxHeuristics(mappedData, labeledMarks);

    // Final response
    return res.json({
      success: true,
      mappedData,
      extracted: simplifiedFields,
      rawAzureResponse: {
        general: general.body,
        layout: layout.body
      }
    });
  } catch (error) {
    console.error('Error analyzing RPA document:', error);

    let message = 'Error analyzing RPA document';
    if (error.response?.status === 401) {
      message = 'Azure Document Intelligence authentication failed';
    } else if (error.response?.status === 429) {
      message = 'Rate limit exceeded. Please try again later.';
    } else if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      message = 'Connection timeout. Please try again.';
    } else if (error.response?.data?.error?.message) {
      message = error.response.data.error.message;
    }

    const inner = error.response?.data?.error?.innererror;
    if (inner) console.error('Azure innererror:', inner);

    res.status(500).json({
      message,
      error: error.message
    });
  }
};
