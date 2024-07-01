import React, { useState } from 'react';
import DashboardHeader from './components/Header/DashboardHeader';
import MyListings from './components/MyListings/MyListings';
import ForBuyers from './components/ForBuyers/ForBuyers';
import Footer from '../../components/Footer/Footer';
import CreateListingPackageLogic from './components/CreateListingPackage/CreateListingPackageLogic';
import './Dashboard.css';

function Dashboard({ userId }) {
  const [activeTab, setActiveTab] = useState('listings');
  const [showCreatePackageModal, setShowCreatePackageModal] = useState(false);

  const handleCreatePackageClick = () => {
    setShowCreatePackageModal(true);
  };

  const handleCloseModal = () => {
    setShowCreatePackageModal(false);
  };

  return (
    <div className="dashboard-container">
      <DashboardHeader activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="content">
        {activeTab === 'listings' ? (
          <MyListings onCreatePackageClick={handleCreatePackageClick} />
        ) : (
          <ForBuyers onCreatePackageClick={handleCreatePackageClick} />
        )}
      </div>
      <div className="dashboard-footer">
        <Footer /> {/* Footer component wrapped in a div for specific styling */}
      </div>
      {showCreatePackageModal && <CreateListingPackageLogic onClose={handleCloseModal} userId={userId} />}
    </div>
  );
}

export default Dashboard;
