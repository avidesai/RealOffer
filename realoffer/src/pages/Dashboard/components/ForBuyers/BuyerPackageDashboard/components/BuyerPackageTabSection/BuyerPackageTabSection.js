import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../../../../context/AuthContext';
import BuyerPackageDocuments from '../../Tabs/BuyerPackageDocuments/BuyerPackageDocuments';
import BuyerPackageActivity from '../../Tabs/BuyerPackageActivity/BuyerPackageActivity';
import BuyerPackageOffers from '../../Tabs/BuyerPackageOffers/BuyerPackageOffers';
import BuyerPackageAnalysis from '../../Tabs/BuyerPackageAnalysis/BuyerPackageAnalysis';
import axios from 'axios';
import './BuyerPackageTabSection.css';

const BuyerPackageTabSection = ({ buyerPackage }) => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('docs');
  const [loading, setLoading] = useState(false);
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
      const tabContent = document.querySelector('.buyer-package-tab-content');
      if (tabContent) {
        tabContent.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleBuyerPackageUpdate = async (buyerPackageId) => {
    setLoading(true);
    try {
      // Fetch the updated buyer package with authentication
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/buyerPackages/${buyerPackageId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setUpdatedBuyerPackage(response.data);
    } catch (error) {
      console.error('Error fetching updated buyer package:', error);
    }
    setLoading(false);
  };

  const tabs = [
    { id: 'docs', label: 'Documents' },
    { id: 'analysis', label: 'Analysis' },
    { id: 'activity', label: 'Activity' },
    { id: 'offers', label: 'Offers' }
  ];

  return (
    <div className="buyer-package-tab-section">
      {loading && (
        <div className="spinner-overlay">
          <div className="spinner"></div>
        </div>
      )}
      <div className="buyer-package-tab-navigation">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`buyer-package-tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabClick(tab.id)}
            aria-label={`Switch to ${tab.label} tab`}
            role="tab"
            aria-selected={activeTab === tab.id}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="buyer-package-tab-content" role="tabpanel">
        {activeTab === 'docs' && <BuyerPackageDocuments buyerPackageId={updatedBuyerPackage._id} />}
        {activeTab === 'analysis' && <BuyerPackageAnalysis buyerPackageId={updatedBuyerPackage._id} />}
        {activeTab === 'activity' && <BuyerPackageActivity buyerPackageId={updatedBuyerPackage._id} />}
        {activeTab === 'offers' && <BuyerPackageOffers buyerPackageId={updatedBuyerPackage._id} />}
      </div>
    </div>
  );
};

export default BuyerPackageTabSection; 