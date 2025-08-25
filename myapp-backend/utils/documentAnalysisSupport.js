// myapp-backend/utils/documentAnalysisSupport.js

'use strict';

// Centralized list of supported document types for AI analysis
const SUPPORTED_TYPES = [
  'Home Inspection Report',
  'Roof Inspection Report',
  'Pest Inspection Report',
  'Seller Property Questionnaire',
  'Real Estate Transfer Disclosure Statement',
  'Agent Visual Inspection',
  'Sewer Lateral Inspection'
];

function isSupportedForAnalysis(documentType) {
  return SUPPORTED_TYPES.includes(documentType);
}

function getAnalysisTypeForDocType(documentType) {
  switch (documentType) {
    case 'Home Inspection Report':
      return 'home_inspection';
    case 'Roof Inspection Report':
      return 'roof_inspection';
    case 'Pest Inspection Report':
      return 'pest_inspection';
    case 'Seller Property Questionnaire':
      return 'seller_property_questionnaire';
    case 'Real Estate Transfer Disclosure Statement':
      return 'transfer_disclosure_statement';
    case 'Agent Visual Inspection':
      return 'agent_visual_inspection_disclosure';
    case 'Sewer Lateral Inspection':
      return 'sewer_lateral_inspection';
    default:
      return null;
  }
}

module.exports = {
  isSupportedForAnalysis,
  getAnalysisTypeForDocType,
  SUPPORTED_TYPES
};


