// RenovationEstimate.js

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './RenovationEstimate.css';

const RenovationEstimate = ({ propertyId }) => {
  const { token } = useAuth();
  const [renovationData, setRenovationData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('all');

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
    const maxPolls = 60; // Maximum 5 minutes of polling (60 * 5 seconds)
    
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
      }, 10000); // Check every 10 seconds instead of 5
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
    if (selectedFilter === 'all') return items;
    if (selectedFilter === 'needed') return items.filter(item => item.renovationNeeded);
    if (selectedFilter === 'not-needed') return items.filter(item => !item.renovationNeeded);
    if (selectedFilter === 'high-priority') return items.filter(item => item.priority === 'High' && item.renovationNeeded);
    return items;
  };

  const getFilteredBreakdown = () => {
    if (!renovationData?.renovationEstimate?.breakdown) return [];
    return filterBreakdownItems(renovationData.renovationEstimate.breakdown);
  };

  const getSummaryStats = () => {
    if (!renovationData?.renovationEstimate?.breakdown) return null;
    
    const breakdown = renovationData.renovationEstimate.breakdown;
    const totalCost = breakdown.reduce((sum, item) => sum + item.estimatedCost, 0);
    const neededItems = breakdown.filter(item => item.renovationNeeded);
    const highPriorityItems = breakdown.filter(item => item.priority === 'High' && item.renovationNeeded);
    
    return {
      totalCost,
      neededItems: neededItems.length,
      highPriorityItems: highPriorityItems.length,
      moveInReady: neededItems.length === 0
    };
  };

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

  if (!renovationData?.renovationEstimate) {
    // Check if analysis is currently processing
    if (renovationData?.status === 'processing') {
      return (
        <div className="renovation-estimate">
          <div className="renovation-loading">
            <div className="spinner"></div>
            <p>Generating renovation estimate...</p>
            <p className="processing-note">This happens automatically when photos are uploaded</p>
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
    <div className="renovation-estimate">
      <div className="renovation-header">
        <h3>Renovation Analysis</h3>
        <div className="renovation-actions">
          <button 
            onClick={generateRenovationEstimate}
            disabled={generating}
            className="regenerate-estimate-button"
          >
            {generating ? 'Regenerating...' : 'Regenerate Analysis'}
          </button>
        </div>
      </div>

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
        <div className="renovation-filters">
          <button 
            className={`filter-button ${selectedFilter === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedFilter('all')}
          >
            All Items ({renovationEstimate.breakdown.length})
          </button>
          <button 
            className={`filter-button ${selectedFilter === 'needed' ? 'active' : ''}`}
            onClick={() => setSelectedFilter('needed')}
          >
            Needs Attention ({stats.neededItems})
          </button>
          <button 
            className={`filter-button ${selectedFilter === 'not-needed' ? 'active' : ''}`}
            onClick={() => setSelectedFilter('not-needed')}
          >
            No Renovation Needed ({renovationEstimate.breakdown.length - stats.neededItems})
          </button>
          <button 
            className={`filter-button ${selectedFilter === 'high-priority' ? 'active' : ''}`}
            onClick={() => setSelectedFilter('high-priority')}
          >
            High Priority ({stats.highPriorityItems})
          </button>
        </div>

        {/* Breakdown Grid */}
        <div className="renovation-breakdown">
          <h4>Detailed Analysis</h4>
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
    </div>
  );
};

export default RenovationEstimate;
