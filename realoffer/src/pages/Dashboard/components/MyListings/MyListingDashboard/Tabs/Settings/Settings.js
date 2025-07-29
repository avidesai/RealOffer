// /Tabs/Settings/Settings.js

import React, { useState, useEffect } from 'react';
import './Settings.css';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../../../../context/AuthContext'; // Import useAuth hook

const Settings = ({ listing, onStatusChange }) => {
  const [loading, setLoading] = useState(false);
  const [isConfirmingArchive, setIsConfirmingArchive] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [confirmationTimeout, setConfirmationTimeout] = useState(null);
  const [error, setError] = useState('');
  const [showActivityStatsToBuyers, setShowActivityStatsToBuyers] = useState(false);
  const [showActivityDetailsToBuyers, setShowActivityDetailsToBuyers] = useState(false);
  const [activitySettingsLoading, setActivitySettingsLoading] = useState(false);
  const navigate = useNavigate();
  const { token } = useAuth(); // Get the token from AuthContext

  // Initialize activity settings from listing
  useEffect(() => {
    if (listing) {
      setShowActivityStatsToBuyers(listing.showActivityStatsToBuyers || false);
      setShowActivityDetailsToBuyers(listing.showActivityDetailsToBuyers || false);
    }
  }, [listing]);

  const handleActivitySettingsUpdate = async () => {
    setActivitySettingsLoading(true);
    setError('');
    try {
      await axios.put(
        `${process.env.REACT_APP_BACKEND_URL}/api/propertyListings/${listing._id}`,
        {
          showActivityStatsToBuyers,
          showActivityDetailsToBuyers
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      console.log('Activity settings updated');
    } catch (error) {
      console.error('Error updating activity settings:', error);
      setError('Failed to update activity settings. Please try again.');
    }
    setActivitySettingsLoading(false);
  };

  const handleArchivePackage = async () => {
    if (isConfirmingArchive) {
      // Confirm archive
      setLoading(true);
      setError('');
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
        setIsConfirmingArchive(false);
        if (confirmationTimeout) {
          clearTimeout(confirmationTimeout);
          setConfirmationTimeout(null);
        }
      } catch (error) {
        console.error(`Error changing package status to ${listing.status === 'active' ? 'archived' : 'active'}:`, error);
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

  const handleDeletePackage = async () => {
    if (isConfirmingDelete) {
      // Confirm delete
      setLoading(true);
      setError('');
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
        setError('Failed to delete package. Please try again.');
        setIsConfirmingDelete(false);
        if (confirmationTimeout) {
          clearTimeout(confirmationTimeout);
          setConfirmationTimeout(null);
        }
      }
      setLoading(false);
    } else {
      // Start confirmation process
      setIsConfirmingDelete(true);
      setError('');
      const timeout = setTimeout(() => {
        setIsConfirmingDelete(false);
        setConfirmationTimeout(null);
      }, 3000);
      setConfirmationTimeout(timeout);
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

  return (
    <div className="settings-container">
      {loading && (
        <div className="settings-spinner-overlay">
          <div className="settings-spinner"></div>
        </div>
      )}
      {error && (
        <div className="settings-error">
          {error}
        </div>
      )}
      
      {/* Activity Visibility Settings */}
      <div className="settings-section activity-visibility-section">
        <h2 className="settings-title">Activity Visibility</h2>
        <p className="settings-description">Control what buyer parties can see in the activity tab.</p>
        
        <div className="toggle-settings">
          <div className="toggle-setting">
            <div className="toggle-label">
              <span className="toggle-title">Show listing activity statistics to buyer parties</span>
              <span className="toggle-description">Display activity counts (views, downloads, offers, etc.) to buyer parties</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={showActivityStatsToBuyers}
                onChange={(e) => setShowActivityStatsToBuyers(e.target.checked)}
                disabled={activitySettingsLoading}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
          
          <div className="toggle-setting">
            <div className="toggle-label">
              <span className="toggle-title">Show listing activity details to buyer parties</span>
              <span className="toggle-description">Display detailed activity information and allow filtering/searching</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={showActivityDetailsToBuyers}
                onChange={(e) => setShowActivityDetailsToBuyers(e.target.checked)}
                disabled={activitySettingsLoading}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>
        
        <button 
          className="save-activity-settings-button"
          onClick={handleActivitySettingsUpdate}
          disabled={activitySettingsLoading}
        >
          {activitySettingsLoading ? 'Saving...' : 'Save Activity Settings'}
        </button>
      </div>

      <div className="settings-sections-row">
        <div className="settings-section">
          <h2 className="settings-title">Archive Package</h2>
          <p className="settings-description">Archived packages are read only and buyer parties lose access.</p>
          <button 
            className={`archive-button ${isConfirmingArchive ? 'confirm-archive' : ''}`} 
            onClick={handleArchivePackage}
            disabled={loading}
          >
            {isConfirmingArchive 
              ? (listing.status === 'active' ? 'Confirm Archive?' : 'Confirm Unarchive?')
              : (listing.status === 'active' ? 'Archive Package' : 'Unarchive Package')
            }
          </button>
        </div>
        <div className="settings-section danger-zone">
          <h2 className="settings-title">Danger Zone</h2>
          <p className="settings-description">Delete this package. This action cannot be undone.</p>
          <button 
            className={`settings-delete-button ${isConfirmingDelete ? 'confirm-delete' : ''}`} 
            onClick={handleDeletePackage}
            disabled={loading}
          >
            {isConfirmingDelete ? 'Confirm Delete?' : 'Delete Package'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
