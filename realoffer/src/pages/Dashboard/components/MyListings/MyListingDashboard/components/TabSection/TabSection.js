import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../../../../context/AuthContext';  // Import useAuth hook
import Documents from '../../Tabs/Documents/Documents';
import Activity from '../../Tabs/Activity/Activity';
import Messages from '../../Tabs/Messages/Messages';
import Settings from '../../Tabs/Settings/Settings';
import Offers from '../../Tabs/Offers/Offers';
import Analysis from '../../Tabs/Analysis/Analysis';
import axios from 'axios';
import './TabSection.css';

const TabSection = ({ listing, onOpenSignaturePackage, shouldOpenSignaturePackage }) => {
  const { token } = useAuth();  // Get the token from AuthContext
  const [activeTab, setActiveTab] = useState('docs');
  const [updatedListing, setUpdatedListing] = useState(listing);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    // Scroll to top of tab content on mobile when switching tabs
    if (isMobile) {
      const tabContent = document.querySelector('.tab-content');
      if (tabContent) {
        tabContent.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleStatusChange = async (listingId, newStatus) => {
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
  };

  const tabs = [
    { id: 'docs', label: 'Documents' },
    { id: 'analysis', label: 'Analysis' },
    { id: 'activity', label: 'Activity' },
    { id: 'offers', label: 'Offers' },
    { id: 'settings', label: 'Settings' }
  ];

  return (
    <div className="tab-section">
      <div className="tab-navigation">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabClick(tab.id)}
            aria-label={`Switch to ${tab.label} tab`}
            role="tab"
            aria-selected={activeTab === tab.id}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="tab-content" role="tabpanel">
        {activeTab === 'docs' && <Documents listingId={updatedListing._id} onOpenSignaturePackage={onOpenSignaturePackage} shouldOpenSignaturePackage={shouldOpenSignaturePackage} />}
        {activeTab === 'analysis' && <Analysis listingId={updatedListing._id} />}
        {activeTab === 'activity' && <Activity listingId={updatedListing._id} />}
        {activeTab === 'messages' && <Messages listingId={updatedListing._id} />}
        {activeTab === 'offers' && <Offers listingId={updatedListing._id} />}
        {activeTab === 'settings' && <Settings listing={updatedListing} onStatusChange={handleStatusChange} />}
      </div>
    </div>
  );
};

export default TabSection;