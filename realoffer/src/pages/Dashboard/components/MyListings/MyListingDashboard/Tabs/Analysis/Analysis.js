// Analysis.js

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../../../../../../context/AuthContext';
import TabPaywall from '../../../../../../../components/TabPaywall/TabPaywall';
import './Analysis.css';

const Analysis = ({ listingId }) => {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analysisData, setAnalysisData] = useState({
    valuation: null,
    rentEstimate: null,
    subjectProperty: null,
    lastUpdated: null
  });

  const fetchAnalysisData = useCallback(async (force = false) => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/property-analysis/${listingId}${force ? '?force=true' : ''}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      setAnalysisData({
        valuation: response.data.valuation,
        rentEstimate: response.data.rentEstimate,
        subjectProperty: response.data.subjectProperty,
        lastUpdated: response.data.lastUpdated
      });
    } catch (err) {
      setError('Failed to load analysis data. Please try again later.');
      console.error('Error fetching analysis data:', err);
    } finally {
      setLoading(false);
    }
  }, [listingId, token]);

  useEffect(() => {
    if (listingId && token) {
      fetchAnalysisData();
    }
  }, [listingId, token, fetchAnalysisData]);

  const formatCurrency = (value) => {
    if (!value) return 'N/A';
    return value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatLastUpdated = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  if (loading) {
    return (
      <div className="analysis-tab">
        <div className="analysis-loading">
          <div className="spinner"></div>
          <p>Loading analysis data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analysis-tab">
        <div className="analysis-error">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Check if user is pro - if not, show paywall
  if (!user?.isPremium) {
    return (
      <div className="analysis-tab">
        <TabPaywall feature="analysis" />
      </div>
    );
  }

  return (
    <div className="analysis-tab">
      <div className="analysis-content">
        <div className="analysis-header">
        </div>

        <div className="valuation-cards">
          <div className="valuation-card primary">
            <div className="card-header">
              <h3>Property Value & Rent Estimate</h3>
              <div className="header-actions">
                <span className="last-updated">Updated {formatLastUpdated(analysisData.lastUpdated)}</span>
                <button 
                  className="refresh-button"
                  onClick={() => fetchAnalysisData(true)}
                  disabled={loading}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M23 4V10H17M1 20V14H7M21.24 7.24C20.07 5.99 18.68 5.03 17.15 4.43C15.62 3.83 13.98 3.6 12.35 3.77C10.72 3.94 9.16 4.5 7.79 5.41C6.42 6.32 5.28 7.55 4.46 9.01L1 14M23 10L19.54 14.99C18.72 16.45 17.58 17.68 16.21 18.59C14.84 19.5 13.28 20.06 11.65 20.23C10.02 20.4 8.38 20.17 6.85 19.57C5.32 18.97 3.93 18.01 2.76 16.76L1 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Refresh
                </button>
              </div>
            </div>
            <div className="card-content">
              <div className="value-sections">
                <div className="value-section">
                  <div className="main-value">
                    {formatCurrency(analysisData.valuation?.estimatedValue)}
                    <div className="value-label">Estimated Property Value</div>
                  </div>
                  {analysisData.valuation?.priceRangeLow && analysisData.valuation?.priceRangeHigh && (
                    <div className="value-range">
                      Range: {formatCurrency(analysisData.valuation.priceRangeLow)} - {formatCurrency(analysisData.valuation.priceRangeHigh)}
                    </div>
                  )}
                </div>

                <div className="value-divider"></div>

                <div className="value-section">
                  <div className="main-value">
                    {formatCurrency(analysisData.rentEstimate?.rent)}
                    <div className="value-label">Estimated Monthly Rent</div>
                  </div>
                  {analysisData.rentEstimate?.rentRangeLow && analysisData.rentEstimate?.rentRangeHigh && (
                    <div className="value-range">
                      Range: {formatCurrency(analysisData.rentEstimate.rentRangeLow)} - {formatCurrency(analysisData.rentEstimate.rentRangeHigh)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {analysisData.subjectProperty && (
          <div className="subject-property">
            <h3>Property Details</h3>
            <div className="subject-details">
              <div className="subject-stat">
                <span className="stat-label">List Price</span>
                <span className="stat-value">{formatCurrency(analysisData.subjectProperty.price)}</span>
              </div>
              <div className="subject-stat">
                <span className="stat-label">Beds / Baths</span>
                <span className="stat-value">{analysisData.subjectProperty.beds} / {analysisData.subjectProperty.baths}</span>
              </div>
              <div className="subject-stat">
                <span className="stat-label">Square Feet</span>
                <span className="stat-value">{analysisData.subjectProperty.sqft?.toLocaleString()} sqft</span>
              </div>
              <div className="subject-stat">
                <span className="stat-label">Lot Size</span>
                <span className="stat-value">{analysisData.subjectProperty.lotSize?.toLocaleString()} sqft</span>
              </div>
              <div className="subject-stat">
                <span className="stat-label">Price/Sq Ft</span>
                <span className="stat-value">
                  {analysisData.subjectProperty.price && analysisData.subjectProperty.sqft 
                    ? formatCurrency(Math.round(analysisData.subjectProperty.price / analysisData.subjectProperty.sqft))
                    : 'N/A'}
                </span>
              </div>
              <div className="subject-stat">
                <span className="stat-label">Year Built</span>
                <span className="stat-value">{analysisData.subjectProperty.yearBuilt}</span>
              </div>
            </div>
          </div>
        )}

        <div className="comparable-sales">
          <h3>Comparable Sales</h3>
          {analysisData.valuation?.comparables?.length > 0 ? (
            <div className="comps-grid">
              {analysisData.valuation.comparables.slice(0, 6).map((comp, index) => (
                <div key={index} className="comp-card">
                  <div className="comp-header">
                    <h4>{comp.formattedAddress}</h4>
                    <div className="comp-distance">{Number(comp.distance).toFixed(2)} mi</div>
                  </div>
                  
                  <div className="comp-price">
                    <div className="price-main">{formatCurrency(comp.price)}</div>
                    {comp.priceDifference && (
                      <div className={`price-difference ${comp.priceDifference > 0 ? 'positive' : 'negative'}`}>
                        {comp.priceDifference > 0 ? '+' : ''}{formatCurrency(comp.priceDifference)}
                        <span className="price-percent">({Math.round(comp.priceDifferencePercent)}%)</span>
                      </div>
                    )}
                  </div>

                  <div className="comp-specs">
                    <div className="spec-item">
                      <span className="spec-label">Beds / Baths</span>
                      <span className="spec-value">{comp.beds} / {comp.baths}</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-label">Square Feet</span>
                      <span className="spec-value">{comp.sqft?.toLocaleString()} sqft</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-label">Lot Size</span>
                      <span className="spec-value">{comp.lotSize?.toLocaleString()} sqft</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-label">Price/Sq Ft</span>
                      <span className="spec-value">
                        {comp.price && comp.sqft
                          ? formatCurrency(Math.round(comp.price / comp.sqft))
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-label">Year Built</span>
                      <span className="spec-value">{comp.yearBuilt}</span>
                    </div>
                  </div>

                  <div className="comp-details">
                    <div className="detail-row">
                      <span className="detail-label">Date Listed</span>
                      <span className="detail-value">{formatDate(comp.listedDate)}</span>
                    </div>
                    {comp.removedDate && (
                      <div className="detail-row">
                        <span className="detail-label">Date Sold</span>
                        <span className="detail-value">{formatDate(comp.removedDate)}</span>
                      </div>
                    )}
                    <div className="detail-row">
                      <span className="detail-label">Days on Market</span>
                      <span className="detail-value">{comp.daysOnMarket} days</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-comps">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 12H15M9 16H15M17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H12.5858C12.851 3 13.1054 3.10536 13.2929 3.29289L19.7071 9.70711C19.8946 9.89464 20 10.149 20 10.4142V19C20 20.1046 19.1046 21 18 21H17Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p>No comparable properties found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analysis;