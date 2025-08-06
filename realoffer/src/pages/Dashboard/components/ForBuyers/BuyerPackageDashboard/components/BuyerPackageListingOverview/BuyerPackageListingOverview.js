// BuyerPackageListingOverview.js

import React, { useEffect, useState } from 'react';
import api from '../../../../../../../context/api';
import Avatar from '../../../../../../../components/Avatar/Avatar';
import AgencyLogo from '../../../../../../../components/AgencyLogo/AgencyLogo';
import BuyerPackageMoreInfo from './components/BuyerPackageMoreInfo/BuyerPackageMoreInfo';
import ListingPhotoGallery from './components/ListingPhotoGallery/ListingPhotoGallery';
import ShareUrl from './components/ShareUrl/ShareUrl'; // Import ShareUrl component
import OfferDueReminder from '../../../../../../../components/OfferDueReminder/OfferDueReminder';
import PropertyChat from '../../../../../../../components/PropertyChat/PropertyChat';
import basePhoto from '../../../../../../../assets/images/basephoto.png';
import './BuyerPackageListingOverview.css';

function BuyerPackageListingOverview({ buyerPackage }) {
  const [agents, setAgents] = useState([]);
  const [showMoreInfo, setShowMoreInfo] = useState(false);
  const [loading] = useState(false);
  const [currentListing, setCurrentListing] = useState(buyerPackage.propertyListing);
  const [showGallery, setShowGallery] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false); // State for ShareUrl modal
  const [showChatModal, setShowChatModal] = useState(false); // State for chat modal

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
    const fetchAgentDetails = async () => {
      if (!currentListing || !currentListing.agentIds || !currentListing.agentIds.length) {
        return;
      }
      
      try {
        // Check if agentIds are already populated objects or just IDs
        const isPopulated = currentListing.agentIds.length > 0 && typeof currentListing.agentIds[0] === 'object' && currentListing.agentIds[0]._id;
        
        let agentDetails;
        if (isPopulated) {
          // agentIds are already populated user objects
          agentDetails = currentListing.agentIds;
        } else {
          // agentIds are just IDs, need to fetch user objects
          agentDetails = await Promise.all(
            currentListing.agentIds.map(async (id) => {
              const response = await api.get(`/api/users/${id}`);
              return response.data;
            })
          );
        }
        setAgents(agentDetails);
      } catch (error) {
        console.error('Error fetching agent details:', error);
      }
    };
    
    fetchAgentDetails();
  }, [currentListing]);



  const handleGalleryClose = (hasPhotoChanges = false) => {
    setShowGallery(false);
    // No need to refresh since buyers can't reorder photos
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
            <img 
              src={currentListing.imagesUrls && currentListing.imagesUrls.length > 0 
                ? currentListing.imagesUrls[0] 
                : basePhoto} 
              alt="Property" 
              className="property-image" 
            />
          </div>
          <div className="overview-details">
            <h1 className="property-address">{currentListing.homeCharacteristics.address}</h1>
            <p className="property-location">{currentListing.homeCharacteristics.city}, {currentListing.homeCharacteristics.state} {currentListing.homeCharacteristics.zip}</p>
            <p className="property-price">${formatPrice(currentListing.homeCharacteristics.price)}<span className='space'>•</span>{currentListing.homeCharacteristics.beds} Bed, {currentListing.homeCharacteristics.baths} Bath</p>
            <div className={`overview-buttons ${!currentListing.scheduleShowingUrl ? 'three-buttons' : ''}`}>
              <button className="overview-btn-share-package" onClick={() => setShowShareModal(true)}>Share</button>
              <button className="ask-questions-btn" onClick={() => setShowChatModal(true)}>Ask Questions</button>
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
                  <div className="agent-details">
                    <p className="agent-name">{agent.firstName} {agent.lastName}</p>
                    {agent.agencyName && (
                      <div className="agency-info">
                        <AgencyLogo 
                          src={agent.agencyImage}
                          alt={agent.agencyName}
                          size="small"
                          fit={agent.logoFit || 'contain'}
                          className="agent-agency-logo"
                        />
                        <span className="agency-name">{agent.agencyName}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {showMoreInfo && (
          <BuyerPackageMoreInfo
            buyerPackage={buyerPackage}
            onClose={() => {
              setShowMoreInfo(false);
            }}
          />
        )}
        {showGallery && currentListing.imagesUrls && currentListing.imagesUrls.length > 0 && (
          <ListingPhotoGallery
            images={currentListing.imagesUrls}
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
        {showChatModal && (
          <PropertyChat 
            propertyId={currentListing._id}
            onClose={() => setShowChatModal(false)}
            isOpen={showChatModal}
          />
        )}
      </div>
    </div>
  );
}

export default BuyerPackageListingOverview; 