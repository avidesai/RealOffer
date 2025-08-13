// UploadRPA.js

import React, { useState, useCallback } from 'react';
import { useAuth } from '../../../../../../../../../../context/AuthContext';
import { useOffer } from '../../../../../../../../../../context/OfferContext';
import api from '../../../../../../../../../../context/api';
import './UploadRPA.css';

const UploadRPA = ({ handleNextStep, handlePrevStep, listingId }) => {
  const { token } = useAuth();
  const { updateOfferData, updateDocumentWorkflow } = useOffer();

  const [uploadedFile, setUploadedFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [extractedFields, setExtractedFields] = useState({});

  const handleFileUpload = useCallback(async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('File size must be less than 50MB');
      return;
    }

    setError('');
    setSuccess(false);
    setUploadedFile(file);
    setExtractedFields({});
  }, []);

  const handleAnalyzeRPA = useCallback(async () => {
    if (!uploadedFile) {
      setError('Please upload a file first');
      return;
    }

    setIsAnalyzing(true);
    setError('');
    setAnalysisProgress('Uploading document...');

    try {
      // 1) Upload the PDF to your backend
      const formData = new FormData();
      formData.append('documents', uploadedFile);
      formData.append('title', uploadedFile.name);
      formData.append('type', 'RPA Document');
      formData.append('propertyListingId', listingId);
      formData.append('purpose', 'rpa_analysis');

      const uploadResponse = await api.post(
        '/api/documents/propertyListing/' + listingId,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!uploadResponse.data || uploadResponse.data.length === 0) {
        throw new Error('Failed to upload document');
      }

      const documentId = uploadResponse.data[0]._id;

      // 2) Analyze pages 1 and 3–7 with Azure DI
      setAnalysisProgress('Analyzing document...');
      const analysisResponse = await api.post(
        '/api/documents/analyze-rpa?debug=1',
        { documentId, pages: '1,3-7' },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      // Debug bundle (optional auto-download)
      console.log('[RPA] full analysis response:', analysisResponse?.data);
      if (analysisResponse?.data?.debug) {
        const blob = new Blob([JSON.stringify(analysisResponse.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rpa-debug-${documentId}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }

      if (analysisResponse.data.success) {
        const mappedData = analysisResponse.data.mappedData || {};
        setExtractedFields(mappedData);

        // 3) Prefill the offer data with extracted fields
        updateOfferData(prev => ({ ...prev, ...mappedData }));

        // 4) Add the RPA into the document workflow so it shows in the Documents step
        updateDocumentWorkflow(prev => ({
          ...prev,
          purchaseAgreement: {
            ...(prev.purchaseAgreement || {}),
            document: { id: documentId, title: uploadedFile.name },
            sendForSigning: false
          },
          documents: [
            ...(prev.documents || []),
            { id: documentId, title: uploadedFile.name, sendForSigning: false }
          ]
        }));

        setSuccess(true);
        setAnalysisProgress('Analysis complete! Form pre-filled with extracted data.');

        // Auto-advance to next step after a short delay
        setTimeout(() => {
          handleNextStep();
        }, 2000);
      } else {
        throw new Error(analysisResponse.data.message || 'Analysis failed');
      }
    } catch (err) {
      console.error('Error analyzing RPA:', err);
      setError(err.response?.data?.message || err.message || 'Failed to analyze RPA document');
      setAnalysisProgress('');
    } finally {
      setIsAnalyzing(false);
    }
  }, [uploadedFile, listingId, token, updateOfferData, updateDocumentWorkflow, handleNextStep]);

  const handleSkip = useCallback(() => {
    handleNextStep();
  }, [handleNextStep]);

  const handleRemoveFile = useCallback(() => {
    setUploadedFile(null);
    setError('');
    setSuccess(false);
    setExtractedFields({});
    setAnalysisProgress('');
  }, []);

  return (
    <div className="modal-step">
      <div className="offer-modal-header">
        <h2>Upload Purchase Agreement</h2>
        <p>Upload your completed purchase agreement to autofill your offer.</p>
      </div>

      <div className="form-group">
        {!uploadedFile ? (
          <div className="rpa-upload-area" onClick={() => document.getElementById('rpa-file-input').click()}>
            <div className="rpa-upload-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10 9H9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3>Upload Purchase Agreement</h3>
            <p>Drag and drop files or click to browse</p>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="rpa-file-input"
              id="rpa-file-input"
            />
            <label htmlFor="rpa-file-input" className="rpa-upload-button" onClick={(e) => e.stopPropagation()}>
              Choose PDF File
            </label>
          </div>
        ) : (
          <div className="rpa-file-preview">
            <div className="rpa-file-info">
              <div className="rpa-file-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="rpa-file-details">
                <h4>{uploadedFile.name}</h4>
                <p>{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button
                onClick={handleRemoveFile}
                className="rpa-remove-file-btn"
                disabled={isAnalyzing}
                type="button"
              >
                ×
              </button>
            </div>

            {!isAnalyzing && !success && (
              <button
                onClick={handleAnalyzeRPA}
                className="rpa-analyze-button"
                disabled={!uploadedFile}
                type="button"
              >
                Analyze RPA Document
              </button>
            )}
          </div>
        )}
      </div>

      {isAnalyzing && (
        <div className="rpa-analysis-progress">
          <div className="rpa-progress-spinner"></div>
          <p>{analysisProgress}</p>
        </div>
      )}

      {success && (
        <div className="rpa-analysis-success">
          <div className="rpa-success-icon">✓</div>
          <h3>Analysis Complete!</h3>
          <p>The following fields have been pre-filled from your RPA:</p>
          <div className="rpa-extracted-fields">
            {Object.entries(extractedFields).map(([field, value]) => (
              <div key={field} className="rpa-extracted-field">
                <span className="rpa-field-name">{field}:</span>
                <span className="rpa-field-value">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}



      <div className="mom-button-container">
        <button
          onClick={handleSkip}
          className="mom-step-back-button"
          disabled={isAnalyzing}
          type="button"
        >
          Enter Offer Details Manually
        </button>

        {success && (
          <button
            onClick={handleNextStep}
            className="mom-next-button"
            type="button"
          >
            Continue to Purchase Price
          </button>
        )}
      </div>
    </div>
  );
};

export default UploadRPA;
