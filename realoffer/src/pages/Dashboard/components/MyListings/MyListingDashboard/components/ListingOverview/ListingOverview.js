// ListingOverview.js

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../../../../../context/AuthContext';  // Import useAuth hook
import axios from 'axios';
import MoreInfo from './components/MoreInfo/MoreInfo';
import ListingPhotoGallery from './components/ListingPhotoGallery/ListingPhotoGallery';
import './ListingOverview.css';

function ListingOverview({ listing }) {
  const { token } = useAuth();  // Get the token from AuthContext
  const [agents, setAgents] = useState([]);
  const [showMoreInfo, setShowMoreInfo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentListing, setCurrentListing] = useState(listing);
  const [showGallery, setShowGallery] = useState(false);

  useEffect(() => {
    const fetchAgentDetails = async () => {
      try {
        const agentDetails = await Promise.all(
          currentListing.agentIds.map(async (id) => {
            const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/users/${id}`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            return response.data;
          })
        );
        setAgents(agentDetails);
      } catch (error) {
        console.error('Error fetching agent details:', error);
      }
    };
    fetchAgentDetails();
  }, [currentListing.agentIds, token]);

  const handleRefreshListing = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/propertyListings/${currentListing._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setCurrentListing(response.data);
    } catch (error) {
      console.error('Error refreshing listing:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

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
            <img src={currentListing.imagesUrls[0]} alt="Property" className="property-image" />
          </div>
          <div className="overview-details">
            <h1 className="property-address">{currentListing.homeCharacteristics.address}</h1>
            <p className="property-location">{currentListing.homeCharacteristics.city}, {currentListing.homeCharacteristics.state} {currentListing.homeCharacteristics.zip}</p>
            <p className="property-price">${formatPrice(currentListing.homeCharacteristics.price)}<span className='space'>•</span>{currentListing.homeCharacteristics.beds} Bed, {currentListing.homeCharacteristics.baths} Bath</p>
            <div className="overview-buttons">
              <button className="overview-btn-share-package">Share</button>
              <button className="overview-btn" onClick={() => setShowGallery(true)}>Images</button>
              <button className="overview-btn" onClick={() => setShowMoreInfo(true)}>More Info</button>
            </div>
          </div>
          <div className="overview-agents">
            {agents.map(agent => (
              <div key={agent._id} className="listing-overview-agent-info">
                <img src={agent.profilePhotoUrl} alt={agent.firstName} className="listing-overview-agent-image" />
                <p>{agent.firstName} {agent.lastName}</p>
              </div>
            ))}
          </div>
        </div>
        {showMoreInfo && (
          <MoreInfo
            isOpen={showMoreInfo}
            onClose={() => {
              setShowMoreInfo(false);
              handleRefreshListing();
            }}
            listingId={currentListing._id}
          />
        )}
        {showGallery && (
          <ListingPhotoGallery
            images={currentListing.imagesUrls}
            onClose={() => setShowGallery(false)}
          />
        )}
      </div>
    </div>
  );
}

export default ListingOverview;