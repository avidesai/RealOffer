// Features.js

import React, { useState } from 'react';
import { Link } from 'react-router-dom'; // Import Link
import './Features.css';
import chart from './chart.svg'
import chat from './chat.svg'
import clipboard from './clipboard.svg'
import offer from './offer.svg'
import notifications from './notifications.svg'

const Features = () => {
  const [activeFeature, setActiveFeature] = useState('sell');

  const featureDetails = {
    sell: {
      title: 'Seller’s Agent Features (Listing Side)',
      points: [
        {
          text: 'Host disclosure documents for buyers to view and download',
          icon: clipboard,
        },
        {
          text: 'Automatically generate listing agreements and other documents for sellers to sign',
          icon: notifications,
        },
        {
          text: 'Communicate with buyers and agents through the platform.',
          icon: chat,
        },
        {
          text: 'Track and analyze buyer activity, including views, downloads, and interactions with documents (Premium).',
          icon: chart,
        },
      ],
    },
    buy: {
      title: 'Buyer’s Agent and Buyer Features (Buyer Side)',
      points: [
        {
          text: 'View and download disclosure documents provided by the seller’s agent.',
          icon: clipboard,
        },
        {
          text: 'Directly make offers to the listing agent on the platform, attaching documents and including detailed terms.',
          icon: offer,
        },
        {
          text: 'Communicate with sellers and listing agents through the platform.',
          icon: chat,
        },
        {
          text: 'Track and analyze interest in the listing by other agents/buyers, including views, downloads, and interactions with disclosure documents (Premium).',
          icon: chart,
        },
      ],
    },
  };

  return (
    <div className="features-section">
      <h2 className="features-title">Key Features</h2>
      <div className="features-feature-toggle">
        <button
          className={`features-toggle-btn features-toggle-btn-left ${activeFeature === 'sell' ? 'active' : ''}`}
          onClick={() => setActiveFeature('sell')}
        >
          Sell Your Home
        </button>
        <button
          className={`features-toggle-btn features-toggle-btn-right ${activeFeature === 'buy' ? 'active' : ''}`}
          onClick={() => setActiveFeature('buy')}
        >
          Buy Your Home
        </button>
      </div>
      <div className="feature-content">
        <div className="feature-details">
          {featureDetails[activeFeature].points.map((point, index) => (
            <div key={index} className="feature-point">
              <img src={point.icon} alt="" className="feature-point-icon" />
              <p>{point.text}</p>
            </div>
          ))}
          <Link to="/signup" className="sign-up-btn">Sign Up Now</Link> 
        </div>
      </div>
    </div>
  );
};

export default Features;
