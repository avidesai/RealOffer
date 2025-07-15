import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../../context/AuthContext';
import Avatar from '../../../../../components/Avatar/Avatar';
import './ListingItem.css';

function ListingItem({ listing, onStatusChange, onShareListing }) {
  const [agents, setAgents] = useState([]);
  const [status, setStatus] = useState(listing.status);
  const [isConfirmingArchive, setIsConfirmingArchive] = useState(false);
  const [confirmationTimeout, setConfirmationTimeout] = useState(null);
  const navigate = useNavigate();
  const { token } = useAuth();

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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (confirmationTimeout) {
        clearTimeout(confirmationTimeout);
      }
    };
  }, [confirmationTimeout]);

  const handleArchivePackage = async (e) => {
    e.stopPropagation();
    
    if (!isConfirmingArchive) {
      // First click - show confirmation
      setIsConfirmingArchive(true);
      
      // Set timeout to reset confirmation after 3 seconds
      const timeout = setTimeout(() => {
        setIsConfirmingArchive(false);
      }, 3000);
      setConfirmationTimeout(timeout);
    } else {
      // Second click - actually perform the archive
      try {
        const newStatus = status === 'active' ? 'archived' : 'active';
        await axios.put(
          `${process.env.REACT_APP_BACKEND_URL}/api/propertyListings/${listing._id}`,
          { status: newStatus },
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );
        setStatus(newStatus);
        onStatusChange(listing._id, newStatus);
        setIsConfirmingArchive(false);
        if (confirmationTimeout) {
          clearTimeout(confirmationTimeout);
        }
      } catch (error) {
        console.error(`Error changing package status to ${status === 'active' ? 'archived' : 'active'}:`, error);
        setIsConfirmingArchive(false);
        if (confirmationTimeout) {
          clearTimeout(confirmationTimeout);
        }
      }
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
          <button 
            className={`listing-item-button ${isConfirmingArchive ? 'confirm-archive' : 'archive'}`} 
            onClick={handleArchivePackage}
          >
            {isConfirmingArchive 
              ? (status === 'active' ? 'Confirm Archive?' : 'Confirm Unarchive?')
              : (status === 'active' ? 'Archive' : 'Unarchive')
            }
          </button>
        </div>
      </div>
      <div className="listing-item-agents">
        {agents.length > 0 && <div className="listing-item-agents-label">Agents</div>}
        {agents.map(agent => (
          <Avatar 
            key={agent._id} 
            src={agent.profilePhotoUrl}
            firstName={agent.firstName}
            lastName={agent.lastName}
            size="small"
            className="listing-item-agent-image"
            alt={`${agent.firstName} ${agent.lastName}`}
          />
        ))}
      </div>
    </div>
  );
}

export default ListingItem;
