import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './ListingItem.css';

function ListingItem({ listing, onStatusChange }) {
  const [agents, setAgents] = useState([]);
  const [status, setStatus] = useState(listing.status);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAgents = async () => {
      const agentDetails = await Promise.all(
        listing.agentIds.map(async (id) => {
          const response = await axios.get(`http://localhost:8000/api/users/${id}`);
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
      await axios.put(`http://localhost:8000/api/propertyListings/${listing._id}`, { status: newStatus });
      setStatus(newStatus);
      onStatusChange(listing._id, newStatus); // Notify parent of status change
    } catch (error) {
      console.error(`Error changing package status to ${status === 'active' ? 'archived' : 'active'}:`, error);
    }
  };

  const handleClick = () => {
    navigate(`/mylisting/${listing._id}`);
  };

  return (
    <div className="listing-item" onClick={handleClick}>
      <img src={listing.imagesUrls[0]} alt={`${listing.homeCharacteristics.address} view`} className="listing-image" />
      <div className="listing-details">
        <h3 className="listing-title">{listing.homeCharacteristics.address}</h3>
        <p className="listing-location">{listing.homeCharacteristics.city}, {listing.homeCharacteristics.state} {listing.homeCharacteristics.zip}</p>
        <div className="listing-action-buttons">
          <button className="listing-button share">Share</button>
          <button className="listing-button archive" onClick={handleArchivePackage}>
            {status === 'active' ? 'Archive' : 'Unarchive'}
          </button>
        </div>
      </div>
      <div className="listing-agents">
        {agents.map(agent => (
          <img key={agent._id} src={agent.profilePhotoUrl} alt={agent.firstName} className="agent-image" />
        ))}
      </div>
    </div>
  );
}

export default ListingItem;
