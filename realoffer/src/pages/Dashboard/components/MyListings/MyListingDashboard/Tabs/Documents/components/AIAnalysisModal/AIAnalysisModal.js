import React, { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import api from '../../../../../../../../../../../context/api';
import './AIAnalysisModal.css';

const AIAnalysisModal = ({ isOpen, onClose, documentId, documentType }) => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(null);

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

  const fetchAnalysis = useCallback(async () => {
    try {
      const response = await api.post('/api/document-analysis/analyze', {
        documentId,
        forceRefresh: false
      });

      setAnalysis(response.data);
      setError(null);

      // If analysis is still processing, start polling
      if (response.data.status === 'processing') {
        if (!pollingInterval) {
          const interval = setInterval(fetchAnalysis, 2000); // Poll every 2 seconds
          setPollingInterval(interval);
        }
      } else {
        // If analysis is complete or failed, stop polling
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
        setLoading(false);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error analyzing document');
      setLoading(false);
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    }
  }, [documentId, pollingInterval]);

  useEffect(() => {
    if (isOpen) {
      fetchAnalysis();
    }
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [isOpen, fetchAnalysis, pollingInterval]);

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