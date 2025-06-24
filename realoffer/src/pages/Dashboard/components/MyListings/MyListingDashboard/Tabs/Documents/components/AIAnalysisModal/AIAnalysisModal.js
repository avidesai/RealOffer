import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import api from '../../../../../../../../../context/api';
import './AIAnalysisModal.css';

const AIAnalysisModal = ({ isOpen, onClose, documentId, documentType }) => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const pollingIntervalRef = useRef(null);
  const isInitialRequestRef = useRef(true);

  const POLLING_INTERVAL = 5000; // 5 seconds

  const getModalTitle = () => {
    if (documentType && documentType.toLowerCase().includes('pest')) {
      return 'Pest Inspection Report Analysis';
    }
    return 'Home Inspection Report Analysis';
  };

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
        forceRefresh: false // Only generate new analysis if one doesn't exist
      });

      // Remove "Here is a structured summary..." if present
      let result = response.data.result;
      if (result && result.trim().toLowerCase().startsWith('here is a structured summary')) {
        result = result.replace(/^.*?\n+/i, '');
      }
      setAnalysis({ ...response.data, result });
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

  const handleRefreshAnalysis = () => {
    setLoading(true);
    setError(null);
    isInitialRequestRef.current = true;
    
    // Force a new analysis from Claude
    api.post('/api/document-analysis/analyze', {
      documentId,
      forceRefresh: true // Force refresh to get new analysis
    }).then(response => {
      let result = response.data.result;
      if (result && result.trim().toLowerCase().startsWith('here is a structured summary')) {
        result = result.replace(/^.*?\n+/i, '');
      }
      setAnalysis({ ...response.data, result });
      setError(null);
      setLoading(false);
    }).catch(err => {
      console.error('Analysis error:', err);
      setError(err.response?.data?.message || 'Error analyzing document');
      setLoading(false);
    });
  };

  if (!isOpen) return null;

  return (
    <div className="ai-analysis-modal-overlay">
      <div className="ai-analysis-modal">
        <div className="ai-analysis-modal-header">
          <h2>{getModalTitle()}</h2>
          <button className="ai-analysis-close-button" onClick={onClose} aria-label="Close">×</button>
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
                onClick={handleRefreshAnalysis}
              >
                Retry Analysis
              </button>
            </div>
          )}

          {!loading && !error && analysis?.result && (
            <>
              <div className="ai-analysis-result">
                <ReactMarkdown 
                  components={{
                    h2: ({ node, children, ...props }) => {
                      // Only show score bubble for Home Inspection Reports with a score in the heading
                      const isHomeInspection = documentType && documentType.toLowerCase().includes('home');
                      let headingText = '';
                      if (Array.isArray(children)) {
                        headingText = children.join('');
                      } else if (typeof children === 'string') {
                        headingText = children;
                      }
                      const scoreMatch = headingText.match(/(\d+)\/10/);
                      const hasScore = !!scoreMatch;
                      if (isHomeInspection && headingText.includes('Overall Condition') && hasScore) {
                        return (
                          <h2 
                            {...props} 
                            data-score={`${scoreMatch[0]}`}
                          >
                            {headingText.replace(/\s+\d+\/10$/, '')}
                          </h2>
                        );
                      }
                      // For all other cases, render h2 as-is (no bubble, no data-score)
                      return <h2 {...props}>{children}</h2>;
                    }
                  }}
                >
                  {analysis.result}
                </ReactMarkdown>
              </div>
              <div className="ai-analysis-footer">
                <button className="ai-analysis-close-button" onClick={onClose} aria-label="Close">
                  ×
                </button>
              </div>
              <div className="ai-analysis-actions">
                <button className="ai-analysis-download-button" onClick={handleDownload}>
                  Download Analysis
                </button>
                <button className="ai-analysis-refresh-button" onClick={handleRefreshAnalysis}>
                  Refresh Analysis
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