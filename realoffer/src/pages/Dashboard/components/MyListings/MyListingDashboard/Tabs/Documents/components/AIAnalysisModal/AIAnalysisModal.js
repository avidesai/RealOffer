import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import api from '../../../../../../../../../context/api';
import { useAuth } from '../../../../../../../../../context/AuthContext';
import './AIAnalysisModal.css';

const AIAnalysisModal = ({ isOpen, onClose, documentId, documentType }) => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const { token } = useAuth();
  const pollingIntervalRef = useRef(null);
  const retryCountRef = useRef(0);

  const MAX_RETRIES = 30; // Maximum number of retries (5 minutes with 10-second interval)
  const POLLING_INTERVAL = 10000; // 10 seconds

  const getProgressMessage = (progress) => {
    const messages = {
      initializing: 'Initializing analysis...',
      extracting_text: 'Extracting text from document...',
      performing_ocr: 'Performing OCR on document...',
      analyzing: 'Analyzing document content...',
      saving: 'Saving analysis results...',
      completed: 'Analysis completed',
      failed: 'Analysis failed'
    };
    return progress?.message || messages[progress?.currentStep] || 'Processing...';
  };

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  const fetchAnalysis = useCallback(async () => {
    try {
      const response = await api.post('/api/document-analysis/analyze', {
        documentId,
        forceRefresh: false
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setAnalysis(response.data);
      setError(null);
      retryCountRef.current = 0;
      setRetryCount(0);

      // If analysis is still processing, continue polling
      if (response.data.status === 'processing') {
        if (!pollingIntervalRef.current && retryCountRef.current < MAX_RETRIES) {
          pollingIntervalRef.current = setInterval(fetchAnalysis, POLLING_INTERVAL);
        }
      } else {
        // If analysis is complete or failed, stop polling
        stopPolling();
        setLoading(false);
      }
    } catch (err) {
      console.error('Analysis error:', err);
      
      // Handle rate limit error
      if (err.response?.status === 429) {
        retryCountRef.current += 1;
        setRetryCount(retryCountRef.current);
        
        if (retryCountRef.current >= MAX_RETRIES) {
          setError('Analysis is taking longer than expected. Please try again in a few minutes.');
          setLoading(false);
          stopPolling();
        } else {
          // Wait longer before retrying after rate limit
          stopPolling();
          pollingIntervalRef.current = setInterval(fetchAnalysis, POLLING_INTERVAL * 2);
        }
      } else {
        setError(err.response?.data?.message || 'Error analyzing document');
        setLoading(false);
        stopPolling();
      }
    }
  }, [documentId, token, stopPolling]);

  useEffect(() => {
    if (isOpen) {
      fetchAnalysis();
    }
    return () => {
      stopPolling();
    };
  }, [isOpen, fetchAnalysis, stopPolling]);

  const handleDownload = () => {
    if (!analysis) return;

    const element = document.createElement('a');
    const file = new Blob([analysis.result], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${documentType} Analysis.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (!isOpen) return null;

  return (
    <div className="ai-analysis-modal-overlay">
      <div className="ai-analysis-modal">
        <div className="ai-analysis-modal-header">
          <h2>AI Analysis - {documentType}</h2>
          <button className="ai-analysis-close-button" onClick={onClose}>×</button>
        </div>
        <div className="ai-analysis-modal-content">
          {loading && (
            <div className="ai-analysis-loading">
              <div className="ai-analysis-progress">
                <div 
                  className="ai-analysis-progress-bar"
                  style={{ width: `${analysis?.progress?.percentage || 0}%` }}
                />
              </div>
              <p className="ai-analysis-status">
                {getProgressMessage(analysis?.progress)}
              </p>
              {retryCount > 0 && (
                <p className="ai-analysis-retry-message">
                  Retry attempt {retryCount} of {MAX_RETRIES}
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="ai-analysis-error">
              <p>{error}</p>
              <button 
                className="ai-analysis-retry-button"
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  retryCountRef.current = 0;
                  setRetryCount(0);
                  fetchAnalysis();
                }}
              >
                Retry Analysis
              </button>
            </div>
          )}

          {!loading && !error && analysis?.result && (
            <>
              <div className="ai-analysis-result">
                <ReactMarkdown>{analysis.result}</ReactMarkdown>
              </div>
              <div className="ai-analysis-footer">
                <button className="ai-analysis-close-button" onClick={onClose}>
                  Close
                </button>
              </div>
              <div className="ai-analysis-actions">
                <button className="ai-analysis-download-button" onClick={handleDownload}>
                  Download Analysis
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIAnalysisModal; 