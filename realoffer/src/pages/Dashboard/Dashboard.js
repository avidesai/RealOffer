import React from 'react';
import DashboardHeader from './components/Header/DashboardHeader';
import MyListings from './components/MyListings/MyListings';
import Footer from '../../components/Footer/Footer'; // Import Footer component
import './Dashboard.css';

function Dashboard() {
  return (
    <div className="dashboard-container">
      <DashboardHeader />
      <MyListings />
      <Footer /> {/* Add Footer component */}
      {/* Other components will go here */}
    </div>
  );
}

export default Dashboard;
