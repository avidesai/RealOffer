import React from 'react';
import './Settings.css';
import axios from 'axios';

const Settings = ({ listing }) => {
  const handleArchivePackage = async () => {
    try {
      await axios.put(`http://localhost:8000/api/propertyListings/${listing._id}`, { status: 'archived' });
      console.log('Package archived');
    } catch (error) {
      console.error('Error archiving package:', error);
    }
  };

  const handleDeletePackage = async () => {
    try {
      await axios.delete(`http://localhost:8000/api/propertyListings/${listing._id}`);
      console.log('Package deleted');
    } catch (error) {
      console.error('Error deleting package:', error);
    }
  };

  return (
    <div className="settings-container">
      <div className="settings-section">
        <h2 className="settings-title">Archive Package</h2>
        <p className="settings-description">Archived packages are read only and buyer parties lose access.</p>
        <button className="archive-button" onClick={handleArchivePackage}>Archive Package</button>
      </div>
      <div className="settings-section danger-zone">
        <h2 className="settings-title">Danger Zone</h2>
        <p className="settings-description">Delete this package. This action cannot be undone.</p>
        <button className="settings-delete-button" onClick={handleDeletePackage}>Delete Package</button>
      </div>
    </div>
  );
};

export default Settings;
