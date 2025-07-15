// AIAnalysisModal.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../../../../../../../context/AuthContext';
import './AIAnalysisModal.css';

const AIAnalysisModal = ({ document, onClose, isBuyerPackage = false }) => {
  const { token } = useAuth();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalysis();
  }, [document._id]);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/document-analysis/${document._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setAnalysis(response.data);
    } catch (error) {
      console.error('Error fetching analysis:', error);
      setError('Failed to load analysis');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="ai-analysis-modal-overlay" onClick={onClose}>
        <div className="ai-analysis-modal" onClick={(e) => e.stopPropagation()}>
          <div className="ai-analysis-modal-header">
            <h2>AI Analysis - {document.title}</h2>
            <button className="ai-analysis-modal-close" onClick={onClose}>
              ×
            </button>
          </div>
          <div className="ai-analysis-modal-content">
            <div className="ai-analysis-loading">
              <div className="ai-analysis-spinner"></div>
              <p>Analyzing document...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ai-analysis-modal-overlay" onClick={onClose}>
        <div className="ai-analysis-modal" onClick={(e) => e.stopPropagation()}>
          <div className="ai-analysis-modal-header">
            <h2>AI Analysis - {document.title}</h2>
            <button className="ai-analysis-modal-close" onClick={onClose}>
              ×
            </button>
          </div>
          <div className="ai-analysis-modal-content">
            <div className="ai-analysis-error">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-analysis-modal-overlay" onClick={onClose}>
      <div className="ai-analysis-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ai-analysis-modal-header">
          <h2>AI Analysis - {document.title}</h2>
          <button className="ai-analysis-modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        
        <div className="ai-analysis-modal-content">
          {analysis ? (
            <div className="ai-analysis-content">
              <div className="ai-analysis-meta">
                <p><strong>Analyzed:</strong> {formatDate(analysis.createdAt)}</p>
                <p><strong>Document Type:</strong> {document.type.toUpperCase()}</p>
              </div>

              {analysis.summary && (
                <div className="ai-analysis-section">
                  <h3>Document Summary</h3>
                  <p>{analysis.summary}</p>
                </div>
              )}

              {analysis.keyPoints && analysis.keyPoints.length > 0 && (
                <div className="ai-analysis-section">
                  <h3>Key Points</h3>
                  <ul>
                    {analysis.keyPoints.map((point, index) => (
                      <li key={index}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.risks && analysis.risks.length > 0 && (
                <div className="ai-analysis-section">
                  <h3>Potential Risks</h3>
                  <ul>
                    {analysis.risks.map((risk, index) => (
                      <li key={index}>{risk}</li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.recommendations && analysis.recommendations.length > 0 && (
                <div className="ai-analysis-section">
                  <h3>Recommendations</h3>
                  <ul>
                    {analysis.recommendations.map((recommendation, index) => (
                      <li key={index}>{recommendation}</li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.fullAnalysis && (
                <div className="ai-analysis-section">
                  <h3>Full Analysis</h3>
                  <p>{analysis.fullAnalysis}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="ai-analysis-empty">
              <p>No analysis available for this document.</p>
            </div>
          )}
        </div>

        <div className="ai-analysis-modal-footer">
          <button className="ai-analysis-close-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAnalysisModal; 