// RenovationEstimate.js

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './RenovationEstimate.css';

const RenovationEstimate = ({ propertyId, showRegenerateButton = true, isHidden = false, onToggleVisibility }) => {
  const { token } = useAuth();
  const [renovationData, setRenovationData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  // const [selectedFilter, setSelectedFilter] = useState('all'); // Removed filter state

  const fetchRenovationEstimate = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/renovation-analysis/${propertyId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      setRenovationData(response.data);
    } catch (err) {
      if (err.response?.status === 404) {
        // No renovation analysis exists yet
        setRenovationData(null);
      } else {
        setError('Failed to load renovation estimate');
        console.error('Error fetching renovation estimate:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [propertyId, token]);

  const generateRenovationEstimate = async () => {
    try {
      setGenerating(true);
      setError(null);
      
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/renovation-analysis/${propertyId}/generate`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      setRenovationData(response.data);
    } catch (err) {
      setError('Failed to generate renovation estimate');
      console.error('Error generating renovation estimate:', err);
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (propertyId) {
      fetchRenovationEstimate();
    }
  }, [propertyId, fetchRenovationEstimate]);

  // Poll for updates when analysis is processing
  useEffect(() => {
    let interval;
    let pollCount = 0;
    const maxPolls = 120; // Maximum 10 minutes of polling (120 * 5 seconds)
    
    if (renovationData?.status === 'processing') {
      interval = setInterval(async () => {
        pollCount++;
        
        // Stop polling after max attempts
        if (pollCount >= maxPolls) {
          console.log('Stopping renovation analysis polling - max attempts reached');
          clearInterval(interval);
          return;
        }
        
        try {
          await fetchRenovationEstimate();
        } catch (error) {
          console.error('Error during polling:', error);
          // Don't stop polling on individual errors, but log them
        }
      }, 5000); // Check every 5 seconds for more responsive updates
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [renovationData?.status, fetchRenovationEstimate]);

  const formatCurrency = (value) => {
    if (!value) return '$0';
    return value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  const getConditionBadgeColor = (condition) => {
    switch (condition) {
      case 'New': return '#28a745';
      case 'Excellent': return '#17a2b8';
      case 'Good': return '#6f42c1';
      case 'Fair': return '#ffc107';
      case 'Poor': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getPriorityBadgeColor = (priority) => {
    switch (priority) {
      case 'High': return '#dc3545';
      case 'Medium': return '#ffc107';
      case 'Low': return '#28a745';
      case 'None': return '#6c757d';
      default: return '#6c757d';
    }
  };

  const filterBreakdownItems = (items) => {
    // Show all items since filters are removed
    return items;
  };

  const getFilteredBreakdown = () => {
    if (!renovationData?.renovationEstimate?.breakdown) return [];
    return renovationData.renovationEstimate.breakdown; // Show all items
  };

  const getSummaryStats = () => {
    if (!renovationData?.renovationEstimate?.breakdown) return null;
    
    const breakdown = renovationData.renovationEstimate.breakdown;
    const itemsNeedingRenovation = breakdown.filter(item => item.renovationNeeded);
    const totalCost = itemsNeedingRenovation.reduce((sum, item) => sum + item.estimatedCost, 0);
    const neededItems = itemsNeedingRenovation.length;
    const highPriorityItems = itemsNeedingRenovation.filter(item => item.priority === 'High');
    
    return {
      totalCost,
      neededItems: neededItems,
      highPriorityItems: highPriorityItems.length,
      moveInReady: neededItems === 0
    };
  };

  // If hidden and this is the buyer package side, don't render at all
  if (isHidden && !showRegenerateButton) {
    return null;
  }

  if (loading) {
    return (
      <div className="renovation-estimate">
        <div className="renovation-loading">
          <div className="spinner"></div>
          <p>Loading renovation estimate...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="renovation-estimate">
        <div className="renovation-error">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <p>{error}</p>
          <button onClick={fetchRenovationEstimate} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Only show estimate if status is 'completed' AND we have a renovation estimate
  if (!renovationData?.renovationEstimate || renovationData?.status !== 'completed') {
    // Check if analysis is currently processing
    if (renovationData?.status === 'processing') {
      const processingDetails = renovationData?.processingDetails || {};
      const progress = processingDetails.totalPhotos > 0 ? 
        (processingDetails.photosProcessed / processingDetails.totalPhotos) * 100 : 0;
      
      return (
        <div className="renovation-estimate">
          <div className="renovation-header">
            <h3>
              Renovation Estimate
              <span className="beta-badge">Beta</span>
            </h3>
          </div>
          <div className="renovation-content">
            <div className="processing-status">
              <div className="processing-info">
                <div className="spinner"></div>
                <div className="processing-text">
                  <p>
                    {processingDetails.processingMessage || 'Analyzing property photos...'}
                  </p>
                  {processingDetails.currentBatch && processingDetails.totalBatches && (
                    <p className="processing-note">
                      Processing batch {processingDetails.currentBatch} of {processingDetails.totalBatches}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="progress-container">
                <div className="progress-bar-container">
                  <div className="progress-bar" style={{ width: `${Math.max(5, progress)}%` }}></div>
                </div>
                <div className="progress-text">
                  <span className="progress-percentage">{Math.round(progress)}%</span>
                  <span className="progress-fraction">
                    {processingDetails.photosProcessed || 0} of {processingDetails.totalPhotos || 0} photos
                  </span>
                </div>
              </div>
              
              <button 
                onClick={fetchRenovationEstimate}
                className="manual-refresh-button"
              >
                Check Status
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="renovation-estimate">
        <div className="renovation-empty">
          <div className="renovation-empty-icon">🏠</div>
          <h3>Renovation Estimate</h3>
          <p>Generate a detailed renovation cost estimate based on property photos</p>
          <button 
            onClick={generateRenovationEstimate}
            disabled={generating}
            className="generate-estimate-button"
          >
            {generating ? 'Generating...' : 'Generate Estimate'}
          </button>
        </div>
      </div>
    );
  }

  const { renovationEstimate } = renovationData;
  const stats = getSummaryStats();
  const filteredBreakdown = getFilteredBreakdown();

  return (
    <div className={`renovation-estimate ${isHidden ? 'renovation-hidden' : ''}`}>
      <div className="renovation-header">
        <h3>
          Renovation Estimate
          <span className="beta-badge">Beta</span>
        </h3>
        <div className="renovation-actions">
          {showRegenerateButton && (
            <button 
              onClick={generateRenovationEstimate}
              disabled={generating}
              className="regenerate-estimate-button"
            >
              {generating ? 'Regenerating...' : 'Regenerate Analysis'}
            </button>
          )}
          {showRegenerateButton && (
            <button 
              onClick={onToggleVisibility}
              className="toggle-visibility-button"
            >
              {isHidden ? 'Show Renovation Estimate' : 'Hide Renovation Estimate'}
            </button>
          )}
        </div>
      </div>

      {isHidden ? (
        <div className="renovation-hidden-overlay">
          <div className="renovation-hidden-content">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 12H15M9 16H15M17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H12.5858C12.851 3 13.1054 3.10536 13.2929 3.29289L19.7071 9.70711C19.8946 9.89464 20 10.149 20 10.4142V19C20 20.1046 19.1046 21 18 21H17Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p>Renovation Estimate Hidden</p>
          </div>
        </div>
      ) : (
        <div className="renovation-content">
          {/* Summary Stats */}
          <div className="renovation-summary-stats">
            <div className="stat-card primary">
              <div className="stat-value">{formatCurrency(renovationEstimate.totalEstimatedCost)}</div>
              <div className="stat-label">Total Estimated Cost</div>
            </div>
          </div>

          {/* Move-in Ready Badge */}
          {stats.moveInReady && (
            <div className="move-in-ready-badge">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Move-In Ready Property</span>
            </div>
          )}

          {/* Processing Status */}
          {renovationData?.status === 'processing' && (
            <div className="processing-status">
              <div className="processing-info">
                <div className="spinner"></div>
                <div className="processing-text">
                  <p>Analyzing property photos...</p>
                  <p className="processing-note">This may take a few minutes. You can manually refresh below.</p>
                </div>
              </div>
              <button 
                onClick={fetchRenovationEstimate}
                className="manual-refresh-button"
              >
                Check Status
              </button>
            </div>
          )}

          {/* Filter Controls */}
          {/* <div className="renovation-filters">
            <button 
              className={`filter-button ${selectedFilter === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedFilter('all')}
            >
              All Categories ({renovationEstimate.breakdown.length})
            </button>
            {stats.neededItems > 0 && (
              <button 
                className={`filter-button ${selectedFilter === 'needed' ? 'active' : ''}`}
                onClick={() => setSelectedFilter('needed')}
              >
                Needs Work ({stats.neededItems})
              </button>
            )}
            {(renovationEstimate.breakdown.length - stats.neededItems) > 0 && (
              <button 
                className={`filter-button ${selectedFilter === 'not-needed' ? 'active' : ''}`}
                onClick={() => setSelectedFilter('not-needed')}
              >
                No Work Needed ({renovationEstimate.breakdown.length - stats.neededItems})
              </button>
            )}
            {stats.highPriorityItems > 0 && (
              <button 
                className={`filter-button ${selectedFilter === 'high-priority' ? 'active' : ''}`}
                onClick={() => setSelectedFilter('high-priority')}
              >
                High Priority ({stats.highPriorityItems})
              </button>
            )}
          </div> */}

          {/* Breakdown Grid */}
          <div className="renovation-breakdown">
            <div className="breakdown-grid">
              {filteredBreakdown.map((item, index) => (
                <div key={index} className="breakdown-item">
                  <div className="item-header">
                    <h5>{item.category}</h5>
                    <div className="item-cost">
                      {formatCurrency(item.estimatedCost)}
                    </div>
                  </div>
                  
                  <div className="item-badges">
                    {/* Condition Badge */}
                    <div 
                      className="condition-badge"
                      style={{ backgroundColor: getConditionBadgeColor(item.condition) }}
                    >
                      {item.condition} Condition
                    </div>
                    
                    {/* Renovation Needed Badge */}
                    {!item.renovationNeeded && (
                      <div className="no-renovation-badge">
                        No Renovation Needed
                      </div>
                    )}
                    
                    {/* Priority Badge */}
                    {item.renovationNeeded && (
                      <div 
                        className="priority-badge"
                        style={{ backgroundColor: getPriorityBadgeColor(item.priority) }}
                      >
                        {item.priority} Priority
                      </div>
                    )}
                  </div>
                  
                  {item.description && (
                    <p className="item-description">{item.description}</p>
                  )}
                  
                  {item.notes && (
                    <p className="item-notes">{item.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RenovationEstimate;
