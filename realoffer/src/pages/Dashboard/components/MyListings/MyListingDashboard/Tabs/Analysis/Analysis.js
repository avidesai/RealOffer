import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../../../../../context/AuthContext';
import './Analysis.css';

const Analysis = ({ listingId }) => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analysisData, setAnalysisData] = useState({
    valuation: null,
    rentEstimate: null,
    subjectProperty: null
  });

  const fetchAnalysisData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/property-analysis/${listingId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      setAnalysisData({
        valuation: response.data.valuation,
        rentEstimate: response.data.rentEstimate,
        subjectProperty: response.data.subjectProperty
      });
    } catch (err) {
      setError('Failed to load analysis data. Please try again later.');
      console.error('Error fetching analysis data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (listingId && token) {
      fetchAnalysisData();
    }
  }, [listingId, token]);

  const formatCurrency = (value) => {
    if (!value) return 'N/A';
    return value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  const formatPercent = (value) => {
    if (!value) return 'N/A';
    return `${value > 0 ? '+' : ''}${value}%`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getConfidenceLevel = (correlation) => {
    if (!correlation) return 'N/A';
    if (correlation >= 0.9) return 'High';
    if (correlation >= 0.7) return 'Medium';
    return 'Low';
  };

  const getConfidenceColor = (correlation) => {
    if (!correlation) return '#6c757d';
    if (correlation >= 0.9) return '#28a745';
    if (correlation >= 0.7) return '#ffc107';
    return '#dc3545';
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

  return (
    <div className="analysis-tab">
      <div className="analysis-content">
        <div className="analysis-header">
          <h2>Property Analysis</h2>
          <p>AI valuation based on comparable properties</p>
        </div>

        <div className="valuation-cards">
          <div className="valuation-card primary">
            <div className="card-header">
              <h3>Property Value & Rent Estimate</h3>
              <button 
                className="refresh-button"
                onClick={fetchAnalysisData}
                disabled={loading}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M23 4V10H17M1 20V14H7M21.24 7.24C20.07 5.99 18.68 5.03 17.15 4.43C15.62 3.83 13.98 3.6 12.35 3.77C10.72 3.94 9.16 4.5 7.79 5.41C6.42 6.32 5.28 7.55 4.46 9.01L1 14M23 10L19.54 14.99C18.72 16.45 17.58 17.68 16.21 18.59C14.84 19.5 13.28 20.06 11.65 20.23C10.02 20.4 8.38 20.17 6.85 19.57C5.32 18.97 3.93 18.01 2.76 16.76L1 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Refresh Data
              </button>
            </div>
            <div className="card-content">
              <div className="value-sections">
                <div className="value-section">
                  <div className="main-value">
                    {formatCurrency(analysisData.valuation?.estimatedValue)}
                    <div className="value-label">Estimated Home Value</div>
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
            <h3>Subject Property</h3>
            <div className="subject-details">
              <div className="subject-stat">
                <span className="stat-label">Listed Price</span>
                <span className="stat-value">{formatCurrency(analysisData.subjectProperty.price)}</span>
              </div>
              <div className="subject-stat">
                <span className="stat-label">Beds/Baths</span>
                <span className="stat-value">{analysisData.subjectProperty.beds}/{analysisData.subjectProperty.baths}</span>
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
          <div className="comps-grid">
            {analysisData.valuation?.comparables?.slice(0, 6).map((comp, index) => (
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
                    <span className="spec-label">Beds/Baths</span>
                    <span className="spec-value">{comp.bedrooms}/{comp.bathrooms}</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-label">Square Feet</span>
                    <span className="spec-value">{comp.squareFootage?.toLocaleString()} sqft</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-label">Lot Size</span>
                    <span className="spec-value">{comp.lotSize?.toLocaleString()} sqft</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-label">Price/Sq Ft</span>
                    <span className="spec-value">
                      {comp.price && comp.squareFootage
                        ? formatCurrency(Math.round(comp.price / comp.squareFootage))
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
                    <span className="detail-label">Listed Date</span>
                    <span className="detail-value">{formatDate(comp.listedDate)}</span>
                  </div>
                  {comp.removedDate && (
                    <div className="detail-row">
                      <span className="detail-label">Sold Date</span>
                      <span className="detail-value">{formatDate(comp.removedDate)}</span>
                    </div>
                  )}
                  <div className="detail-row">
                    <span className="detail-label">Days on Market</span>
                    <span className="detail-value">{comp.daysOnMarket} days</span>
                  </div>
                  {comp.correlation && (
                    <div className="detail-row">
                      <span className="detail-label">Similarity</span>
                      <span 
                        className="detail-value confidence-badge"
                        style={{ color: getConfidenceColor(comp.correlation) }}
                      >
                        {getConfidenceLevel(comp.correlation)} ({Math.round(comp.correlation * 100)}%)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analysis;