import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import api from '../../../../../../../../../context/api';
import { useAuth } from '../../../../../../../../../context/AuthContext';
import TabPaywall from '../../../../../../../../../components/TabPaywall/TabPaywall';
import './AIAnalysisModal.css';

const AIAnalysisModal = ({ isOpen, onClose, documentId, documentType }) => {
  const { user } = useAuth();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const pollingIntervalRef = useRef(null);
  const isInitialRequestRef = useRef(true);

  const POLLING_INTERVAL = 5000; // 5 seconds

  const getModalTitle = () => {
    if (documentType && documentType.toLowerCase().includes('pest')) {
      return 'Pest Inspection Report Analysis';
    } else if (documentType && documentType.toLowerCase().includes('seller property questionnaire')) {
      return 'Seller Property Questionnaire Analysis';
    } else if (documentType && documentType.toLowerCase().includes('transfer disclosure statement')) {
      return 'Transfer Disclosure Statement Analysis';
    } else if (documentType && documentType.toLowerCase().includes('agent visual inspection disclosure')) {
      return 'Agent Visual Inspection Disclosure Analysis';
    }
    return 'Home Inspection Report Analysis';
  };

  const getProgressMessage = (progress) => {
    const messages = {
      initializing: 'Initializing analysis...',
      extracting_text: 'Extracting text from document...',
      performing_ocr: 'Performing OCR on document...',
      analyzing: 'Analyzing document content with AI...',
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

  // Check if user is pro - if not, show paywall
  if (!user?.isPremium) {
    return (
      <div className="aam-overlay">
        <div className="aam-modal">
          <div className="aam-header">
            <h2>{getModalTitle()}</h2>
            <button className="aam-close-button" onClick={onClose} aria-label="Close">×</button>
          </div>
          <div className="aam-content">
            <TabPaywall feature="ai-analysis" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="aam-overlay">
      <div className="aam-modal">
        <div className="aam-header">
          <h2>{getModalTitle()}</h2>
          <button className="aam-close-button" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="aam-content">
          {loading && (
            <div className="aam-loading">
              <div className="aam-progress">
                <div 
                  className="aam-progress-bar"
                  style={{ width: `${analysis?.progress?.percentage || 0}%` }}
                />
              </div>
              <p className="aam-status">
                {getProgressMessage(analysis?.progress)}
              </p>
            </div>
          )}

          {error && (
            <div className="aam-error">
              <p>{error}</p>
              <button 
                className="aam-retry-button"
                onClick={handleRefreshAnalysis}
              >
                Retry Analysis
              </button>
            </div>
          )}

          {!loading && !error && analysis?.result && (
            <>
              <div className="aam-result">
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
                    },
                    // Enhanced styling for new prompt structure
                    strong: ({ node, children, ...props }) => {
                      const text = Array.isArray(children) ? children.join('') : children;
                      
                      // Style cost amounts in pest inspection reports
                      if (documentType && documentType.toLowerCase().includes('pest') && 
                          text.includes('$') && text.match(/\$\d+/)) {
                        return <strong {...props} className="cost-highlight">{children}</strong>;
                      }
                      
                      // Style urgency tags - look for standalone urgency words
                      if (text === 'Urgent' || text === 'Recommended' || text === 'Preventative') {
                        return <strong {...props} className={`urgency-tag urgency-${text.toLowerCase()}`}>{children}</strong>;
                      }
                      
                      // Style structured labels in home inspection reports (only for Location, Risk, Urgency, Expected Outcome)
                      if (documentType && documentType.toLowerCase().includes('home')) {
                        const labels = ['Location', 'Risk', 'Urgency', 'Expected Outcome'];
                        if (labels.some(label => text === label)) {
                          return <strong {...props} className="structured-label">{children}</strong>;
                        }
                      }
                      
                      return <strong {...props}>{children}</strong>;
                    },
                    // Style bullet points with visual indicators
                    li: ({ node, children, ...props }) => {
                      const text = Array.isArray(children) ? children.join('') : children;
                      
                      // Add visual indicators for system status in home inspection
                      if (documentType && documentType.toLowerCase().includes('home')) {
                        if (text.includes('✅')) {
                          return <li {...props} className="status-good">{children}</li>;
                        } else if (text.includes('⚠️')) {
                          return <li {...props} className="status-warning">{children}</li>;
                        } else if (text.includes('❌')) {
                          return <li {...props} className="status-problem">{children}</li>;
                        }
                        
                        // Style home inspection structured items
                        if (!text.includes('**Location**') && !text.includes('**Risk**') && 
                            !text.includes('**Urgency**') && !text.includes('**Expected Outcome**')) {
                          return <li {...props} className="home-item-main">{children}</li>;
                        }
                        // Sub-bullet points for details
                        else if (text.includes('**Location**') || text.includes('**Urgency**')) {
                          return <li {...props} className="home-item-detail">{children}</li>;
                        }
                        // Risk items (should be styled differently)
                        else if (text.includes('**Risk**') || text.includes('**Expected Outcome**')) {
                          return <li {...props} className="home-item-risk">{children}</li>;
                        }
                      }
                      
                      // Style pest inspection items (original format)
                      if (documentType && documentType.toLowerCase().includes('pest')) {
                        return <li {...props} className="pest-item-standard">{children}</li>;
                      }
                      
                      // Style SPQ items
                      if (documentType && documentType.toLowerCase().includes('seller property questionnaire')) {
                        return <li {...props} className="spq-item-standard">{children}</li>;
                      }
                      
                      // Style TDS items
                      if (documentType && documentType.toLowerCase().includes('transfer disclosure statement')) {
                        return <li {...props} className="tds-item-standard">{children}</li>;
                      }
                      
                      // Style AVID items
                      if (documentType && documentType.toLowerCase().includes('agent visual inspection disclosure')) {
                        return <li {...props} className="avid-item-standard">{children}</li>;
                      }
                      
                      return <li {...props}>{children}</li>;
                    },
                    // Style section dividers
                    hr: ({ node, ...props }) => {
                      return <hr {...props} className="section-divider" />;
                    },
                    // Handle paragraph spacing for better readability
                    p: ({ node, children, ...props }) => {
                      return <p {...props} className="analysis-paragraph">{children}</p>;
                    }
                  }}
                >
                  {analysis.result}
                </ReactMarkdown>
              </div>
              <div className="aam-footer">
                <button className="aam-close-button" onClick={onClose} aria-label="Close">
                  ×
                </button>
              </div>
              <div className="aam-actions">
                <button className="aam-download-button" onClick={handleDownload}>
                  Download Analysis
                </button>
                <button className="aam-refresh-button" onClick={handleRefreshAnalysis}>
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