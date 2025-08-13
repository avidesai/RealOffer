// controllers/RPAAnalysisController.js

const Document = require('../models/Document');
const { generateSASToken } = require('../config/azureStorage');

const DocumentIntelligence = require('@azure-rest/ai-document-intelligence').default;
const { getLongRunningPoller, isUnexpected } = require('@azure-rest/ai-document-intelligence');

const ENDPOINT = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
const API_KEY = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;

const client = DocumentIntelligence(ENDPOINT, { key: API_KEY });

/** Normalize SDK response status that can be "202" or 202. */
function httpStatus(resp) {
  const n = Number(resp?.status);
  return Number.isNaN(n) ? -1 : n;
}

/** === Mapping config: tweak these labels/regex to your flavor of the CAR RPA === */
const FIELD_CONFIG = {
  purchasePrice: {
    labels: [/purchase\s*price/i, /offer\s*price/i, /\bprice\b/i, /\bamount\b/i],
    want: 'currency',
    regexMarkdown: [
      /purchase\s*price[^$\d]{0,20}(\$?\s*[\d,]+(?:\.\d{2})?)/i,
      /offer\s*price[^$\d]{0,20}(\$?\s*[\d,]+(?:\.\d{2})?)/i
    ]
  },
  initialDeposit: {
    labels: [/initial\s*deposit/i, /earnest\s*(money)?\s*deposit/i, /\bEMD\b/i, /\bdeposit\b/i],
    want: 'currency',
    regexMarkdown: [
      /initial\s*deposit[^$\d]{0,20}(\$?\s*[\d,]+(?:\.\d{2})?)/i,
      /earnest.*deposit[^$\d]{0,20}(\$?\s*[\d,]+(?:\.\d{2})?)/i
    ]
  },
  closeOfEscrow: {
    labels: [/close\s*of\s*escrow/i, /\bCOE\b/i, /close\s*date/i, /escrow\s*close/i],
    want: 'date',
    regexMarkdown: [
      /close\s*of\s*escrow[^A-Za-z0-9]{0,20}([A-Za-z]{3,9}\s+\d{1,2},\s*\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
      /close\s*date[^A-Za-z0-9]{0,20}([A-Za-z]{3,9}\s+\d{1,2},\s*\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i
    ]
  },
  buyerName: {
    labels: [/buyer(?:'s)?\s*name/i, /\bbuyer\b/i, /buyer\s*1\s*name/i],
    want: 'string'
  },
  financeContingencyDays: {
    labels: [/loan\s*contingency/i, /financing\s*contingency/i, /\bloan\b/i, /\bfinancing\b/i],
    want: 'int',
    regexMarkdown: [
      /(loan|financing)\s*contingency[^0-9]{0,30}(\d{1,3})\s*day/i
    ]
  },
  appraisalContingencyDays: {
    labels: [/appraisal\s*contingency/i, /\bappraisal\b/i],
    want: 'int',
    regexMarkdown: [
      /appraisal\s*contingency[^0-9]{0,30}(\d{1,3})\s*day/i
    ]
  },
  inspectionContingencyDays: {
    labels: [/inspection\s*contingency/i, /investigation\s*contingency/i, /\binspection\b/i],
    want: 'int',
    regexMarkdown: [
      /(inspection|investigation)\s*contingency[^0-9]{0,30}(\d{1,3})\s*day/i
    ]
  },
  specialTerms: {
    labels: [/additional\s*terms/i, /special\s*terms/i, /other\s*terms/i, /addenda?/i],
    want: 'string'
  },
  offerExpiryDate: {
    labels: [/expiration\s*of\s*offer/i, /\boffer\s*expires/i],
    want: 'date',
    regexMarkdown: [
      /expiration\s*of\s*offer[\s\S]{0,160}?\bor\b[^A-Za-z0-9]{0,8}([A-Za-z]{3,9}\s+\d{1,2},\s*\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i
    ]
  },
  buyersAgentCommission: {
    labels: [/buyer[’']?s?\s+agent\s+commission/i, /buyer[’']?s?\s+broker/i, /compensate\s+buyer[’']?s?\s+broker/i],
    want: 'string'
  }
};

/** Utility: treat :selected: / :unselected: / blank as empty */
function isSentinel(v) {
  const s = String(v || '').trim().toLowerCase();
  return !s || s === ':selected:' || s === ':unselected:';
}

/** Turn free-text keys into stable field IDs (e.g., "Purchase Price" -> "PurchasePrice"). */
function normalizeKey(key) {
  return String(key || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+([a-z])/g, (_, c) => c.toUpperCase())
    .replace(/^[a-z]/, c => c.toUpperCase());
}

/** Build per-page surface for proximity labeling. */
function collectWordsByPage(analyzeResult) {
  const pages = analyzeResult?.pages || [];
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

/** Build a fields-like object from analyzeResult.keyValuePairs if documents[0].fields is empty. */
function buildFieldsFromKvps(analyzeResult) {
  const kvps = Array.isArray(analyzeResult?.keyValuePairs) ? analyzeResult.keyValuePairs : [];
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
      confidence: kv.confidence
    };
  }
  return fields;
}

/** Build a debug list of KVPs with pages and confidences. */
function makeKvpList(analyzeResult) {
  const kvps = Array.isArray(analyzeResult?.keyValuePairs) ? analyzeResult.keyValuePairs : [];
  return kvps.map(kv => ({
    key: kv.key?.content || '',
    value: kv.value?.content || '',
    keyPage: kv.key?.elements?.[0]?.pageNumber ?? kv.pageNumber ?? null,
    valuePage: kv.value?.elements?.[0]?.pageNumber ?? kv.pageNumber ?? null,
    confidence: kv.confidence ?? null
  }));
}

/** Utilities to coerce values */
function parseCurrency(s) {
  if (!s) return '';
  const m = String(s).match(/-?\$?\s*([\d,]+(?:\.\d{1,2})?)/);
  return m ? m[1].replace(/,/g, '') : '';
}
function parseIntLike(s) {
  if (!s) return '';
  const m = String(s).match(/-?\d{1,4}/);
  return m ? String(parseInt(m[0], 10)) : '';
}
function parseDateLike(s) {
  if (!s) return '';
  // try ISO-ish first, else mm/dd/yy or "Jan 1, 2025"
  const t = Date.parse(s);
  if (!Number.isNaN(t)) {
    const d = new Date(t);
    return d.toISOString().split('T')[0];
  }
  const m = String(s).match(/(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|[A-Za-z]{3,9}\s+\d{1,2},\s*\d{2,4})/);
  if (m) {
    const t2 = Date.parse(m[1]);
    if (!Number.isNaN(t2)) return new Date(t2).toISOString().split('T')[0];
  }
  return s;
}

/** Score a label match against a candidate key string. */
function labelScore(candidate, labelRegexes) {
  const text = String(candidate || '');
  let score = 0;
  for (const re of labelRegexes) {
    if (re.test(text)) score += 1;
  }
  return score;
}

/** Try to fill one target using fields -> kvps -> markdown in that order. */
function pickForTarget(target, cfg, fields, kvpList, markdown) {
  let best = { value: '', source: '', score: -1, raw: null };

  // 1) from pre-normalized fields (documents[0].fields or kvp-synthesized)
  for (const [k, v] of Object.entries(fields || {})) {
    const labelCandidate = k.replace(/([a-z])([A-Z])/g, '$1 $2');
    const s = labelScore(labelCandidate, cfg.labels);
    if (s <= 0) continue; // require a positive label hit
    const val = v?.value ?? v?.content ?? '';
    if (isSentinel(val)) continue; // skip :selected:/unselected:
    if (s > best.score) {
      best = { value: val, source: `fields:${k}`, score: s, raw: v };
    }
  }

  // 2) fall back to kvp list keys
  if (isSentinel(best.value)) best.value = '';
  if (!best.value) {
    for (const kv of kvpList) {
      const s = labelScore(kv.key, cfg.labels);
      if (s <= 0) continue;
      if (isSentinel(kv.value)) continue;
      if (s > best.score && kv.value) {
        best = { value: kv.value, source: `kvp:${kv.key}`, score: s, raw: kv };
      }
    }
  }

  // 3) markdown regexes
  if ((!best.value || best.score <= 0) && Array.isArray(cfg.regexMarkdown)) {
    for (const re of cfg.regexMarkdown) {
      const m = markdown && markdown.match(re);
      if (m && m[1]) {
        best = { value: m[1], source: `markdown:${re}`, score: 1, raw: m[0] };
        break;
      }
    }
  }

  // Coerce to desired shape
  let finalVal = best.value || '';
  if (cfg.want === 'currency') finalVal = parseCurrency(finalVal);
  else if (cfg.want === 'int') finalVal = parseIntLike(finalVal);
  else if (cfg.want === 'date') finalVal = parseDateLike(finalVal);

  return { value: finalVal, source: best.source, raw: best.raw, score: best.score };
}

/** --- Helpers that make KVPs first-class for checkboxes/choices --- */
function kvpSelected(kvps, keyRegex) {
  return kvps.some(
    (kv) =>
      keyRegex.test(kv.key || '') &&
      String(kv.value || '').trim().toLowerCase() === ':selected:'
  );
}
function kvpKeyPick(kvps, keyRegex) {
  const hit = kvps.find((kv) => {
    const v = String(kv.value || '').trim();
    return (
      keyRegex.test(kv.key || '') &&
      v &&
      v.toLowerCase() !== ':selected:' &&
      v.toLowerCase() !== ':unselected:'
    );
  });
  return hit ? String(hit.value).trim() : '';
}

/** Parse Buyer's Broker commission from pages+markdown (curly quotes, multi-line). */
function extractCommission(analyzeResult, markdown) {
  // 1) Try markdown broad patterns
  const patterns = [
    /Seller\s+agrees\s+to\s+pay\s+Buyer[’']?s\s+Broker[^%]{0,300}?(\d{1,2}(?:\.\d{1,3})?)\s*%/i,
    /Seller\s+Payment[^%]{0,300}Buyer[’']?s\s+Broker[^%]{0,300}?(\d{1,2}(?:\.\d{1,3})?)\s*%/i,
    /Buyer[’']?s\s+Broker[\s\S]{0,150}?(\d{1,2}(?:\.\d{1,3})?)\s*%/i
  ];
  for (const re of patterns) {
    const m = markdown && markdown.match(re);
    if (m) return m[1];
  }

  // 2) Walk page lines and look at windows of up to 3 lines
  const pages = Array.isArray(analyzeResult?.pages) ? analyzeResult.pages : [];
  for (const p of pages) {
    const lines = Array.isArray(p.lines) ? p.lines.map(l => (l.content || '').trim()).filter(Boolean) : [];
    for (let i = 0; i < lines.length; i++) {
      const window = lines.slice(i, i + 3).join(' ');
      const m = window.match(/Buyer[’']?s\s+Broker[^%]{0,300}?(\d{1,2}(?:\.\d{1,3})?)\s*%/i);
      if (m) return m[1];
    }
  }
  return '';
}

/** Apply checkbox heuristics to mappedData given labeled selection marks (fallback only). */
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

/** Build a datetime-local string (YYYY-MM-DDTHH:mm) safely */
function toLocalDateTime(dateIso, hh = 17, mm = 0) {
  // do not apply timezone; just return local-style string
  if (!dateIso || !/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${dateIso}T${pad(hh)}:${pad(mm)}`;
}

exports.analyzeRPADocument = async (req, res) => {
  try {
    const wantDebug =
      req.query.debug === '1' ||
      req.body?.debug === true ||
      req.get('x-debug') === '1' ||
      process.env.DEBUG_RPA === '1';

    if (!ENDPOINT || !API_KEY) {
      return res.status(500).json({ error: 'Azure credentials not configured' });
    }
    const { documentId } = req.body;
    if (!documentId) return res.status(400).json({ error: 'documentId is required' });

    const doc = await Document.findById(documentId);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (doc.docType !== 'pdf') return res.status(400).json({ error: 'Only PDFs supported' });

    const sas = generateSASToken(doc.azureKey);
    const pdfUrl = `${doc.thumbnailUrl}?${sas}`; // original PDF in your setup

    // Include the core pages (drop p7)
    const pages = req.body?.pages || '1-6';
    const start = await client
      .path('/documentModels/{modelId}:analyze', 'prebuilt-layout')
      .post({
        contentType: 'application/json',
        body: { urlSource: pdfUrl },
        queryParameters: {
          stringIndexType: 'utf16CodeUnit',
          pages,
          features: ['keyValuePairs', 'queryFields', 'ocrHighResolution'],
          // v4 requires tokens matching ^[\p{L}\p{M}\p{N}_]{1,64}$
          queryFields: [
            'PurchasePrice',
            'InitialDeposit',
            'CloseOfEscrow',
            'LoanAmount',
            'PercentDown',
            'DownPayment',
            'FinanceContingencyDays',
            'AppraisalContingencyDays',
            'InspectionContingencyDays',
            'AppraisalContingency',
            'NoAppraisalContingency',
            'LoanContingency',
            'NoLoanContingency',
            'SellerRentBack',
            'SellerRentBackDays',
            'OfferExpiryDate',
            'BuyerName',
            'BuyersAgentCommission',
            'SpecialTerms'
          ],
          outputContentFormat: 'markdown'
        }
      });

    if (isUnexpected(start)) {
      console.error('Analyze start failed', httpStatus(start), start.body?.error || start.body);
      return res.status(500).json({ error: 'Failed to start document analysis' });
    }

    const poller = getLongRunningPoller(client, start);
    const result = await poller.pollUntilDone();

    const body = result?.body || {};
    const ar = body?.analyzeResult || {};
    const jobState = (body?.status || '').toLowerCase();
    if (jobState && jobState !== 'succeeded' && jobState !== 'partiallysucceeded') {
      console.error('Layout analysis did not succeed', {
        http: httpStatus(result),
        jobState,
        error: body?.error
      });
      return res.status(500).json({ error: 'Document analysis did not complete successfully' });
    }

    // Raw pieces from Azure analyzeResult
    const markdown = typeof ar.content === 'string' ? ar.content : '';
    let rawFields = ar?.documents?.[0]?.fields || {};
    if (!rawFields || Object.keys(rawFields).length === 0) {
      rawFields = buildFieldsFromKvps(ar);
    }
    const kvpList = makeKvpList(ar);

    // Flatten fields for UI/debug
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

    // Selection marks (fallback surface)
    const pagesSurface = collectWordsByPage(ar);
    const labeledMarks = labelSelectionMarks(pagesSurface);

    // Config-driven mapping
    const mappedData = {};
    const candidateLog = {};
    for (const [target, cfg] of Object.entries(FIELD_CONFIG)) {
      const pick = pickForTarget(target, cfg, rawFields, kvpList, markdown);
      mappedData[target] = pick.value || '';
      candidateLog[target] = { source: pick.source || '', score: pick.score, raw: pick.raw };
    }

    // --- Domain-specific fixes/overrides ---

    // Buyer Name: prefer the KVP under "Date Prepared: THIS IS AN OFFER FROM"
    if (!mappedData.buyerName || isSentinel(mappedData.buyerName)) {
      const offerFrom = kvpKeyPick(kvpList, /THIS\s+IS\s+AN\s+OFFER\s+FROM/i);
      if (offerFrom) {
        const parts = offerFrom.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
        // If first line is a date, second is likely the name
        let candidate = parts[0] || '';
        if (/^\w+\s+\d{1,2},\s*\d{4}$/.test(candidate) && parts[1]) candidate = parts[1];
        // Strip trailing buyer label if present
        candidate = candidate.replace(/\(“?Buyer”?\)\.?$/i, '').trim();
        if (candidate) mappedData.buyerName = candidate;
      } else {
        // Markdown fallback
        const m = markdown && markdown.match(/THIS\s+IS\s+AN\s+OFFER\s+FROM\s+([^\n\r]+)/i);
        if (m && m[1]) mappedData.buyerName = m[1].replace(/\(“?Buyer”?\)\.?$/i, '').trim();
      }
    }

    // Finance Type: prefer KVP checkbox "All Cash"
    if (!mappedData.financeType) {
      if (kvpSelected(kvpList, /^All\s*Cash$/i)) {
        mappedData.financeType = 'CASH';
      } else {
        mappedData.financeType = 'LOAN';
      }
    }
    // If CASH, normalize dependent amounts
    if (mappedData.financeType === 'CASH') {
      mappedData.loanAmount = '0';
      mappedData.percentDown = '100';
      if (mappedData.purchasePrice && (!mappedData.downPayment || Number(mappedData.downPayment) === 0)) {
        mappedData.downPayment = mappedData.purchasePrice;
      }
    }

    // Close of Escrow:
    // 1) If we have a concrete date, keep it as YYYY-MM-DD
    // 2) If we only have "N Days after Acceptance", set the field to just the number "N"
    // a) Direct KVP checkbox for "N Days after Acceptance"
    const daysKvp = kvpList.find(
      (kv) =>
        /(\d{1,3})\s*Days\s*after\s*Acceptance/i.test(kv.key || '') &&
        String(kv.value || '').trim().toLowerCase() === ':selected:'
    );
    if (daysKvp) {
      const m = (daysKvp.key || '').match(/(\d{1,3})\s*Days\s*after\s*Acceptance/i);
      if (m) mappedData.closeOfEscrow = m[1]; // number only
    } else if (mappedData.closeOfEscrow && /(\d{1,3})\s*Days\s*after\s*Acceptance/i.test(mappedData.closeOfEscrow)) {
      mappedData.closeOfEscrow = mappedData.closeOfEscrow.match(/(\d{1,3})/)[1];
    }

    // Offer Expiration Date/Time:
    // - Date: prefer KVP key "or Month DD, YYYY" (already handled in mapping).
    // - Time: default 5:00 PM unless a specific time + AM/PM is filled and selected.
    let expiryDate = mappedData.offerExpiryDate && /^\d{4}-\d{2}-\d{2}$/.test(mappedData.offerExpiryDate)
      ? mappedData.offerExpiryDate
      : '';
    if (!expiryDate) {
      const dFromKey = kvpList.find((kv) => /or\s+[A-Za-z]{3,9}\s+\d{1,2},\s*\d{4}/i.test(kv.key || ''));
      if (dFromKey) {
        const m = (dFromKey.key || '').match(
          /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s*\d{4}/i
        );
        if (m) expiryDate = parseDateLike(m[0]);
      }
    }

    // Try to detect explicit time filled (pattern near the date line: "... at 5PM or ____ AM/ PM")
    let expiryHH = 17;
    let expiryMM = 0;
    let explicitTime = null;

    if (expiryDate && markdown) {
      const datePretty = new Date(expiryDate + 'T00:00:00').toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      // e.g., "... or July 28, 2025 ... at 5PM or 11 AM/ PM"
      const timeRe = new RegExp(
        `or\\s+${datePretty.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}[\\s\\S]{0,120}?at\\s*5\\s*PM\\s*or\\s*([0-1]?\\d)(?::([0-5]\\d))?\\s*(AM|PM)`,
        'i'
      );
      const mTime = markdown.match(timeRe);
      if (mTime) {
        explicitTime = { hh: parseInt(mTime[1], 10), mm: mTime[2] ? parseInt(mTime[2], 10) : 0, ampm: mTime[3].toUpperCase() };
      }
    }

    // If the AM/PM boxes show a selection, honor it (even if minutes missing)
    const amSelected = kvpSelected(kvpList, /^AM\/?$/i) || kvpSelected(kvpList, /\bAM\b/i);
    const pmSelected = kvpSelected(kvpList, /^PM$/i) || kvpSelected(kvpList, /\bPM\b/i);

    if (explicitTime) {
      let { hh, mm, ampm } = explicitTime;
      if (ampm === 'PM' && hh < 12) hh += 12;
      if (ampm === 'AM' && hh === 12) hh = 0;
      expiryHH = hh;
      expiryMM = mm;
    } else if (amSelected || pmSelected) {
      // If a manual hour was typed (rare to surface in KVP), try a looser markdown catch not tied to the date string
      const loose = markdown && markdown.match(/at\s*5\s*PM\s*or\s*([0-1]?\d)(?::([0-5]\d))?\s*(AM|PM)/i);
      if (loose) {
        let hh = parseInt(loose[1], 10);
        let mm = loose[2] ? parseInt(loose[2], 10) : 0;
        const ampm = loose[3].toUpperCase();
        if (ampm === 'PM' && hh < 12) hh += 12;
        if (ampm === 'AM' && hh === 12) hh = 0;
        expiryHH = hh; expiryMM = mm;
      } else {
        // If they checked AM/PM but left time blank, still default to 5pm per requirement
        expiryHH = 17; expiryMM = 0;
      }
    } else {
      // No explicit time — default to 5:00 PM local input
      expiryHH = 17; expiryMM = 0;
    }

    if (expiryDate) {
      mappedData.offerExpiryDate = toLocalDateTime(expiryDate, expiryHH, expiryMM);
    }

    // Buyer's Agent Commission (%) robust parsing
    if (!mappedData.buyersAgentCommission || isSentinel(mappedData.buyersAgentCommission)) {
      const pct = extractCommission(ar, markdown);
      if (pct) mappedData.buyersAgentCommission = pct;
    }

    // Special Terms: do not auto-fill at all
    mappedData.specialTerms = '';

    // Defaults expected by UI plus checkbox heuristics (fallback last)
    mappedData.financeContingency = mappedData.financeContingency || '';
    mappedData.appraisalContingency = mappedData.appraisalContingency || '';
    mappedData.inspectionContingency = mappedData.inspectionContingency || '';
    mappedData.sellerRentBack = mappedData.sellerRentBack || '';
    mappedData.sellerRentBackDays = mappedData.sellerRentBackDays || '';
    applyCheckboxHeuristics(mappedData, labeledMarks);

    // Auto-waive when day-counts are empty (as requested)
    if (!mappedData.financeContingencyDays) mappedData.financeContingency = 'Waived';
    if (!mappedData.appraisalContingencyDays) mappedData.appraisalContingency = 'Waived';
    if (!mappedData.inspectionContingencyDays) mappedData.inspectionContingency = 'Waived';
    if (!mappedData.sellerRentBackDays) mappedData.sellerRentBack = 'Waived';

    // Clean any lingering sentinel tokens that may have slipped in
    for (const k of Object.keys(mappedData)) {
      if (isSentinel(mappedData[k])) mappedData[k] = '';
    }

    if (wantDebug) {
      console.log('[RPA DEBUG][SERVER] mappedData:', mappedData);
      console.log('[RPA DEBUG][SERVER] candidates:', JSON.stringify(candidateLog, null, 2));
      console.log('[RPA DEBUG][SERVER] kvps (first 40):', kvpList.slice(0, 40));
      console.log('[RPA DEBUG][SERVER] selectionMarks (first 40):', labeledMarks.slice(0, 40));
      console.log('[RPA DEBUG][SERVER] markdownSample length:', (typeof markdown === 'string' ? markdown.length : 0));
    }

    const debug = wantDebug
      ? {
          normalizedFields: simplifiedFields,
          kvps: kvpList,
          selectionMarks: labeledMarks,
          markdownSample: markdown.slice(0, 6000),
          candidates: candidateLog
        }
      : undefined;

    return res.json({
      success: true,
      mappedData,
      extracted: simplifiedFields,
      debug
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
