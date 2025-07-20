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
  // const showRegenerate =
  //   purchaseAgreementChoice === 'generate' &&
  //   documentWorkflow.purchaseAgreement.document &&
  //   documentWorkflow.purchaseAgreement.canRegenerate;

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
    <div className="ds-document-section">
      <div className="ds-section-header">
        <h3>1. Purchase Agreement</h3>
      </div>
      <div className="ds-radio-group">
        <label className={`ds-radio-option${purchaseAgreementChoice === 'upload' ? ' selected' : ''}`}>
          <input
            type="radio"
            name="purchaseAgreement"
            value="upload"
            checked={purchaseAgreementChoice === 'upload'}
            onChange={(e) => handlePurchaseAgreementChoiceChange(e.target.value)}
          />
          <div className="ds-option-content">
            <div className="ds-option-title">Upload your own purchase agreement</div>
            <div className="ds-option-subtitle">Use your existing purchase agreement document</div>
          </div>
        </label>
        {/* Commented out auto-generate option - functionality preserved for future use */}
        {/* <label className={`ds-radio-option${purchaseAgreementChoice === 'generate' ? ' selected' : ''}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <input
              type="radio"
              name="purchaseAgreement"
              value="generate"
              checked={purchaseAgreementChoice === 'generate'}
              onChange={(e) => handlePurchaseAgreementChoiceChange(e.target.value)}
            />
            <div className="ds-option-content">
              <div className="ds-option-title">Auto-generate purchase agreement</div>
              <div className="ds-option-subtitle">We'll create a purchase agreement using your offer information</div>
            </div>
          </div>
        </label> */}
        <label className={`ds-radio-option${purchaseAgreementChoice === 'skip' ? ' selected' : ''}`}>
          <input
            type="radio"
            name="purchaseAgreement"
            value="skip"
            checked={purchaseAgreementChoice === 'skip'}
            onChange={(e) => handlePurchaseAgreementChoiceChange(e.target.value)}
          />
          <div className="ds-option-content">
            <div className="ds-option-title">Skip for now (add later)</div>
            <div className="ds-option-subtitle">Handle the purchase agreement separately</div>
          </div>
        </label>
      </div>
      {purchaseAgreementChoice === 'upload' && (
        <div className="ds-section-content">
          {documentWorkflow.purchaseAgreement.document ? (
            <div className="ds-uploaded-document ds-purchase-agreement-uploaded">
              <div className="ds-document-info">
                <span className="ds-document-icon" role="img" aria-label="PDF">📄</span>
                <span className="ds-document-name main-blue">Purchase Agreement</span>
              </div>
              <div className="ds-button-group">
                <button
                  type="button"
                  onClick={handlePreview}
                  className="ds-preview-btn small"
                >
                  Preview
                </button>
                <button
                  type="button"
                  onClick={handleRemovePurchaseAgreement}
                  className="ds-remove-document-btn"
                  title="Remove document"
                >
                  ✕
                </button>
              </div>
            </div>
          ) : (
            <div className="ds-upload-area">
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => handlePurchaseAgreementUpload(e.target.files[0])}
                className="ds-file-input"
                id="purchase-agreement-upload"
                disabled={loading}
              />
              {loading ? (
                <div className="ds-button-spinner"></div>
              ) : (
                <label htmlFor="purchase-agreement-upload" className="ds-upload-label">
                  Choose file (PDF)
                </label>
              )}
            </div>
          )}
        </div>
      )}
      {/* Commented out generate section content - functionality preserved for future use */}
      {/* {purchaseAgreementChoice === 'generate' && (
        <div className="ds-section-content">
          {documentWorkflow.purchaseAgreement.document ? (
            <div className="ds-uploaded-document ds-purchase-agreement-generated">
              <div className="ds-document-info">
                <span className="ds-document-icon" role="img" aria-label="PDF">📄</span>
                <span className="ds-document-name main-blue">Purchase Agreement</span>
                <span className="ds-auto-generated-pill">Auto-Generated</span>
              </div>
              <div className="ds-button-group">
                <button
                  type="button"
                  onClick={handlePreview}
                  className="ds-preview-btn small"
                >
                  Preview
                </button>
                <button
                  type="button"
                  onClick={handleRemovePurchaseAgreement}
                  className="ds-remove-document-btn"
                  title="Remove document"
                >
                  ✕
                </button>
              </div>
            </div>
          ) : (
            <div className="ds-generation-area">
              <p className="ds-generation-info">
                We'll create a custom Purchase Agreement using your offer details, property information, and agent data.
              </p>
              <button
                type="button"
                onClick={handleGenerateAgreement}
                className="ds-generate-button"
                disabled={loading}
              >
                {loading ? 'Generating...' : 'Generate Purchase Agreement'}
              </button>
            </div>
          )}
        </div>
      )} */}
    </div>
  );
};

export default PurchaseAgreementSection; 