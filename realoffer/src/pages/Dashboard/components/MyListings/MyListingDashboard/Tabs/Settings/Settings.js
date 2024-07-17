import React from 'react';
import './Settings.css';

const Settings = () => {
  const handleArchivePackage = () => {
    // Add your archive package logic here
    console.log('Package archived');
  };

  const handleDeletePackage = () => {
    // Add your delete package logic here
    console.log('Package deleted');
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
