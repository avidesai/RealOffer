// Analysis.js

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../../../../../../context/AuthContext';
import TabPaywall from '../../../../../../../components/TabPaywall/TabPaywall';
import { hasPremiumAccess } from '../../../../../../../utils/trialUtils';
import './Analysis.css';
import RenovationEstimate from '../../../../../../../components/RenovationEstimate/RenovationEstimate';

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
  const [editingValue, setEditingValue] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [savingValue, setSavingValue] = useState(false);
  const [editingRent, setEditingRent] = useState(false);
  const [editRent, setEditRent] = useState('');
  const [savingRent, setSavingRent] = useState(false);
  
  // Pagination state for comparables
  const [currentPage, setCurrentPage] = useState(0);
  const COMPARABLES_PER_PAGE = 3;

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

  const handleEditValue = () => {
    const currentValue = analysisData.valuation?.estimatedValue || 0;
    setEditValue(formatCurrencyInput(currentValue));
    setEditingValue(true);
  };

  const formatCurrencyInput = (value) => {
    if (!value) return '';
    return '$' + value.toLocaleString('en-US');
  };

  const handleSaveValue = async () => {
    // Remove dollar sign and commas, then convert to number
    const numericValue = parseFloat(editValue.replace(/[$,]/g, ''));
    if (!editValue || isNaN(numericValue) || numericValue <= 0) {
      return;
    }

    try {
      setSavingValue(true);
      const response = await axios.put(
        `${process.env.REACT_APP_BACKEND_URL}/api/property-analysis/${listingId}/custom-value`,
        {
          customValue: numericValue
        },
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

      setEditingValue(false);
      setEditValue('');
    } catch (err) {
      console.error('Error saving custom value:', err);
      setError('Failed to save custom value. Please try again.');
    } finally {
      setSavingValue(false);
    }
  };

  const handleRevertValue = async () => {
    try {
      setSavingValue(true);
      const response = await axios.put(
        `${process.env.REACT_APP_BACKEND_URL}/api/property-analysis/${listingId}/custom-value`,
        {
          revertToOriginal: true
        },
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

      setEditingValue(false);
      setEditValue('');
    } catch (err) {
      console.error('Error reverting value:', err);
      setError('Failed to revert value. Please try again.');
    } finally {
      setSavingValue(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingValue(false);
    setEditValue('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSaveValue();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleInputChange = (e) => {
    let value = e.target.value;
    
    // Remove all non-numeric characters except dollar sign and commas
    value = value.replace(/[^\d$,]/g, '');
    
    // Remove leading dollar signs (keep only the first one)
    value = value.replace(/^\$+/, '$');
    
    // If no dollar sign at the beginning, add one
    if (!value.startsWith('$')) {
      value = '$' + value;
    }
    
    // Remove all commas first
    value = value.replace(/,/g, '');
    
    // Remove the dollar sign temporarily for processing
    const numericPart = value.substring(1);
    
    // Add commas in the correct positions
    if (numericPart.length > 0) {
      const formattedNumeric = numericPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      value = '$' + formattedNumeric;
    }
    
    setEditValue(value);
  };

  // Rent editing functions
  const handleEditRent = () => {
    const currentRent = analysisData.rentEstimate?.rent || 0;
    setEditRent(formatCurrencyInput(currentRent));
    setEditingRent(true);
  };

  const handleSaveRent = async () => {
    // Remove dollar sign and commas, then convert to number
    const numericRent = parseFloat(editRent.replace(/[$,]/g, ''));
    if (!editRent || isNaN(numericRent) || numericRent <= 0) {
      return;
    }

    try {
      setSavingRent(true);
      const response = await axios.put(
        `${process.env.REACT_APP_BACKEND_URL}/api/property-analysis/${listingId}/custom-rent`,
        {
          customRent: numericRent
        },
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

      setEditingRent(false);
      setEditRent('');
    } catch (err) {
      console.error('Error saving custom rent:', err);
      setError('Failed to save custom rent. Please try again.');
    } finally {
      setSavingRent(false);
    }
  };

  const handleRevertRent = async () => {
    try {
      setSavingRent(true);
      const response = await axios.put(
        `${process.env.REACT_APP_BACKEND_URL}/api/property-analysis/${listingId}/custom-rent`,
        {
          revertToOriginal: true
        },
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

      setEditingRent(false);
      setEditRent('');
    } catch (err) {
      console.error('Error reverting rent:', err);
      setError('Failed to revert rent. Please try again.');
    } finally {
      setSavingRent(false);
    }
  };

  const handleCancelRentEdit = () => {
    setEditingRent(false);
    setEditRent('');
  };

  const handleRentKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSaveRent();
    } else if (e.key === 'Escape') {
      handleCancelRentEdit();
    }
  };

  const handleRentInputChange = (e) => {
    let value = e.target.value;
    
    // Remove all non-numeric characters except dollar sign and commas
    value = value.replace(/[^\d$,]/g, '');
    
    // Remove leading dollar signs (keep only the first one)
    value = value.replace(/^\$+/, '$');
    
    // If no dollar sign at the beginning, add one
    if (!value.startsWith('$')) {
      value = '$' + value;
    }
    
    // Remove all commas first
    value = value.replace(/,/g, '');
    
    // Remove the dollar sign temporarily for processing
    const numericPart = value.substring(1);
    
    // Add commas in the correct positions
    if (numericPart.length > 0) {
      const formattedNumeric = numericPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      value = '$' + formattedNumeric;
    }
    
    setEditRent(value);
  };

  // Pagination functions for comparables
  const totalPages = Math.ceil((analysisData.valuation?.comparables?.length || 0) / COMPARABLES_PER_PAGE);
  
  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  };
  
  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));
  };
  
  const handlePageClick = (pageIndex) => {
    setCurrentPage(pageIndex);
  };
  
  const getCurrentComparables = () => {
    if (!analysisData.valuation?.comparables) return [];
    const startIndex = currentPage * COMPARABLES_PER_PAGE;
    return analysisData.valuation.comparables.slice(startIndex, startIndex + COMPARABLES_PER_PAGE);
  };

  if (loading) {
    return (
      <div className="analysis-tab">
        <div className="analysis-loading">
          <div className="spinner"></div>
          <p>Loading analysis</p>
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

  // Check if user has premium access (paid or trial) - if not, show paywall
  if (!hasPremiumAccess(user)) {
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
              </div>
            </div>
            <div className="card-content">
              <div className="value-sections">
                <div className="value-section">
                  <div className="main-value">
                    {editingValue ? (
                      <div className="value-edit-container">
                        <input
                          type="text"
                          value={editValue}
                          onChange={handleInputChange}
                          onKeyDown={handleKeyPress}
                          className="value-edit-input"
                          placeholder="Enter value"
                          autoFocus
                        />
                        <div className="value-edit-actions">
                          <button
                            onClick={handleSaveValue}
                            disabled={savingValue || !editValue || isNaN(parseFloat(editValue.replace(/[$,]/g, ''))) || parseFloat(editValue.replace(/[$,]/g, '')) <= 0}
                            className="value-edit-save"
                          >
                            {savingValue ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            disabled={savingValue}
                            className="value-edit-cancel"
                          >
                            Cancel
                          </button>
                          {analysisData.valuation?.isCustomValue && (
                            <button
                              onClick={handleRevertValue}
                              disabled={savingValue}
                              className="value-revert-button"
                              title="Revert to original API value"
                            >
                              Reset Value
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="value-display-container">
                        {formatCurrency(analysisData.valuation?.estimatedValue)}
                        <button
                          onClick={handleEditValue}
                          className="value-edit-button"
                          title="Edit property value"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M18.5 2.50023C18.8978 2.10243 19.4374 1.87891 20 1.87891C20.5626 1.87891 21.1022 2.10243 21.5 2.50023C21.8978 2.89804 22.1213 3.43762 22.1213 4.00023C22.1213 4.56284 21.8978 5.10243 21.5 5.50023L12 15.0002L8 16.0002L9 12.0002L18.5 2.50023Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </div>
                    )}
                    <div className="value-label">
                      Estimated Property Value
                      {analysisData.valuation?.isCustomValue && (
                        <div className="info-tooltip-container">
                          <svg 
                            className="info-icon" 
                            width="16" 
                            height="16" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                            <path d="M12 16V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M12 8H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <div className="info-tooltip">
                            This is a custom valuation set by the listing agent
                          </div>
                        </div>
                      )}
                    </div>
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
                    {editingRent ? (
                      <div className="value-edit-container">
                        <input
                          type="text"
                          value={editRent}
                          onChange={handleRentInputChange}
                          onKeyDown={handleRentKeyPress}
                          className="value-edit-input"
                          placeholder="Enter rent"
                          autoFocus
                        />
                        <div className="value-edit-actions">
                          <button
                            onClick={handleSaveRent}
                            disabled={savingRent || !editRent || isNaN(parseFloat(editRent.replace(/[$,]/g, ''))) || parseFloat(editRent.replace(/[$,]/g, '')) <= 0}
                            className="value-edit-save"
                          >
                            {savingRent ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={handleCancelRentEdit}
                            disabled={savingRent}
                            className="value-edit-cancel"
                          >
                            Cancel
                          </button>
                          {analysisData.rentEstimate?.isCustomRent && (
                            <button
                              onClick={handleRevertRent}
                              disabled={savingRent}
                              className="value-revert-button"
                              title="Revert to original API rent"
                            >
                              Reset Rent
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="value-display-container">
                        {formatCurrency(analysisData.rentEstimate?.rent)}
                        <button
                          onClick={handleEditRent}
                          className="value-edit-button"
                          title="Edit rent estimate"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M18.5 2.50023C18.8978 2.10243 19.4374 1.87891 20 1.87891C20.5626 1.87891 21.1022 2.10243 21.5 2.50023C21.8978 2.89804 22.1213 3.43762 22.1213 4.00023C22.1213 4.56284 21.8978 5.10243 21.5 5.50023L12 15.0002L8 16.0002L9 12.0002L18.5 2.50023Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </div>
                    )}
                    <div className="value-label">
                      Estimated Monthly Rent
                      {analysisData.rentEstimate?.isCustomRent && (
                        <div className="info-tooltip-container">
                          <svg 
                            className="info-icon" 
                            width="16" 
                            height="16" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                            <path d="M12 16V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M12 8H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <div className="info-tooltip">
                            This is a custom rent estimate set by the listing agent
                          </div>
                        </div>
                      )}
                    </div>
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
          <div className="comparable-sales-header">
            <h3>Comparable Sales</h3>
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="comps-pagination">
                <button 
                  className="pagination-arrow prev" 
                  onClick={handlePreviousPage}
                  disabled={currentPage === 0}
                  aria-label="Previous page"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                
                <div className="pagination-dots">
                  {Array.from({ length: totalPages }, (_, index) => (
                    <button
                      key={index}
                      className={`pagination-dot ${currentPage === index ? 'active' : ''}`}
                      onClick={() => handlePageClick(index)}
                      aria-label={`Go to page ${index + 1}`}
                    />
                  ))}
                </div>
                
                <button 
                  className="pagination-arrow next" 
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages - 1}
                  aria-label="Next page"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            )}
          </div>
          {analysisData.valuation?.comparables?.length > 0 ? (
            <>
              <div className="comps-grid">
                {getCurrentComparables().map((comp, index) => (
                  <div key={index} className="comp-card">
                    <div className="comp-header">
                      <h4>{comp.formattedAddress}</h4>
                      <div className="comp-distance">{Number(comp.distance).toFixed(2)} mi</div>
                    </div>
                    
                    <div className="comp-price">
                      <div className="price-main">
                        {formatCurrency(comp.displayPrice || comp.price)}
                        {comp.soldPrice && (
                          <span className="price-type-indicator">Sold</span>
                        )}
                      </div>
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
                          {(comp.displayPrice || comp.price) && comp.sqft
                            ? formatCurrency(Math.round((comp.displayPrice || comp.price) / comp.sqft))
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
            </>
          ) : (
            <div className="no-comps">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 12H15M9 16H15M17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H12.5858C12.851 3 13.1054 3.10536 13.2929 3.29289L19.7071 9.70711C19.8946 9.89464 20 10.149 20 10.4142V19C20 20.1046 19.1046 21 18 21H17Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p>No sold comparable properties found</p>
            </div>
          )}
        </div>

        {/* Renovation Estimate Section */}
        <RenovationEstimate propertyId={listingId} />
      </div>
    </div>
  );
};

export default Analysis;