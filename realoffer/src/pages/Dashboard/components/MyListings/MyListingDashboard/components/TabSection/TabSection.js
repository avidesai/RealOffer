import React, { useState } from 'react';
import Documents from '../../Tabs/Documents/Documents';
import Viewers from '../../Tabs/Viewers/Viewers';
import Activity from '../../Tabs/Activity/Activity';
import Messages from '../../Tabs/Messages/Messages';
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
        {activeTab === 'viewers' && <Viewers listingId={listing._id} />}
        {activeTab === 'activity' && <Activity />}
        {activeTab === 'messages' && <Messages />}
        {activeTab === 'offers' && <div>Offers Content</div>}
        {activeTab === 'settings' && <div>Settings Content</div>}
      </div>
    </div>
  );
};

export default TabSection;
