import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import api from '../../../../../../../../../context/api';
import { useAuth } from '../../../../../../../../../context/AuthContext';
import './AIAnalysisModal.css';

const AIAnalysisModal = ({ isOpen, onClose, documentId, documentType }) => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token } = useAuth();
  const pollingIntervalRef = useRef(null);
  const isInitialRequestRef = useRef(true);

  const POLLING_INTERVAL = 5000; // 5 seconds

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
        forceRefresh: isInitialRequestRef.current
      });

      setAnalysis(response.data);
      setError(null);

      // If this is the initial request and analysis is processing, start polling
      if (isInitialRequestRef.current && response.data.status === 'processing') {
        isInitialRequestRef.current = false;
        pollingIntervalRef.current = setInterval(fetchAnalysis, POLLING_INTERVAL);
      } else if (response.data.status === 'completed' || response.data.status === 'failed') {
        stopPolling();
        setLoading(false);
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err.response?.data?.message || 'Error analyzing document');
      setLoading(false);
      stopPolling();
    }
  }, [documentId, stopPolling]);

  useEffect(() => {
    if (isOpen) {
      isInitialRequestRef.current = true;
      setLoading(true);
      setError(null);
      fetchAnalysis();
    }
    return () => {
      stopPolling();
    };
  }, [isOpen, fetchAnalysis, stopPolling]);

  const handleDownload = () => {
    if (!analysis?.result) return;

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
                  isInitialRequestRef.current = true;
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