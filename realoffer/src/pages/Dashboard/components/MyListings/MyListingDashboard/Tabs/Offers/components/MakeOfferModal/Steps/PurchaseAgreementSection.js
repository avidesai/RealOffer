import React from 'react';
import api from '../../../../../../../../../../context/api';

const PurchaseAgreementSection = ({
  purchaseAgreementChoice,
  documentWorkflow,
  handlePurchaseAgreementChoiceChange,
  handlePurchaseAgreementUpload,
  handleRemovePurchaseAgreement,
  handleGenerateAgreement,
  loading
}) => {
  const showRegenerate =
    purchaseAgreementChoice === 'generate' &&
    documentWorkflow.purchaseAgreement.document &&
    documentWorkflow.purchaseAgreement.canRegenerate;

  // Helper to preview the document in a new tab
  const handlePreview = async () => {
    const doc = documentWorkflow.purchaseAgreement.document;
    if (doc && doc.id) {
      try {
        const response = await api.get(`/api/documents/${doc.id}/download`, { responseType: 'blob' });
        const blob = response.data;
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        // Revoke URL after 1 minute
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      } catch (error) {
        console.error('Error previewing document:', error);
        alert('Failed to load document preview. Please try again.');
      }
    }
  };

  return (
    <div className="document-section">
      <div className="section-header">
        <h3>1. Purchase Agreement</h3>
      </div>
      <div className="radio-group">
        <label className={`radio-option${purchaseAgreementChoice === 'upload' ? ' selected' : ''}`}>
          <input
            type="radio"
            name="purchaseAgreement"
            value="upload"
            checked={purchaseAgreementChoice === 'upload'}
            onChange={(e) => handlePurchaseAgreementChoiceChange(e.target.value)}
          />
          <div className="option-content">
            <div className="option-title">Upload your own purchase agreement</div>
            <div className="option-subtitle">Use your existing purchase agreement document</div>
          </div>
        </label>
        <label className={`radio-option${purchaseAgreementChoice === 'generate' ? ' selected' : ''}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <input
              type="radio"
              name="purchaseAgreement"
              value="generate"
              checked={purchaseAgreementChoice === 'generate'}
              onChange={(e) => handlePurchaseAgreementChoiceChange(e.target.value)}
            />
            <div className="option-content">
              <div className="option-title">Auto-generate purchase agreement</div>
              <div className="option-subtitle">We'll create a purchase agreement using your offer information</div>
            </div>
          </div>
          {showRegenerate && (
            <button
              type="button"
              onClick={handleGenerateAgreement}
              className="regenerate-btn"
              disabled={loading}
              style={{ marginLeft: 'auto', minWidth: 120 }}
            >
              {loading ? 'Regenerating...' : 'Regenerate'}
            </button>
          )}
        </label>
        <label className={`radio-option${purchaseAgreementChoice === 'skip' ? ' selected' : ''}`}>
          <input
            type="radio"
            name="purchaseAgreement"
            value="skip"
            checked={purchaseAgreementChoice === 'skip'}
            onChange={(e) => handlePurchaseAgreementChoiceChange(e.target.value)}
          />
          <div className="option-content">
            <div className="option-title">Skip for now (add later)</div>
            <div className="option-subtitle">Handle the purchase agreement separately</div>
          </div>
        </label>
      </div>
      {purchaseAgreementChoice === 'upload' && (
        <div className="section-content">
          {documentWorkflow.purchaseAgreement.document ? (
            <div className="uploaded-document purchase-agreement-uploaded">
              <div className="document-info">
                <span className="document-icon" role="img" aria-label="PDF">📄</span>
                <span className="document-name main-blue">Purchase Agreement</span>
              </div>
              <div className="button-group">
                <button
                  type="button"
                  onClick={handlePreview}
                  className="preview-btn small"
                >
                  Preview
                </button>
                <button
                  type="button"
                  onClick={handleRemovePurchaseAgreement}
                  className="remove-document-btn"
                  title="Remove document"
                >
                  ✕
                </button>
              </div>
            </div>
          ) : (
            <div className="upload-area">
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => handlePurchaseAgreementUpload(e.target.files[0])}
                className="file-input"
                id="purchase-agreement-upload"
              />
              <label htmlFor="purchase-agreement-upload" className="upload-label">
                Choose PDF file
              </label>
            </div>
          )}
        </div>
      )}
      {purchaseAgreementChoice === 'generate' && (
        <div className="section-content">
          {documentWorkflow.purchaseAgreement.document ? (
            <div className="uploaded-document purchase-agreement-generated">
              <div className="document-info">
                <span className="document-icon" role="img" aria-label="PDF">📄</span>
                <span className="document-name main-blue">Purchase Agreement</span>
                <span className="auto-generated-pill">Auto-Generated</span>
              </div>
              <div className="button-group">
                <button
                  type="button"
                  onClick={handlePreview}
                  className="preview-btn small"
                >
                  Preview
                </button>
                <button
                  type="button"
                  onClick={handleRemovePurchaseAgreement}
                  className="remove-document-btn"
                  title="Remove document"
                >
                  ✕
                </button>
              </div>
            </div>
          ) : (
            <div className="generation-area">
              <p className="generation-info">
                We'll create a custom Purchase Agreement using your offer details, property information, and agent data.
              </p>
              <button
                type="button"
                onClick={handleGenerateAgreement}
                className="generate-button"
                disabled={loading}
              >
                {loading ? 'Generating...' : 'Generate Purchase Agreement'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PurchaseAgreementSection; 