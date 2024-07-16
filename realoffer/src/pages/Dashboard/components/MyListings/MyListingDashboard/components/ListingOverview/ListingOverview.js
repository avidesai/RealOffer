import React, { useEffect, useState } from 'react';
import axios from 'axios';
import MoreInfo from './components/MoreInfo/MoreInfo';
import './ListingOverview.css';

function ListingOverview({ listing }) {
  const [agents, setAgents] = useState([]);
  const [showMoreInfo, setShowMoreInfo] = useState(false); // State to manage modal visibility

  useEffect(() => {
    const fetchAgentDetails = async () => {
      try {
        const agentDetails = await Promise.all(
          listing.agentIds.map(async (id) => {
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
  }, [listing.agentIds]);

  const formatPrice = (price) => {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  return (
    <div className="listing-overview">
      <div className="overview-header">
        <div className="overview-image">
          <img src={listing.imagesUrls[0]} alt="Property" className="property-image" />
        </div>
        <div className="overview-details">
          <h1 className="property-address">{listing.homeCharacteristics.address}</h1>
          <p className="property-location">{listing.homeCharacteristics.city}, {listing.homeCharacteristics.state} {listing.homeCharacteristics.zip}</p>
          <p className="property-price">${formatPrice(listing.homeCharacteristics.price)} | {listing.homeCharacteristics.beds} Bed, {listing.homeCharacteristics.baths} Bath</p>
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
          onClose={() => setShowMoreInfo(false)}
          listingId={listing._id}
        />
      )}
    </div>
  );
}

export default ListingOverview;
