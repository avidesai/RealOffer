// Dashboard.js
import React, { useState } from 'react';
import DashboardHeader from './components/Header/DashboardHeader';
import MyListings from './components/MyListings/MyListings';
import ForBuyers from './components/ForBuyers/ForBuyers'; // Import ForBuyers component
import Footer from '../../components/Footer/Footer'; // Import Footer component
import './Dashboard.css';

function Dashboard() {
  const [activeTab, setActiveTab] = useState('listings');

  return (
    <div className="dashboard-container">
      <DashboardHeader activeTab={activeTab} setActiveTab={setActiveTab} />
      {activeTab === 'listings' ? <MyListings /> : <ForBuyers />}
      <Footer /> {/* Add Footer component */}
      {/* Other components will go here */}
    </div>
  );
}

export default Dashboard;
