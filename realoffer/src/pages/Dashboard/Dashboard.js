// Dashboard.js

import React, { useState } from 'react';
import DashboardHeader from './components/Header/DashboardHeader';
import MyListings from './components/MyListings/MyListings';
import Footer from '../../components/Footer/Footer';
import CreateListingPackageLogic from './components/MyListings/CreateListingPackage/CreateListingPackageLogic';
import './Dashboard.css';

function Dashboard({ userId }) {
  const [activeTab, setActiveTab] = useState('listings');
  const [showCreateListingModal, setShowCreateListingModal] = useState(false);

  const handleCreateListingClick = () => {
    setShowCreateListingModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateListingModal(false);
  };

  return (
    <div className="dashboard-container">
      <DashboardHeader activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="content">
        {activeTab === 'listings' ? (
          <MyListings onCreatePackageClick={handleCreateListingClick} />
        ) : (
          <div>ForBuyers</div>
        )}
      </div>
      <div className="dashboard-footer">
        <Footer /> {/* Footer component wrapped in a div for specific styling */}
      </div>
      {showCreateListingModal && <CreateListingPackageLogic onClose={handleCloseModal} userId={userId} />}
    </div>
  );
}

export default Dashboard;
