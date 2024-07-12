// TabSection.js

import React, { useState } from 'react';
import Documents from '../../Tabs/Documents/Documents';
import './TabSection.css';

const TabSection = ({ listing }) => {
  const [activeTab, setActiveTab] = useState('docs');

  const handleTabClick = (tab) => {
    setActiveTab(tab);
  };

  return (
    <div className="tab-section">
      <div className="tab-navigation">
        <button
          className={`tab-button ${activeTab === 'docs' ? 'active' : ''}`}
          onClick={() => handleTabClick('docs')}
        >
          Documents
        </button>
        <button
          className={`tab-button ${activeTab === 'viewers' ? 'active' : ''}`}
          onClick={() => handleTabClick('viewers')}
        >
          Viewers
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
        {activeTab === 'docs' && <Documents listingId={listing._id} />}
        {activeTab === 'viewers' && <div>Viewers Content</div>}
        {activeTab === 'activity' && <div>Activity Content</div>}
        {activeTab === 'messages' && <div>Messages Content</div>}
        {activeTab === 'offers' && <div>Offers Content</div>}
        {activeTab === 'settings' && <div>Settings Content</div>}
      </div>
    </div>
  );
};

export default TabSection;
