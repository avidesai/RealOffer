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

  const formatCurrency = (value) => {
    if (!value) return '$0';
    return value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  const getConditionColor = (condition) => {
    switch (condition) {
      case 'Excellent':
      case 'New':
        return '#10b981';
      case 'Good':
        return '#3b82f6';
      case 'Fair':
        return '#f59e0b';
      case 'Poor':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High':
        return '#ef4444';
      case 'Medium':
        return '#f59e0b';
      case 'Low':
        return '#10b981';
      default:
        return '#6b7280';
    }
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

  return (
    <div className="renovation-estimate">
      <div className="renovation-header">
        <h3>Renovation Estimate</h3>
        <div className="renovation-total">
          <span className="total-label">Total Estimated Cost:</span>
          <span className="total-amount">
            {formatCurrency(renovationEstimate.totalEstimatedCost)}
          </span>
        </div>
      </div>

      {renovationEstimate.summary && (
        <div className="renovation-summary">
          <p>{renovationEstimate.summary}</p>
        </div>
      )}

      <div className="renovation-breakdown">
        <h4>Cost Breakdown</h4>
        <div className="breakdown-grid">
          {renovationEstimate.breakdown.map((item, index) => (
            <div key={index} className="breakdown-item">
              <div className="item-header">
                <h5>{item.category}</h5>
                <div className="item-cost">
                  {formatCurrency(item.estimatedCost)}
                </div>
              </div>
              
              <div className="item-details">
                <div className="condition-badge" style={{ backgroundColor: getConditionColor(item.condition) }}>
                  {item.condition}
                </div>
                
                {item.renovationNeeded && (
                  <div className="priority-badge" style={{ backgroundColor: getPriorityColor(item.priority) }}>
                    {item.priority} Priority
                  </div>
                )}
                
                {!item.renovationNeeded && (
                  <div className="no-renovation-badge">
                    No Renovation Needed
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
  );
};

export default RenovationEstimate;
