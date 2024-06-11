import React, { useState } from 'react';
import DashboardHeader from './components/Header/DashboardHeader';
import MyListings from './components/MyListings/MyListings';
import ForBuyers from './components/ForBuyers/ForBuyers';
import Footer from '../../components/Footer/Footer';
import './Dashboard.css';

function Dashboard() {
  const [activeTab, setActiveTab] = useState('listings');

  return (
    <div className="dashboard-container">
      <DashboardHeader activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="content">
        {activeTab === 'listings' ? <MyListings /> : <ForBuyers />}
      </div>
      <div className="dashboard-footer">
        <Footer /> {/* Footer component wrapped in a div for specific styling */}
      </div>
    </div>
  );
}

export default Dashboard;
