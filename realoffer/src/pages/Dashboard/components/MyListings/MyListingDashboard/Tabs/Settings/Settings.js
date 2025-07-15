// /Tabs/Settings/Settings.js

import React, { useState } from 'react';
import './Settings.css';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../../../../context/AuthContext'; // Import useAuth hook

const Settings = ({ listing, onStatusChange }) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { token } = useAuth(); // Get the token from AuthContext

  const handleArchivePackage = async () => {
    setLoading(true);
    try {
      const newStatus = listing.status === 'active' ? 'archived' : 'active';
      await axios.put(
        `${process.env.REACT_APP_BACKEND_URL}/api/propertyListings/${listing._id}`,
        { status: newStatus },
        {
          headers: {
            'Authorization': `Bearer ${token}`, // Include the token in the header
          },
        }
      );
      console.log(`Package ${newStatus}`);
      onStatusChange(listing._id, newStatus); // Notify parent of status change
    } catch (error) {
      console.error(`Error changing package status to ${listing.status === 'active' ? 'archived' : 'active'}:`, error);
    }
    setLoading(false);
  };

  const handleDeletePackage = async () => {
    setLoading(true);
    try {
      await axios.delete(
        `${process.env.REACT_APP_BACKEND_URL}/api/propertyListings/${listing._id}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`, // Include the token in the header
          },
        }
      );
      console.log('Package deleted');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error deleting package:', error);
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
          <p className="settings-description">Archived packages are read only and buyer parties lose access.</p>
          <button className="archive-button" onClick={handleArchivePackage}>
            {listing.status === 'active' ? 'Archive Package' : 'Unarchive Package'}
          </button>
        </div>
        <div className="settings-section danger-zone">
          <h2 className="settings-title">Danger Zone</h2>
          <p className="settings-description">Delete this package. This action cannot be undone.</p>
          <button className="settings-delete-button" onClick={handleDeletePackage}>Delete Package</button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
