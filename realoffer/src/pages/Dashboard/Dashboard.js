// src/pages/Dashboard/Dashboard.js

import React, { useState } from 'react';
import DashboardHeader from './components/Header/DashboardHeader';
import MyListings from './components/MyListings/MyListings';
import ForBuyers from './components/ForBuyers/ForBuyers';
import Footer from '../../components/Footer/Footer';
import CreateListingPackage from './components/CreateListingPackage/CreateListingPackage';
import './Dashboard.css';

function Dashboard() {
  const [activeTab, setActiveTab] = useState('listings');
  const [showCreateListingPackage, setShowCreateListingPackage] = useState(false);

  const handleCreatePackageClick = () => {
    setShowCreateListingPackage(true);
  };

  const handleCloseModal = () => {
    setShowCreateListingPackage(false);
  };

  return (
    <div className="dashboard-container">
      <DashboardHeader activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="content">
        {activeTab === 'listings' ? (
          <MyListings onCreatePackageClick={handleCreatePackageClick} />
        ) : (
          <ForBuyers />
        )}
      </div>
      <div className="dashboard-footer">
        <Footer />
      </div>
      {showCreateListingPackage && <CreateListingPackage onClose={handleCloseModal} />}
    </div>
  );
}

export default Dashboard;
