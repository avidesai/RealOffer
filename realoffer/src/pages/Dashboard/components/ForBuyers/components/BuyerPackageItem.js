// BuyerPackageItem.js

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../../../../context/AuthContext';
import Avatar from '../../../../../components/Avatar/Avatar';
import './BuyerPackageItem.css';

function BuyerPackageItem({ buyerPackage, onStatusChange }) {
  const [agents, setAgents] = useState([]);
  const [isConfirmingArchive, setIsConfirmingArchive] = useState(false);
  const [confirmationTimeout, setConfirmationTimeout] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { token } = useAuth();

  useEffect(() => {
    const fetchAgents = async () => {
      if (buyerPackage.propertyListing && buyerPackage.propertyListing.agentIds && buyerPackage.propertyListing.agentIds.length > 0) {
        try {
          const agentDetails = await Promise.all(
            buyerPackage.propertyListing.agentIds.map(async (id) => {
              const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/users/${id}`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });
              return response.data;
            })
          );
          setAgents(agentDetails);
        } catch (error) {
          console.error('Failed to fetch agents:', error);
          setError('Failed to load agent information.');
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
      setLoading(true);
      setError('');
      try {
        await onStatusChange(buyerPackage._id, buyerPackage.status === 'active' ? 'archived' : 'active');
        setIsConfirmingArchive(false);
        if (confirmationTimeout) {
          clearTimeout(confirmationTimeout);
          setConfirmationTimeout(null);
        }
      } catch (error) {
        console.error('Failed to update buyer package status:', error);
        setError('Failed to update package status. Please try again.');
        setIsConfirmingArchive(false);
        if (confirmationTimeout) {
          clearTimeout(confirmationTimeout);
          setConfirmationTimeout(null);
        }
      }
      setLoading(false);
    } else {
      // Start confirmation process
      setIsConfirmingArchive(true);
      setError('');
      const timeout = setTimeout(() => {
        setIsConfirmingArchive(false);
        setConfirmationTimeout(null);
      }, 3000);
      setConfirmationTimeout(timeout);
    }
  };

  const handleShareListing = (e) => {
    e.stopPropagation();
    // For buyer packages, we could share the public URL or implement a different sharing mechanism
    if (buyerPackage.publicUrl) {
      navigator.clipboard.writeText(buyerPackage.publicUrl);
      // You could add a toast notification here
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
      {loading && (
        <div className="buyer-package-item-spinner-overlay">
          <div className="buyer-package-item-spinner"></div>
        </div>
      )}
      {error && (
        <div className="buyer-package-item-error">
          {error}
        </div>
      )}
      <img 
        src={propertyListing.imagesUrls[0]} 
        alt={`${propertyListing.homeCharacteristics.address} view`} 
        className="buyer-package-item-image" 
      />
      <div className="buyer-package-item-details">
        <div className="buyer-package-item-info">
          <h3 className="buyer-package-item-title">{propertyListing.homeCharacteristics.address}</h3>
          <p className="buyer-package-item-location">
            {propertyListing.homeCharacteristics.city}, {propertyListing.homeCharacteristics.state} {propertyListing.homeCharacteristics.zip}
          </p>
        </div>
        <div className="buyer-package-item-action-buttons">
          <button className="buyer-package-item-button share" onClick={handleShareListing}>
            Share
          </button>
          <button 
            className={`buyer-package-item-button ${isConfirmingArchive ? 'confirm-archive' : 'archive'}`} 
            onClick={handleArchivePackage}
            disabled={loading}
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
        {agents.map(agent => (
          <Avatar 
            key={agent._id} 
            src={agent.profilePhotoUrl}
            firstName={agent.firstName}
            lastName={agent.lastName}
            size="small"
            className="buyer-package-item-agent-image"
            alt={`${agent.firstName} ${agent.lastName}`}
          />
        ))}
      </div>
    </div>
  );
}

export default BuyerPackageItem; 