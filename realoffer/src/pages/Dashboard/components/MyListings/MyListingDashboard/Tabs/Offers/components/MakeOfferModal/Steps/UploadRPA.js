// UploadRPA.js

import React, { useState, useCallback } from 'react';
import { useAuth } from '../../../../../../../../../../context/AuthContext';
import { useOffer } from '../../../../../../../../../../context/OfferContext';
import api from '../../../../../../../../../../context/api';
import './UploadRPA.css';

const UploadRPA = ({ handleNextStep, handlePrevStep, listingId }) => {
  const { token } = useAuth();
  const { updateOfferData } = useOffer();
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [extractedFields, setExtractedFields] = useState({});

  const handleFileUpload = useCallback(async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file');
      return;
    }

    // Validate file size (max 50MB)
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
      // First, upload the document to get a document ID
      const formData = new FormData();
      formData.append('documents', uploadedFile);
      formData.append('title', uploadedFile.name);
      formData.append('type', 'RPA Document');
      formData.append('propertyListingId', listingId);
      formData.append('purpose', 'rpa_analysis');

      const uploadResponse = await api.post('/api/documents/propertyListing/' + listingId, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!uploadResponse.data || uploadResponse.data.length === 0) {
        throw new Error('Failed to upload document');
      }

      const documentId = uploadResponse.data[0]._id;
      setAnalysisProgress('Analyzing RPA document with AI...');

      // Now analyze the RPA document
      const analysisResponse = await api.post('/api/documents/analyze-rpa', {
        documentId: documentId
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (analysisResponse.data.success) {
        const mappedData = analysisResponse.data.mappedData;
        setExtractedFields(mappedData);
        
        // Update the offer data with the extracted fields
        updateOfferData(prevData => ({
          ...prevData,
          ...mappedData
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
    } catch (error) {
      console.error('Error analyzing RPA:', error);
      setError(error.response?.data?.message || error.message || 'Failed to analyze RPA document');
      setAnalysisProgress('');
    } finally {
      setIsAnalyzing(false);
    }
  }, [uploadedFile, listingId, token, updateOfferData, handleNextStep]);

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
        <h2>Upload RPA Document</h2>
        <p>Upload your completed California Residential Purchase Agreement (RPA) to automatically pre-fill the offer form.</p>
      </div>

      <div className="form-group">
        {!uploadedFile ? (
          <div className="rpa-upload-area">
            <div className="rpa-upload-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10 9H9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3>Upload RPA Document</h3>
            <p>Drag and drop your completed RPA PDF here, or click to browse</p>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="rpa-file-input"
              id="rpa-file-input"
            />
            <label htmlFor="rpa-file-input" className="rpa-upload-button">
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
                <span className="rpa-field-value">{value}</span>
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

      <div className="rpa-help-section">
        <h4>What is an RPA?</h4>
        <p>
          The California Residential Purchase Agreement (RPA) is the standard form used for residential real estate transactions in California. 
          Uploading your completed RPA will automatically extract key information like purchase price, contingencies, and dates to pre-fill your offer.
        </p>
        <h4>Supported Formats</h4>
        <ul>
          <li>PDF files only</li>
          <li>Maximum file size: 50MB</li>
          <li>Both fillable forms and scanned documents are supported</li>
        </ul>
      </div>

      <div className="mom-button-container">
        <button 
          onClick={handleSkip}
          className="mom-step-back-button"
          disabled={isAnalyzing}
          type="button"
        >
          Skip RPA Upload
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