// /Tabs/Settings/Settings.js

import React, { useState, useEffect } from 'react';
import './Settings.css';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../../../../context/AuthContext'; // Import useAuth hook

const Settings = ({ listing, onStatusChange }) => {
  const [isConfirmingArchive, setIsConfirmingArchive] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [confirmationTimeout, setConfirmationTimeout] = useState(null);
  const [error, setError] = useState('');
  const [showActivityStatsToBuyers, setShowActivityStatsToBuyers] = useState(false);
  const [showActivityDetailsToBuyers, setShowActivityDetailsToBuyers] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    buyerPackageCreated: true,
    views: false,
    downloads: true,
    offers: true,
    offerDueDateReminders: true
  });
  const navigate = useNavigate();
  const { token, user } = useAuth(); // Get the token and user from AuthContext

  // Initialize activity settings from listing
  useEffect(() => {
    if (listing) {
      setShowActivityStatsToBuyers(listing.showActivityStatsToBuyers || false);
      setShowActivityDetailsToBuyers(listing.showActivityDetailsToBuyers || false);
      setNotificationSettings(listing.notificationSettings || {
        buyerPackageCreated: true,
        views: false,
        downloads: true,
        offers: true,
        offerDueDateReminders: true
      });
    }
  }, [listing]);

  const handleActivitySettingsUpdate = async (newStatsSetting, newDetailsSetting) => {
    setError('');
    try {
      await axios.put(
        `${process.env.REACT_APP_BACKEND_URL}/api/propertyListings/${listing._id}`,
        {
          showActivityStatsToBuyers: newStatsSetting,
          showActivityDetailsToBuyers: newDetailsSetting
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      console.log('Activity settings updated');
      
      // Notify parent component to refresh listing data
      if (onStatusChange) {
        await onStatusChange(listing._id, listing.status);
      }
    } catch (error) {
      console.error('Error updating activity settings:', error);
      setError('Failed to update activity settings. Please try again.');
      // Revert the state on error
      setShowActivityStatsToBuyers(listing.showActivityStatsToBuyers || false);
      setShowActivityDetailsToBuyers(listing.showActivityDetailsToBuyers || false);
    }
  };

  const handleNotificationSettingsUpdate = async (newSettings) => {
    setError('');
    try {
      await axios.put(
        `${process.env.REACT_APP_BACKEND_URL}/api/propertyListings/${listing._id}`,
        {
          notificationSettings: newSettings
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      console.log('Notification settings updated');
      
      // Notify parent component to refresh listing data
      if (onStatusChange) {
        await onStatusChange(listing._id, listing.status);
      }
    } catch (error) {
      console.error('Error updating notification settings:', error);
      setError('Failed to update notification settings. Please try again.');
      // Revert the state on error
      setNotificationSettings(listing.notificationSettings || {
        buyerPackageCreated: true,
        views: false,
        downloads: true,
        offers: true,
        offerDueDateReminders: true
      });
    }
  };

  const handleStatsToggle = async (checked) => {
    const newStatsSetting = checked;
    setShowActivityStatsToBuyers(newStatsSetting);
    await handleActivitySettingsUpdate(newStatsSetting, showActivityDetailsToBuyers);
  };

  const handleDetailsToggle = async (checked) => {
    const newDetailsSetting = checked;
    setShowActivityDetailsToBuyers(newDetailsSetting);
    await handleActivitySettingsUpdate(showActivityStatsToBuyers, newDetailsSetting);
  };

  const handleNotificationToggle = async (setting, checked) => {
    const newSettings = { ...notificationSettings, [setting]: checked };
    setNotificationSettings(newSettings);
    await handleNotificationSettingsUpdate(newSettings);
  };

  const handleArchivePackage = async () => {
    if (isConfirmingArchive) {
      // Confirm archive
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
      {error && (
        <div className="settings-error">
          {error}
        </div>
      )}
      
      {/* Settings Sections Row - Email Notifications and Activity Visibility */}
      <div className="settings-sections-row">
        <div className="settings-section notification-settings-section">
          <h2 className="settings-title">Email Notifications</h2>
          <p className="settings-description">Configure which events will trigger email notifications.</p>
          
          <div className="toggle-settings">
            <div className="toggle-setting">
              <div className="toggle-label">
                <span className="toggle-title">Buyer packages created</span>
                <span className="toggle-description">Get notified when someone creates a buyer package for this listing</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={notificationSettings.buyerPackageCreated}
                  onChange={(e) => handleNotificationToggle('buyerPackageCreated', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            
            <div className="toggle-setting">
              <div className="toggle-label">
                <span className="toggle-title">Property views</span>
                <span className="toggle-description">Get notified when someone views this property listing</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={notificationSettings.views}
                  onChange={(e) => handleNotificationToggle('views', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            
            <div className="toggle-setting">
              <div className="toggle-label">
                <span className="toggle-title">Document downloads</span>
                <span className="toggle-description">Get notified when someone downloads documents from this listing</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={notificationSettings.downloads}
                  onChange={(e) => handleNotificationToggle('downloads', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            
            <div className="toggle-setting">
              <div className="toggle-label">
                <span className="toggle-title">Offer activity</span>
                <span className="toggle-description">Get notified when someone submits an offer for this property</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={notificationSettings.offers}
                  onChange={(e) => handleNotificationToggle('offers', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            
            <div className="toggle-setting">
              <div className="toggle-label">
                <span className="toggle-title">Send offer due date reminders</span>
                <span className="toggle-description">Send email reminders to buyer parties 3 days, 1 day, and 3 hours before the offer due date</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={notificationSettings.offerDueDateReminders}
                  onChange={(e) => handleNotificationToggle('offerDueDateReminders', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>
        
        {/* Only show activity visibility section for premium users */}
        {user?.isPremium && (
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
                    onChange={(e) => handleStatsToggle(e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              
              <div className="toggle-setting">
                <div className="toggle-label">
                  <span className="toggle-title">Show listing activity details to buyer parties</span>
                  <span className="toggle-description">Display detailed activity information like names, activity types, and dates</span>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={showActivityDetailsToBuyers}
                    onChange={(e) => handleDetailsToggle(e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Settings Sections Row - Archive Package and Danger Zone */}
      <div className="settings-sections-row">
        <div className="settings-section">
          <h2 className="settings-title">Archive Package</h2>
          <p className="settings-description">Archived packages are read only and buyer parties lose access.</p>
          <button 
            className={`archive-button ${isConfirmingArchive ? 'confirm-archive' : ''}`} 
            onClick={handleArchivePackage}
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
          >
            {isConfirmingDelete ? 'Confirm Delete?' : 'Delete Package'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
