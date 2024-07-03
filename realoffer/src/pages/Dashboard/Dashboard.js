// Dashboard.js

import React, { useState } from 'react';
import DashboardHeader from './components/Header/DashboardHeader';
import MyListings from './components/MyListings/MyListings';
import ForBuyers from './components/ForBuyers/ForBuyers';
import Footer from '../../components/Footer/Footer';
import CreateListingPackageLogic from './components/MyListings/CreateListingPackage/CreateListingPackageLogic';
import CreateBuyerPackageLogic from './components/ForBuyers/CreateBuyerPackage/CreateBuyerPackageLogic';
import './Dashboard.css';

function Dashboard({ userId }) {
  const [activeTab, setActiveTab] = useState('listings');
  const [showCreateListingModal, setShowCreateListingModal] = useState(false);
  const [showCreateBuyerModal, setShowCreateBuyerModal] = useState(false);

  const handleCreateListingClick = () => {
    setShowCreateListingModal(true);
  };

  const handleCreateBuyerClick = () => {
    setShowCreateBuyerModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateListingModal(false);
    setShowCreateBuyerModal(false);
  };

  return (
    <div className="dashboard-container">
      <DashboardHeader activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="content">
        {activeTab === 'listings' ? (
          <MyListings onCreatePackageClick={handleCreateListingClick} />
        ) : (
          <ForBuyers onCreatePackageClick={handleCreateBuyerClick} />
        )}
      </div>
      <div className="dashboard-footer">
        <Footer /> {/* Footer component wrapped in a div for specific styling */}
      </div>
      {showCreateListingModal && <CreateListingPackageLogic onClose={handleCloseModal} userId={userId} />}
      {showCreateBuyerModal && <CreateBuyerPackageLogic onClose={handleCloseModal} userId={userId} />}
    </div>
  );
}

export default Dashboard;
