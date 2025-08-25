// AIAnalysisModal.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import api from '../../../../../../../../../context/api';
import { useAuth } from '../../../../../../../../../context/AuthContext';
import TabPaywall from '../../../../../../../../../components/TabPaywall/TabPaywall';
import { hasPremiumAccess } from '../../../../../../../../../utils/trialUtils';
import { downloadAnalysisPDF } from '../../../../../../../../../utils/pdfGenerator';
import './AIAnalysisModal.css';

const AIAnalysisModal = ({ isOpen, onClose, documentId, documentType, documentTitle, addressLine, isBuyerPackage = false }) => {
  const { user } = useAuth();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const pollingIntervalRef = useRef(null);
  const isInitialRequestRef = useRef(true);

  const POLLING_INTERVAL = 5000; // 5 seconds

  const getModalTitle = () => {
    console.log('AIAnalysisModal (BuyerPackage) - documentType:', documentType);
    if (documentType && documentType.toLowerCase().includes('pest')) {
      return 'Pest Inspection Report Summary';
    } else if (documentType && documentType.toLowerCase().includes('roof inspection')) {
      return 'Roof Inspection Report Summary';
    } else if (documentType && documentType.toLowerCase().includes('sewer lateral')) {
      return 'Sewer Lateral Inspection Summary';
    } else if (documentType && documentType.toLowerCase().includes('seller property questionnaire')) {
      return 'Seller Property Questionnaire Summary';
    } else if (documentType && documentType.toLowerCase().includes('real estate transfer disclosure statement')) {
      return 'Transfer Disclosure Statement Summary';
    } else if (documentType && documentType.toLowerCase().includes('agent visual inspection')) {
      return 'Agent Visual Inspection Disclosure Summary';
    } else if (documentType && documentType.toLowerCase().includes('natural hazard')) {
      return 'Natural Hazard Disclosure Summary';
    } else if (documentType && documentType.toLowerCase().includes('preliminary title')) {
      return 'Preliminary Title Report Summary';
    }
    return 'Home Inspection Report Summary';
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

  // Normalize bullets to proper Markdown lists so ReactMarkdown renders <li> instead of paragraphs
  const normalizeBullets = useCallback((text) => {
    if (!text) return text;
    let t = text.replace(/\r\n/g, '\n');

    // Convert leading unicode bullets to markdown list items
    t = t.replace(/^\s*•\s+/gm, '- ');

    // If bullets appear inline (e.g., "... text • item one • item two"), split to new lines
    t = t.replace(/(\S)\s*•\s+/g, '$1\n- ');

    // Ensure emoji-led lines are treated as list items
    t = t.replace(/^\s*(?=[✅⚠️❌])/gm, '- ');

    return t;
  }, []);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  const fetchAnalysis = useCallback(async () => {
    try {
      const response = await api.post('/api/document-analysis/analyze', {
        documentId: documentId,
        forceRefresh: false // Check for existing analysis first
      });

      setAnalysis({ ...response.data, result: response.data.result });
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

  const handleDownload = async () => {
    if (!analysis?.result) return;

    console.log('handleDownload called with:', { documentType, documentTitle, resultLength: analysis.result?.length });

    try {
      await downloadAnalysisPDF(analysis.result, documentType, documentTitle, addressLine);
    } catch (error) {
      console.error('Error downloading PDF, falling back to text:', error);
      // Fallback to text download if PDF generation fails
      const element = document.createElement('a');
      const file = new Blob([analysis.result], { type: 'text/plain' });
      element.href = URL.createObjectURL(file);
      element.download = `${documentType} Analysis.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  };

  // Check if user has premium access (paid or trial) - if not, show paywall
  if (!hasPremiumAccess(user)) {
    return (
      <div className="aam-overlay" onClick={onClose}>
        <div className="aam-modal" onClick={(e) => e.stopPropagation()}>
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
    <div className="aam-overlay" onClick={onClose}>
      <div className="aam-modal" onClick={(e) => e.stopPropagation()}>
        <div className="aam-header">
          <h2>{getModalTitle()}</h2>
          <div className="aam-header-actions">
            <button className="aam-download-button" onClick={handleDownload}>
              Download
            </button>
          </div>
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
            </div>
          )}

          {!loading && !error && analysis?.result && (
            <>
              <div className="aam-result">
                <ReactMarkdown 
                  components={{
                    h2: ({ node, children, ...props }) => {
                      // Render h2 as-is (no bubble, no data-score)
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
                      
                      // Add visual indicators for system status in home inspection and roof inspection
                      if ((documentType && documentType.toLowerCase().includes('home')) || 
                          (documentType && documentType.toLowerCase().includes('roof inspection'))) {
                        if (text.includes('✅')) {
                          return <li {...props} className="status-good">{children}</li>;
                        } else if (text.includes('⚠️')) {
                          return <li {...props} className="status-warning">{children}</li>;
                        } else if (text.includes('❌')) {
                          return <li {...props} className="status-problem">{children}</li>;
                        }
                        
                        // Style home inspection structured items (only for home inspection)
                        if (documentType && documentType.toLowerCase().includes('home')) {
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
                      }
                      
                      // Style pest inspection items (original format)
                      if (documentType && documentType.toLowerCase().includes('pest')) {
                        return <li {...props} className="pest-item-standard">{children}</li>;
                      }
                      
                      // Style sewer lateral inspection items
                      if (documentType && documentType.toLowerCase().includes('sewer lateral')) {
                        return <li {...props} className="sewer-lateral-item-standard">{children}</li>;
                      }
                      
                      // Style SPQ items
                      if (documentType && documentType.toLowerCase().includes('seller property questionnaire')) {
                        return <li {...props} className="spq-item-standard">{children}</li>;
                      }
                      
                      // Style TDS items
                      if (documentType && documentType.toLowerCase().includes('real estate transfer disclosure statement')) {
                        return <li {...props} className="tds-item-standard">{children}</li>;
                      }
                      
                      // Style AVID items
                      if (documentType && documentType.toLowerCase().includes('agent visual inspection')) {
                        return <li {...props} className="avid-item-standard">{children}</li>;
                      }
                      
                      // Style NHD items
                      if (documentType && documentType.toLowerCase().includes('natural hazard')) {
                        return <li {...props} className="nhd-item-standard">{children}</li>;
                      }
                      
                      // Style PTR items
                      if (documentType && documentType.toLowerCase().includes('preliminary title')) {
                        return <li {...props} className="ptr-item-standard">{children}</li>;
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
                  {normalizeBullets(analysis.result)}
                </ReactMarkdown>
              </div>

            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIAnalysisModal; 