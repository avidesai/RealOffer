import React from 'react';
import DashboardHeader from './components/Header/DashboardHeader'; // Ensure the path is correct
import './Dashboard.css';

function Dashboard() {
  return (
    <div className="dashboard-container">
      <DashboardHeader />
      {/* Other components will go here */}
    </div>
  );
}

export default Dashboard;
