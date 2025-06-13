import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../../../../../../../context/api';
import './AIAnalysisModal.css';
import ReactMarkdown from 'react-markdown';

const AIAnalysisModal = ({ isOpen, onClose, documentId, documentType }) => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchAnalysis = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/api/document-analysis/analyze', {
        documentId,
        forceRefresh
      });
      setAnalysis(response.data.result);
      setLastUpdated(new Date(response.data.lastUpdated));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to analyze document');
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    if (isOpen) {
      fetchAnalysis();
    }
  }, [isOpen, fetchAnalysis]);

  const handleRefresh = () => {
    fetchAnalysis(true);
  };

  const handleDownload = () => {
    if (!analysis) return;

    const element = document.createElement('a');
    const file = new Blob([analysis], { type: 'text/plain' });
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
          {loading ? (
            <div className="ai-analysis-loading">
              <div className="ai-analysis-spinner"></div>
              <p>Analyzing document...</p>
            </div>
          ) : error ? (
            <div className="ai-analysis-error">
              <p>{error}</p>
              <button onClick={handleRefresh} className="ai-analysis-retry-button">
                Retry Analysis
              </button>
            </div>
          ) : (
            <>
              <div className="ai-analysis-result">
                <ReactMarkdown>{analysis}</ReactMarkdown>
              </div>
              {lastUpdated && (
                <div className="ai-analysis-footer">
                  <p>Last updated: {lastUpdated.toLocaleString()}</p>
                  <button onClick={handleRefresh} className="ai-analysis-refresh-button">
                    Refresh Analysis
                  </button>
                </div>
              )}
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