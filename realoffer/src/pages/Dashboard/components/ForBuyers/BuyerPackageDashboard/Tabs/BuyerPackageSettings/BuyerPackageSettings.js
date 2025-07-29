// /Tabs/BuyerPackageSettings/BuyerPackageSettings.js

import React, { useState } from 'react';
import './BuyerPackageSettings.css';
import axios from 'axios';
import { useAuth } from '../../../../../../../context/AuthContext'; // Import useAuth hook

const BuyerPackageSettings = ({ buyerPackage, onBuyerPackageUpdate }) => {
  const [isConfirmingArchive, setIsConfirmingArchive] = useState(false);
  const [confirmationTimeout, setConfirmationTimeout] = useState(null);
  const [error, setError] = useState('');
  const { token } = useAuth(); // Get the token from AuthContext

  const handleArchivePackage = async () => {
    if (isConfirmingArchive) {
      // Confirm archive
      setError('');
      try {
        const newStatus = buyerPackage.status === 'active' ? 'archived' : 'active';
        await axios.put(
          `${process.env.REACT_APP_BACKEND_URL}/api/buyerPackages/${buyerPackage._id}/status`,
          { status: newStatus },
          {
            headers: {
              'Authorization': `Bearer ${token}`, // Include the token in the header
            },
          }
        );
        console.log(`Buyer Package ${newStatus}`);
        onBuyerPackageUpdate(buyerPackage._id); // Notify parent of status change
        setIsConfirmingArchive(false);
        if (confirmationTimeout) {
          clearTimeout(confirmationTimeout);
          setConfirmationTimeout(null);
        }
      } catch (error) {
        console.error(`Error changing buyer package status to ${buyerPackage.status === 'active' ? 'archived' : 'active'}:`, error);
        setError('Failed to update buyer package status. Please try again.');
        setIsConfirmingArchive(false);
        if (confirmationTimeout) {
          clearTimeout(confirmationTimeout);
          setConfirmationTimeout(null);
        }
      }
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

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (confirmationTimeout) {
        clearTimeout(confirmationTimeout);
      }
    };
  }, [confirmationTimeout]);

  return (
    <div className="settings-container">
      {error && (
        <div className="settings-error">
          {error}
        </div>
      )}
      <div className="settings-sections-row">
        <div className="settings-section">
          <h2 className="settings-title">Archive Package</h2>
          <p className="settings-description">Archived packages are read only.</p>
          <button 
            className={`archive-button ${isConfirmingArchive ? 'confirm-archive' : ''}`} 
            onClick={handleArchivePackage}
          >
            {isConfirmingArchive 
              ? (buyerPackage.status === 'active' ? 'Confirm Archive?' : 'Confirm Unarchive?')
              : (buyerPackage.status === 'active' ? 'Archive Package' : 'Unarchive Package')
            }
          </button>
        </div>
      </div>
    </div>
  );
};

export default BuyerPackageSettings; 