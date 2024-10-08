import React, { useState } from 'react';
import { useAuth } from '../../../../../../../context/AuthContext';  // Import useAuth hook
import Documents from '../../Tabs/Documents/Documents';
import Activity from '../../Tabs/Activity/Activity';
import Messages from '../../Tabs/Messages/Messages';
import Settings from '../../Tabs/Settings/Settings';
import Offers from '../../Tabs/Offers/Offers';
import axios from 'axios';
import './TabSection.css';

const TabSection = ({ listing }) => {
  const { token } = useAuth();  // Get the token from AuthContext
  const [activeTab, setActiveTab] = useState('docs');
  const [loading, setLoading] = useState(false);
  const [updatedListing, setUpdatedListing] = useState(listing);

  const handleTabClick = (tab) => {
    setActiveTab(tab);
  };

  const handleStatusChange = async (listingId, newStatus) => {
    setLoading(true);
    try {
      // Fetch the updated listing with authentication
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/propertyListings/${listingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setUpdatedListing(response.data);
    } catch (error) {
      console.error('Error fetching updated listing:', error);
    }
    setLoading(false);
  };

  return (
    <div className="tab-section">
      {loading && (
        <div className="spinner-overlay">
          <div className="spinner"></div>
        </div>
      )}
      <div className="tab-navigation">
        <button
          className={`tab-button ${activeTab === 'docs' ? 'active' : ''}`}
          onClick={() => handleTabClick('docs')}
        >
          Documents
        </button>
        <button
          className={`tab-button ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => handleTabClick('activity')}
        >
          Activity
        </button>
        <button
          className={`tab-button ${activeTab === 'messages' ? 'active' : ''}`}
          onClick={() => handleTabClick('messages')}
        >
          Messages
        </button>
        <button
          className={`tab-button ${activeTab === 'offers' ? 'active' : ''}`}
          onClick={() => handleTabClick('offers')}
        >
          Offers
        </button>
        <button
          className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => handleTabClick('settings')}
        >
          Settings
        </button>
      </div>
      <div className="tab-content">
        {activeTab === 'docs' && <Documents listingId={updatedListing._id} />}
        {activeTab === 'activity' && <Activity listingId={updatedListing._id} />}
        {activeTab === 'messages' && <Messages listingId={updatedListing._id} />}
        {activeTab === 'offers' && <Offers listingId={updatedListing._id} />}
        {activeTab === 'settings' && <Settings listing={updatedListing} onStatusChange={handleStatusChange} />}
      </div>
    </div>
  );
};

export default TabSection;