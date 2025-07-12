import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './ListingItem.css';

function ListingItem({ listing, onStatusChange, onShareListing }) {
  const [agents, setAgents] = useState([]);
  const [status, setStatus] = useState(listing.status);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAgents = async () => {
      const agentDetails = await Promise.all(
        listing.agentIds.map(async (id) => {
          const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/users/${id}`);
          return response.data;
        })
      );
      setAgents(agentDetails);
    };

    fetchAgents();
  }, [listing.agentIds]);

  const handleArchivePackage = async (e) => {
    e.stopPropagation();
    try {
      const newStatus = status === 'active' ? 'archived' : 'active';
      await axios.put(`${process.env.REACT_APP_BACKEND_URL}/api/propertyListings/${listing._id}`, { status: newStatus });
      setStatus(newStatus);
      onStatusChange(listing._id, newStatus);
    } catch (error) {
      console.error(`Error changing package status to ${status === 'active' ? 'archived' : 'active'}:`, error);
    }
  };

  const handleShareListing = (e) => {
    e.stopPropagation();
    if (onShareListing) {
      onShareListing(listing);
    }
  };

  const handleClick = () => {
    navigate(`/mylisting/${listing._id}`);
  };

  return (
    <div className="listing-item" onClick={handleClick}>
      <img 
        src={listing.imagesUrls[0]} 
        alt={`${listing.homeCharacteristics.address} view`} 
        className="listing-item-image" 
      />
      <div className="listing-item-details">
        <div className="listing-item-info">
          <h3 className="listing-item-title">{listing.homeCharacteristics.address}</h3>
          <p className="listing-item-location">
            {listing.homeCharacteristics.city}, {listing.homeCharacteristics.state} {listing.homeCharacteristics.zip}
          </p>
        </div>
        <div className="listing-item-action-buttons">
          <button className="listing-item-button share" onClick={handleShareListing}>
            Share
          </button>
          <button className="listing-item-button archive" onClick={handleArchivePackage}>
            {status === 'active' ? 'Archive' : 'Unarchive'}
          </button>
        </div>
      </div>
      <div className="listing-item-agents">
        {agents.length > 0 && <div className="listing-item-agents-label">Agents</div>}
        {agents.map(agent => (
          <img 
            key={agent._id} 
            src={agent.profilePhotoUrl} 
            alt={`${agent.firstName} ${agent.lastName}`} 
            className="listing-item-agent-image" 
            title={`${agent.firstName} ${agent.lastName}`}
          />
        ))}
      </div>
    </div>
  );
}

export default ListingItem;
