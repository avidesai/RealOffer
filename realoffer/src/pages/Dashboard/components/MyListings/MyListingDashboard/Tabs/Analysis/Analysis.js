import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../../../../../context/AuthContextsgi';
import './Analysis.css';

const Analysis = ({ listingId }) => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [valuation, setValuation] = useState(null);
  const [comps, setComps] = useState([]);
  const [subjectProperty, setSubjectProperty] = useState(null);

  useEffect(() => {
    const fetchAnalysisData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch property valuation
        const valuationResponse = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}/api/property-analysis/valuation/${listingId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        setValuation(valuationResponse.data);

        // Fetch comparable properties
        const compsResponse = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}/api/property-analysis/comps/${listingId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        setComps(compsResponse.data.comps);
        setSubjectProperty(compsResponse.data.subjectProperty);
      } catch (err) {
        setError('Failed to load analysis data. Please try again later.');
        console.error('Error fetching analysis data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysisData();
  }, [listingId, token]);

  const formatCurrency = (value) => {
    return value?.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  const formatPercent = (value) => {
    return `${value}%`;
  };

  if (loading) {
    return (
      <div className="analysis-loading">
        <div className="spinner"></div>
        <p>Loading analysis data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analysis-error">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="analysis-tab">
      {/* Property Valuation Section */}
      <section className="analysis-section valuation">
        <h2>Property Valuation</h2>
        <div className="valuation-content">
          <div className="valuation-main">
            <div className="valuation-price">
              <h3>Estimated Value</h3>
              <div className="price">{formatCurrency(valuation?.estimatedValue)}</div>
              <div className="price-per-sqft">
                {formatCurrency(valuation?.pricePerSqFt)}/sq ft
              </div>
              {valuation?.confidenceScore && (
                <div className="confidence-score">
                  Confidence Score: {valuation.confidenceScore}
                </div>
              )}
            </div>
            <div className="valuation-details">
              <div className="detail-item">
                <span>Last Sale Price</span>
                <span>{formatCurrency(valuation?.lastSalePrice)}</span>
              </div>
              <div className="detail-item">
                <span>Last Sale Date</span>
                <span>{valuation?.lastSaleDate || 'N/A'}</span>
              </div>
              {valuation?.marketValue && (
                <div className="detail-item">
                  <span>Market Value</span>
                  <span>{formatCurrency(valuation.marketValue)}</span>
                </div>
              )}
              {valuation?.rentEstimate && (
                <div className="detail-item">
                  <span>Rent Estimate</span>
                  <span>{formatCurrency(valuation.rentEstimate)}/month</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Comparable Properties Section */}
      <section className="analysis-section comps">
        <h2>Comparable Properties</h2>
        {subjectProperty && (
          <div className="subject-property">
            <h3>Subject Property</h3>
            <div className="subject-details">
              <div className="detail-item">
                <span>Price</span>
                <span>{formatCurrency(subjectProperty.price)}</span>
              </div>
              <div className="detail-item">
                <span>Beds/Baths</span>
                <span>{subjectProperty.beds}/{subjectProperty.baths}</span>
              </div>
              <div className="detail-item">
                <span>Square Feet</span>
                <span>{subjectProperty.sqft?.toLocaleString()}</span>
              </div>
              <div className="detail-item">
                <span>Year Built</span>
                <span>{subjectProperty.yearBuilt}</span>
              </div>
            </div>
          </div>
        )}
        <div className="comps-grid">
          {comps.map((comp, index) => (
            <div key={index} className="comp-card">
              <div className="comp-image">
                {comp.imageUrl ? (
                  <img src={comp.imageUrl} alt={comp.address} />
                ) : (
                  <div className="no-image">No Image Available</div>
                )}
              </div>
              <div className="comp-details">
                <h4>{comp.address}</h4>
                <div className="comp-price">
                  {formatCurrency(comp.price)}
                  {comp.priceDifference && (
                    <span className={`price-difference ${comp.priceDifference > 0 ? 'positive' : 'negative'}`}>
                      {comp.priceDifference > 0 ? '+' : ''}{formatCurrency(comp.priceDifference)}
                      {' '}({comp.priceDifferencePercent}%)
                    </span>
                  )}
                </div>
                <div className="comp-specs">
                  <span>{comp.beds} beds</span>
                  <span>{comp.baths} baths</span>
                  <span>{comp.sqft?.toLocaleString()} sqft</span>
                </div>
                <div className="comp-additional">
                  <div className="comp-detail">
                    <span>Price/sqft:</span>
                    <span>{formatCurrency(comp.pricePerSqFt)}</span>
                  </div>
                  <div className="comp-detail">
                    <span>Year Built:</span>
                    <span>{comp.yearBuilt}</span>
                  </div>
                  <div className="comp-detail">
                    <span>Distance:</span>
                    <span>{comp.distance} miles</span>
                  </div>
                  {comp.lastSaleDate && (
                    <div className="comp-detail">
                      <span>Last Sale:</span>
                      <span>{comp.lastSaleDate}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Analysis; 