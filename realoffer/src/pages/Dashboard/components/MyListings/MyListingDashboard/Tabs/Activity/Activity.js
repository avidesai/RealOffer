import React from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate hook
import { useAuth } from '../../../../../../../context/AuthContext';
import PremiumActivity from './components/PremiumActivity/PremiumActivity';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartLine } from '@fortawesome/free-solid-svg-icons';
import './Activity.css';

const Activity = () => {
  const { user } = useAuth();
  const navigate = useNavigate(); // Initialize useNavigate hook

  const handleUpgradeClick = () => {
    navigate('/upgrade'); // Navigate to /upgrade route
  };

  if (user?.isPremium) {
    return <PremiumActivity />;
  }

  return (
    <div className="activity-tab">
      <div className="activity-upgrade-prompt">
        <h2 className="activity-header">Analyze Listing Activity</h2>
        <FontAwesomeIcon icon={faChartLine} className="activity-icon" />
        <ul className="activity-benefits">
          <li>Learn which buyers are most active for your property</li>
          <li>Track every share, view and download of your disclosures</li>
          <li>Verify the sending, receipt and viewing of all documents</li>
        </ul>
        <button className="upgrade-button" onClick={handleUpgradeClick}>Upgrade to Pro</button>
      </div>
    </div>
  );
};

export default Activity;
