// ListingOverview.js

import React, { useEffect, useState } from 'react';
import api from '../../../../../../../context/api';
import Avatar from '../../../../../../../components/Avatar/Avatar';
import MoreInfo from './components/MoreInfo/MoreInfo';
import ListingPhotoGallery from './components/ListingPhotoGallery/ListingPhotoGallery';
import ShareUrl from './components/ShareUrl/ShareUrl'; // Import ShareUrl component
import OfferDueReminder from '../../../../../../../components/OfferDueReminder/OfferDueReminder';
import './ListingOverview.css';

function ListingOverview({ listing }) {
  const [agents, setAgents] = useState([]);
  const [showMoreInfo, setShowMoreInfo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentListing, setCurrentListing] = useState(listing);
  const [showGallery, setShowGallery] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false); // State for ShareUrl modal

  // Ensure listing has all required structures
  useEffect(() => {
    if (listing) {
      // Create a normalized copy of the listing with all required fields
      const normalizedListing = { ...listing };
      
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
  }, [listing]);

  useEffect(() => {
    const fetchAgentDetails = async () => {
      if (!currentListing || !currentListing.agentIds || !currentListing.agentIds.length) {
        return;
      }
      
      try {
        const agentDetails = await Promise.all(
          currentListing.agentIds.map(async (id) => {
            const response = await api.get(`/api/users/${id}`);
            return response.data;
          })
        );
        setAgents(agentDetails);
      } catch (error) {
        console.error('Error fetching agent details:', error);
      }
    };
    
    fetchAgentDetails();
  }, [currentListing]);

  const handleRefreshListing = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/propertyListings/${currentListing._id}`);
      
      // Ensure escrow data exists in the refreshed listing
      const refreshedListing = response.data;
      if (!refreshedListing.escrowInfo) {
        refreshedListing.escrowInfo = { 
          escrowNumber: '', 
          company: { name: '', phone: '', email: '' } 
        };
      } else if (!refreshedListing.escrowInfo.company) {
        refreshedListing.escrowInfo.company = { name: '', phone: '', email: '' };
      }
      
      setCurrentListing(refreshedListing);
    } catch (error) {
      console.error('Error refreshing listing:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGalleryClose = async (hasPhotoChanges = false) => {
    setShowGallery(false);
    // Only refresh if photos were actually reordered
    if (hasPhotoChanges) {
      await handleRefreshListing();
    }
  };

  const formatPrice = (price) => {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  // Guard against rendering before currentListing is properly initialized
  if (!currentListing) {
    return (
      <div className="listing-overview">
        <div className="listing-overview-spinner-overlay">
          <div className="listing-overview-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="listing-overview">
      {loading && (
        <div className="listing-overview-spinner-overlay">
          <div className="listing-overview-spinner"></div>
        </div>
      )}
      <div className={`listing-content ${loading ? 'blurred' : ''}`}>
        <div className="overview-header">
          <div className="overview-image" onClick={() => setShowGallery(true)}>
            {currentListing.imagesUrls && currentListing.imagesUrls.length > 0 ? (
              <img 
                src={currentListing.imagesUrls[0]} 
                alt="Property" 
                className="property-image" 
              />
            ) : (
              <div className="property-image-placeholder">
                <div className="placeholder-icon">📷</div>
                <div className="placeholder-text">No Photos</div>
                <div className="placeholder-hint">Click to add photos</div>
              </div>
            )}
          </div>
          <div className="overview-details">
            <h1 className="property-address">{currentListing.homeCharacteristics.address}</h1>
            <p className="property-location">{currentListing.homeCharacteristics.city}, {currentListing.homeCharacteristics.state} {currentListing.homeCharacteristics.zip}</p>
            <p className="property-price">${formatPrice(currentListing.homeCharacteristics.price)}<span className='space'>•</span>{currentListing.homeCharacteristics.beds} Bed, {currentListing.homeCharacteristics.baths} Bath</p>
            <div className={`overview-buttons ${!currentListing.scheduleShowingUrl ? 'three-buttons' : ''}`}>
              <button className="overview-btn-share-package" onClick={() => setShowShareModal(true)}>Share</button>
              <button className="overview-btn" onClick={() => setShowGallery(true)}>Images</button>
              {currentListing.scheduleShowingUrl && (
                <button 
                  className="overview-btn" 
                  onClick={() => window.open(currentListing.scheduleShowingUrl, '_blank')}
                >
                  Showings
                </button>
              )}
              <button className="overview-btn" onClick={() => setShowMoreInfo(true)}>More Info</button>
            </div>
          </div>
          <div className="overview-right-section">
            <OfferDueReminder offerDueDate={currentListing.offerDueDate} />
            <div className={`overview-agents ${agents.length > 1 ? 'multiple-agents' : ''}`}>
              {agents.map(agent => (
                <div key={agent._id} className="listing-overview-agent-info">
                  <Avatar 
                    src={agent.profilePhotoUrl}
                    firstName={agent.firstName}
                    lastName={agent.lastName}
                    size={agents.length > 1 ? "compact" : "small"}
                    className="listing-overview-agent-image"
                    alt={`${agent.firstName} ${agent.lastName}`}
                  />
                  <p>{agent.firstName} {agent.lastName}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        {showMoreInfo && (
          <MoreInfo
            isOpen={showMoreInfo}
            onClose={(hasChanges) => {
              setShowMoreInfo(false);
              if (hasChanges) {
                handleRefreshListing();
              }
            }}
            listingId={currentListing._id}
          />
        )}
        {showGallery && (
          <ListingPhotoGallery
            images={currentListing.imagesUrls || []}
            onClose={handleGalleryClose}
            listingId={currentListing._id}
          />
        )}
        {showShareModal && (
          <ShareUrl
            isOpen={showShareModal}
            onClose={() => setShowShareModal(false)}
            url={currentListing.publicUrl}
            listingId={currentListing._id}
          />
        )}
      </div>
    </div>
  );
}

export default ListingOverview;
