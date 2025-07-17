// /Tabs/BuyerPackageSettings/BuyerPackageSettings.js

import React, { useState } from 'react';
import './BuyerPackageSettings.css';
import axios from 'axios';
import { useAuth } from '../../../../../../../context/AuthContext'; // Import useAuth hook

const BuyerPackageSettings = ({ buyerPackage, onBuyerPackageUpdate }) => {
  const [loading, setLoading] = useState(false);
  const { token } = useAuth(); // Get the token from AuthContext

  const handleArchivePackage = async () => {
    setLoading(true);
    try {
      const newStatus = buyerPackage.status === 'active' ? 'archived' : 'active';
      await axios.put(
        `${process.env.REACT_APP_BACKEND_URL}/api/buyerPackages/${buyerPackage._id}`,
        { status: newStatus },
        {
          headers: {
            'Authorization': `Bearer ${token}`, // Include the token in the header
          },
        }
      );
      console.log(`Buyer Package ${newStatus}`);
      onBuyerPackageUpdate(buyerPackage._id); // Notify parent of status change
    } catch (error) {
      console.error(`Error changing buyer package status to ${buyerPackage.status === 'active' ? 'archived' : 'active'}:`, error);
    }
    setLoading(false);
  };

  return (
    <div className="settings-container">
      {loading && (
        <div className="settings-spinner-overlay">
          <div className="settings-spinner"></div>
        </div>
      )}
      <div className="settings-sections-row">
        <div className="settings-section">
          <h2 className="settings-title">Archive Package</h2>
          <p className="settings-description">Archived packages are read only and seller parties lose access.</p>
          <button className="archive-button" onClick={handleArchivePackage}>
            {buyerPackage.status === 'active' ? 'Archive Package' : 'Unarchive Package'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BuyerPackageSettings; 