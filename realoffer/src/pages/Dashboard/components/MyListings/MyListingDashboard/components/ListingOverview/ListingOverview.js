// ListingOverview.js

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import MoreInfo from './components/MoreInfo/MoreInfo';
import './ListingOverview.css';

function ListingOverview({ listing }) {
  const [agents, setAgents] = useState([]);
  const [showMoreInfo, setShowMoreInfo] = useState(false); // State to manage modal visibility
  const [loading, setLoading] = useState(false); // State to manage loading spinner
  const [currentListing, setCurrentListing] = useState(listing); // State to manage current listing

  useEffect(() => {
    const fetchAgentDetails = async () => {
      try {
        const agentDetails = await Promise.all(
          currentListing.agentIds.map(async (id) => {
            const response = await axios.get(`http://localhost:8000/api/users/${id}`);
            return response.data;
          })
        );
        setAgents(agentDetails);
      } catch (error) {
        console.error('Error fetching agent details:', error);
      }
    };

    fetchAgentDetails();
  }, [currentListing.agentIds]);

  const handleRefreshListing = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:8000/api/propertyListings/${currentListing._id}`);
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
        <div className="listing-overview-spinner-container">
          <div className="listing-overview-spinner"></div>
        </div>
      )}
      {!loading && (
        <>
          <div className="overview-header">
            <div className="overview-image">
              <img src={currentListing.imagesUrls[0]} alt="Property" className="property-image" />
            </div>
            <div className="overview-details">
              <h1 className="property-address">{currentListing.homeCharacteristics.address}</h1>
              <p className="property-location">{currentListing.homeCharacteristics.city}, {currentListing.homeCharacteristics.state} {currentListing.homeCharacteristics.zip}</p>
              <p className="property-price">${formatPrice(currentListing.homeCharacteristics.price)} | {currentListing.homeCharacteristics.beds} Bed, {currentListing.homeCharacteristics.baths} Bath</p>
              <div className="overview-buttons">
                <button className="overview-btn-share-package">Share Package</button>
                <button className="overview-btn" onClick={() => setShowMoreInfo(true)}>Edit Info</button>
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
        </>
      )}
    </div>
  );
}

export default ListingOverview;
