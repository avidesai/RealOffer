import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../../../../context/AuthContext';
import BuyerPackageDocuments from '../../Tabs/BuyerPackageDocuments/BuyerPackageDocuments';
import BuyerPackageActivity from '../../Tabs/BuyerPackageActivity/BuyerPackageActivity';
import BuyerPackageOffers from '../../Tabs/BuyerPackageOffers/BuyerPackageOffers';
import BuyerPackageAnalysis from '../../Tabs/BuyerPackageAnalysis/BuyerPackageAnalysis';
import BuyerPackageSettings from '../../Tabs/BuyerPackageSettings/BuyerPackageSettings';
import axios from 'axios';
import './BuyerPackageTabSection.css';

const BuyerPackageTabSection = ({ buyerPackage }) => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('docs');
  const [updatedBuyerPackage, setUpdatedBuyerPackage] = useState(buyerPackage);
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

  const handleBuyerPackageUpdate = async (buyerPackageId) => {
    try {
      // Fetch the updated buyer package with authentication - don't track view on refresh
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/buyerPackages/${buyerPackageId}?trackView=false`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setUpdatedBuyerPackage(response.data);
    } catch (error) {
      console.error('Error fetching updated buyer package:', error);
    }
  };

  // Filter tabs based on user role - hide offers tab for buyers
  const allTabs = [
    { id: 'docs', label: 'Documents' },
    { id: 'analysis', label: 'Analysis' },
    { id: 'activity', label: 'Activity' },
    { id: 'offers', label: 'Offers' },
    { id: 'settings', label: 'Settings' }
  ];

  const tabs = buyerPackage?.userRole === 'buyer' 
    ? allTabs.filter(tab => tab.id !== 'offers')
    : allTabs;

  // If current active tab is 'offers' but user is a buyer (offers tab is hidden), switch to 'docs'
  useEffect(() => {
    if (buyerPackage?.userRole === 'buyer' && activeTab === 'offers') {
      setActiveTab('docs');
    }
  }, [buyerPackage?.userRole, activeTab]);

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
        {activeTab === 'docs' && <BuyerPackageDocuments buyerPackageId={updatedBuyerPackage._id} />}
        {activeTab === 'analysis' && <BuyerPackageAnalysis buyerPackageId={updatedBuyerPackage._id} />}
        {activeTab === 'activity' && <BuyerPackageActivity buyerPackageId={updatedBuyerPackage._id} listingId={updatedBuyerPackage.propertyListing} />}
        {activeTab === 'offers' && buyerPackage?.userRole !== 'buyer' && <BuyerPackageOffers buyerPackageId={updatedBuyerPackage._id} listingId={updatedBuyerPackage.propertyListing} />}
        {activeTab === 'settings' && <BuyerPackageSettings buyerPackage={updatedBuyerPackage} onBuyerPackageUpdate={handleBuyerPackageUpdate} />}
      </div>
    </div>
  );
};

export default BuyerPackageTabSection; 