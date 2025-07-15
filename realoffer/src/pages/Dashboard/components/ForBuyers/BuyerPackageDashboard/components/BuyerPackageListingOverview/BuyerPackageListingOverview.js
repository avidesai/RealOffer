// BuyerPackageListingOverview.js

import React, { useEffect, useState } from 'react';
import api from '../../../../../../../context/api';
import BuyerPackageMoreInfo from './components/BuyerPackageMoreInfo/BuyerPackageMoreInfo';
import ListingPhotoGallery from './components/ListingPhotoGallery/ListingPhotoGallery';
import './BuyerPackageListingOverview.css';

function BuyerPackageListingOverview({ buyerPackage }) {
  const [agents, setAgents] = useState([]);
  const [showMoreInfo, setShowMoreInfo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentListing, setCurrentListing] = useState(buyerPackage.propertyListing);
  const [showGallery, setShowGallery] = useState(false);

  // Ensure listing has all required structures
  useEffect(() => {
    if (buyerPackage.propertyListing) {
      // Create a normalized copy of the listing with all required fields
      const normalizedListing = { ...buyerPackage.propertyListing };
      
      // Ensure escrow data exists
      if (!normalizedListing.escrowInfo) {
        normalizedListing.escrowInfo = { 
          escrowNumber: '', 
          company: { name: '', phone: '', email: '' } 
        };
      } else if (!normalizedListing.escrowInfo.company) {
        normalizedListing.escrowInfo.company = { name: '', phone: '', email: '' };
      }
      
      setCurrentListing(normalizedListing);
    }
  }, [buyerPackage.propertyListing]);

  useEffect(() => {
    const fetchAgents = async () => {
      if (currentListing && currentListing.agentIds && currentListing.agentIds.length > 0) {
        setLoading(true);
        try {
          const agentDetails = await Promise.all(
            currentListing.agentIds.map(async (id) => {
              const response = await api.get(`/users/${id}`);
              return response.data;
            })
          );
          setAgents(agentDetails);
        } catch (error) {
          console.error('Error fetching agents:', error);
        }
        setLoading(false);
      }
    };

    fetchAgents();
  }, [currentListing]);

  const handleRefreshListing = async () => {
    try {
      const response = await api.get(`/propertyListings/${currentListing._id}`);
      setCurrentListing(response.data);
    } catch (error) {
      console.error('Error refreshing listing:', error);
    }
  };

  const handleGalleryClose = () => {
    setShowGallery(false);
    handleRefreshListing();
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatNumber = (num) => {
    return num?.toLocaleString() || '-';
  };

  const getPropertyTypeText = (value) => {
    const propertyTypes = {
      singleFamily: 'Single Family',
      condo: 'Condominium',
      townhouse: 'Townhouse',
      multiFamily: 'Multi Family',
      land: 'Land',
      commercial: 'Commercial',
    };
    return propertyTypes[value] || 'Unknown Property Type';
  };

  if (!currentListing) {
    return <div>Loading...</div>;
  }

  return (
    <div className="buyer-package-listing-overview">
      <div className="buyer-package-listing-header">
        <div className="buyer-package-listing-title-section">
          <h1 className="buyer-package-listing-title">
            {currentListing.homeCharacteristics.address}
          </h1>
          <p className="buyer-package-listing-location">
            {currentListing.homeCharacteristics.city}, {currentListing.homeCharacteristics.state} {currentListing.homeCharacteristics.zip}
          </p>
        </div>
        <div className="buyer-package-listing-price">
          {formatPrice(currentListing.homeCharacteristics.price)}
        </div>
      </div>

      <div className="buyer-package-listing-content">
        <div className="buyer-package-listing-main">
          <div className="buyer-package-listing-gallery">
            {currentListing.imagesUrls && currentListing.imagesUrls.length > 0 ? (
              <div className="buyer-package-listing-gallery-container">
                <img
                  src={currentListing.imagesUrls[0]}
                  alt="Property"
                  className="buyer-package-listing-main-image"
                  onClick={() => setShowGallery(true)}
                />
                <button 
                  className="buyer-package-listing-gallery-button"
                  onClick={() => setShowGallery(true)}
                >
                  View All Photos ({currentListing.imagesUrls.length})
                </button>
              </div>
            ) : (
              <div className="buyer-package-listing-no-image">
                <p>No images available</p>
              </div>
            )}
          </div>

          <div className="buyer-package-listing-details">
            <div className="buyer-package-listing-details-grid">
              <div className="buyer-package-listing-detail-item">
                <span className="buyer-package-listing-detail-label">Bedrooms</span>
                <span className="buyer-package-listing-detail-value">{currentListing.homeCharacteristics.beds}</span>
              </div>
              <div className="buyer-package-listing-detail-item">
                <span className="buyer-package-listing-detail-label">Bathrooms</span>
                <span className="buyer-package-listing-detail-value">{currentListing.homeCharacteristics.baths}</span>
              </div>
              <div className="buyer-package-listing-detail-item">
                <span className="buyer-package-listing-detail-label">Square Feet</span>
                <span className="buyer-package-listing-detail-value">{formatNumber(currentListing.homeCharacteristics.squareFootage)}</span>
              </div>
              <div className="buyer-package-listing-detail-item">
                <span className="buyer-package-listing-detail-label">Lot Size</span>
                <span className="buyer-package-listing-detail-value">{formatNumber(currentListing.homeCharacteristics.lotSize)}</span>
              </div>
              <div className="buyer-package-listing-detail-item">
                <span className="buyer-package-listing-detail-label">Year Built</span>
                <span className="buyer-package-listing-detail-value">{currentListing.homeCharacteristics.yearBuilt || '-'}</span>
              </div>
              <div className="buyer-package-listing-detail-item">
                <span className="buyer-package-listing-detail-label">Type</span>
                <span className="buyer-package-listing-detail-value">{getPropertyTypeText(currentListing.homeCharacteristics.propertyType)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="buyer-package-listing-sidebar">
          <div className="buyer-package-listing-agents">
            <h3>Listing Agents</h3>
            {loading ? (
              <p>Loading agents...</p>
            ) : agents.length > 0 ? (
              <div className="buyer-package-listing-agents-list">
                {agents.map(agent => (
                  <div key={agent._id} className="buyer-package-listing-agent">
                    <img 
                      src={agent.profilePhotoUrl} 
                      alt={`${agent.firstName} ${agent.lastName}`} 
                      className="buyer-package-listing-agent-image" 
                    />
                    <div className="buyer-package-listing-agent-info">
                      <p className="buyer-package-listing-agent-name">{agent.firstName} {agent.lastName}</p>
                      {agent.agencyName && <p className="buyer-package-listing-agent-agency">{agent.agencyName}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>No agents assigned</p>
            )}
          </div>

          <div className="buyer-package-listing-actions">
            <button 
              className="buyer-package-listing-more-info-btn"
              onClick={() => setShowMoreInfo(true)}
            >
              More Information
            </button>
          </div>
        </div>
      </div>

      {showMoreInfo && (
        <BuyerPackageMoreInfo 
          listing={currentListing} 
          onClose={() => setShowMoreInfo(false)} 
        />
      )}

      {showGallery && (
        <ListingPhotoGallery 
          images={currentListing.imagesUrls} 
          onClose={handleGalleryClose}
          listingId={currentListing._id}
        />
      )}
    </div>
  );
}

export default BuyerPackageListingOverview; 