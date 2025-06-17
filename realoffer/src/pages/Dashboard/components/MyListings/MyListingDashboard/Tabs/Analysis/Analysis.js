import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../../../../../context/AuthContext';
import './Analysis.css';

const Analysis = ({ listingId }) => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('valuation');
  const [analysisData, setAnalysisData] = useState({
    valuation: null,
    rentEstimate: null,
    subjectProperty: null
  });

  useEffect(() => {
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
      {/* Analysis Navigation */}
      <div className="analysis-nav">
        <button
          className={`analysis-nav-btn ${activeTab === 'valuation' ? 'active' : ''}`}
          onClick={() => setActiveTab('valuation')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 13H11L15 9L21 15V21H3V13Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Property Value
        </button>
        <button
          className={`analysis-nav-btn ${activeTab === 'rent' ? 'active' : ''}`}
          onClick={() => setActiveTab('rent')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Rent Estimate
        </button>
        <button
          className={`analysis-nav-btn ${activeTab === 'comps' ? 'active' : ''}`}
          onClick={() => setActiveTab('comps')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 6H20L18 4H6L4 6ZM2 8V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V8H2ZM8 11H16V13H8V11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Comparables
        </button>
      </div>

      {/* Property Valuation Tab */}
      {activeTab === 'valuation' && (
        <div className="analysis-content">
          <div className="analysis-header">
            <h2>Property Value Analysis</h2>
            <p>Automated valuation model based on comparable properties</p>
          </div>

          <div className="valuation-cards">
            <div className="valuation-card primary">
              <div className="card-header">
                <h3>Estimated Value</h3>
              </div>
              <div className="card-content">
                <div className="main-value">{formatCurrency(analysisData.valuation?.estimatedValue)}</div>
                {analysisData.valuation?.priceRangeLow && analysisData.valuation?.priceRangeHigh && (
                  <div className="value-range">
                    Range: {formatCurrency(analysisData.valuation.priceRangeLow)} - {formatCurrency(analysisData.valuation.priceRangeHigh)}
                  </div>
                )}
                {analysisData.valuation?.pricePerSqFt && (
                  <div className="price-per-sqft">
                    {formatCurrency(analysisData.valuation.pricePerSqFt)} per sq ft
                  </div>
                )}
              </div>
            </div>

            <div className="valuation-card">
              <div className="card-header">
                <h3>Analysis Details</h3>
              </div>
              <div className="card-content">
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Comparables Used</span>
                    <span className="detail-value">{analysisData.valuation?.comparables?.length || 0}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Data Source</span>
                    <span className="detail-value">RentCast AVM</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Last Updated</span>
                    <span className="detail-value">{formatDate(analysisData.valuation?.lastUpdated)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rent Estimate Tab */}
      {activeTab === 'rent' && (
        <div className="analysis-content">
          <div className="analysis-header">
            <h2>Rental Analysis</h2>
            <p>Estimated monthly rental income based on local market data</p>
          </div>

          <div className="valuation-cards">
            <div className="valuation-card primary">
              <div className="card-header">
                <h3>Monthly Rent Estimate</h3>
              </div>
              <div className="card-content">
                <div className="main-value">{formatCurrency(analysisData.rentEstimate?.rent)}</div>
                {analysisData.rentEstimate?.rentRangeLow && analysisData.rentEstimate?.rentRangeHigh && (
                  <div className="value-range">
                    Range: {formatCurrency(analysisData.rentEstimate.rentRangeLow)} - {formatCurrency(analysisData.rentEstimate.rentRangeHigh)}
                  </div>
                )}
                {analysisData.rentEstimate?.rent && analysisData.subjectProperty?.sqft && (
                  <div className="price-per-sqft">
                    {formatCurrency(Math.round(analysisData.rentEstimate.rent / analysisData.subjectProperty.sqft))} per sq ft
                  </div>
                )}
              </div>
            </div>

            <div className="valuation-card">
              <div className="card-header">
                <h3>Investment Metrics</h3>
              </div>
              <div className="card-content">
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Annual Rent</span>
                    <span className="detail-value">{formatCurrency((analysisData.rentEstimate?.rent || 0) * 12)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Rental Comparables</span>
                    <span className="detail-value">{analysisData.rentEstimate?.comparables?.length || 0}</span>
                  </div>
                  {analysisData.valuation?.estimatedValue && analysisData.rentEstimate?.rent && (
                    <div className="detail-item">
                      <span className="detail-label">Gross Yield</span>
                      <span className="detail-value">
                        {((analysisData.rentEstimate.rent * 12 / analysisData.valuation.estimatedValue) * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comparables Tab */}
      {activeTab === 'comps' && (
        <div className="analysis-content">
          <div className="analysis-header">
            <h2>Comparable Properties</h2>
            <p>Recently sold properties with similar characteristics</p>
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
                  <span className="stat-value">{analysisData.subjectProperty.sqft?.toLocaleString()}</span>
                </div>
                <div className="subject-stat">
                  <span className="stat-label">Year Built</span>
                  <span className="stat-value">{analysisData.subjectProperty.yearBuilt}</span>
                </div>
              </div>
            </div>
          )}

          <div className="comps-grid">
            {analysisData.valuation?.comparables?.length > 0 ? (
              analysisData.valuation.comparables.map((comp, index) => (
                <div key={index} className="comp-card">
                  <div className="comp-header">
                    <h4>{comp.formattedAddress}</h4>
                    <div className="comp-distance">{comp.distance} mi</div>
                  </div>
                  
                  <div className="comp-price">
                    <div className="price-main">{formatCurrency(comp.price)}</div>
                    {comp.priceDifference && (
                      <div className={`price-difference ${comp.priceDifference > 0 ? 'positive' : 'negative'}`}>
                        {comp.priceDifference > 0 ? '+' : ''}{formatCurrency(comp.priceDifference)}
                        <span className="price-percent">({comp.priceDifferencePercent}%)</span>
                      </div>
                    )}
                  </div>

                  <div className="comp-specs">
                    <div className="spec-item">
                      <span className="spec-label">Beds/Baths</span>
                      <span className="spec-value">{comp.beds}/{comp.baths}</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-label">Square Feet</span>
                      <span className="spec-value">{comp.sqft?.toLocaleString()}</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-label">Price/Sq Ft</span>
                      <span className="spec-value">{formatCurrency(comp.pricePerSqFt)}</span>
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
              ))
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
      )}
    </div>
  );
};

export default Analysis; 