// BuyerPackageItem.js

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../../../../context/AuthContext';
import Avatar from '../../../../../components/Avatar/Avatar';
import basePhoto from '../../../../../assets/images/basephoto.png';
import './BuyerPackageItem.css';

function BuyerPackageItem({ buyerPackage, onStatusChange, onShareListing }) {
  const [agents, setAgents] = useState([]);
  const [isConfirmingArchive, setIsConfirmingArchive] = useState(false);
  const [confirmationTimeout, setConfirmationTimeout] = useState(null);
  const navigate = useNavigate();
  const { token } = useAuth();

  useEffect(() => {
    const fetchAgents = async () => {
      if (buyerPackage.propertyListing && buyerPackage.propertyListing.agentIds && buyerPackage.propertyListing.agentIds.length > 0) {
        try {
          // Check if agentIds are already populated objects or just IDs
          const isPopulated = buyerPackage.propertyListing.agentIds.length > 0 && typeof buyerPackage.propertyListing.agentIds[0] === 'object' && buyerPackage.propertyListing.agentIds[0]._id;
          
          let agentDetails;
          if (isPopulated) {
            // agentIds are already populated user objects
            agentDetails = buyerPackage.propertyListing.agentIds;
          } else {
            // agentIds are just IDs, need to fetch user objects
            agentDetails = await Promise.all(
              buyerPackage.propertyListing.agentIds.map(async (id) => {
                const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/users/${id}`, {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                  },
                });
                return response.data;
              })
            );
          }
          setAgents(agentDetails);
        } catch (error) {
          console.error('Failed to fetch agents:', error);
        }
      }
    };

    fetchAgents();
  }, [buyerPackage.propertyListing, token]);

  const handleClick = () => {
    navigate(`/buyerpackage/${buyerPackage._id}`);
  };

  const handleArchivePackage = async (e) => {
    e.stopPropagation();
    
    if (isConfirmingArchive) {
      // Confirm archive
      try {
        await onStatusChange(buyerPackage._id, buyerPackage.status === 'active' ? 'archived' : 'active');
        setIsConfirmingArchive(false);
        if (confirmationTimeout) {
          clearTimeout(confirmationTimeout);
          setConfirmationTimeout(null);
        }
      } catch (error) {
        console.error('Failed to update buyer package status:', error);
        setIsConfirmingArchive(false);
        if (confirmationTimeout) {
          clearTimeout(confirmationTimeout);
          setConfirmationTimeout(null);
        }
      }
    } else {
      // Start confirmation process
      setIsConfirmingArchive(true);
      const timeout = setTimeout(() => {
        setIsConfirmingArchive(false);
        setConfirmationTimeout(null);
      }, 3000);
      setConfirmationTimeout(timeout);
    }
  };

  const handleShareListing = (e) => {
    e.stopPropagation();
    if (onShareListing) {
      onShareListing(buyerPackage);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (confirmationTimeout) {
        clearTimeout(confirmationTimeout);
      }
    };
  }, [confirmationTimeout]);

  const { propertyListing } = buyerPackage;

  return (
    <div className="buyer-package-item" onClick={handleClick}>
      {propertyListing.imagesUrls && propertyListing.imagesUrls.length > 0 ? (
        <img 
          src={propertyListing.imagesUrls[0]} 
          alt={`${propertyListing.homeCharacteristics.address} view`} 
          className="buyer-package-item-image" 
        />
      ) : (
        <img 
          src={basePhoto} 
          alt={`${propertyListing.homeCharacteristics.address} view`} 
          className="buyer-package-item-image" 
        />
      )}
      <div className="buyer-package-item-details">
        <div className="buyer-package-item-info">
          <h3 className="buyer-package-item-title">
            {propertyListing.homeCharacteristics?.address || 'Address not available'}
          </h3>
          <p className="buyer-package-item-location">
            {propertyListing.homeCharacteristics?.city && propertyListing.homeCharacteristics?.state && propertyListing.homeCharacteristics?.zip 
              ? `${propertyListing.homeCharacteristics.city}, ${propertyListing.homeCharacteristics.state} ${propertyListing.homeCharacteristics.zip}`
              : 'Location not available'
            }
          </p>
        </div>
        <div className="buyer-package-item-action-buttons">
          <button 
            className="buyer-package-item-button share" 
            onClick={handleShareListing}
          >
            Share
          </button>
          <button 
            className={`buyer-package-item-button ${isConfirmingArchive ? 'confirm-archive' : 'archive'}`} 
            onClick={handleArchivePackage}
          >
            {isConfirmingArchive 
              ? (buyerPackage.status === 'active' ? 'Confirm Archive?' : 'Confirm Unarchive?')
              : (buyerPackage.status === 'active' ? 'Archive' : 'Unarchive')
            }
          </button>
        </div>
      </div>
      <div className="buyer-package-item-agents">
        <div className="buyer-package-item-agents-label">Agents</div>
        {agents.length > 0 ? (
          agents.map(agent => (
            <Avatar 
              key={agent._id} 
              src={agent.profilePhotoUrl}
              firstName={agent.firstName}
              lastName={agent.lastName}
              size="small"
              className="buyer-package-item-agent-image"
              alt={`${agent.firstName} ${agent.lastName}`}
            />
          ))
        ) : (
          <span className="buyer-package-item-no-agents">No agents listed</span>
        )}
      </div>
    </div>
  );
}

export default BuyerPackageItem; 