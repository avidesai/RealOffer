// Features.js

import React, { useState } from 'react';
import { Link } from 'react-router-dom'; // Import Link
import './Features.css';
import sellHomeImage from './sell-home.png';
import buyHomeImage from './buy-home.jpeg';
import chart from './chart.svg'
import chat from './chat.svg'
import dollar from './dollar.svg'
import valuation from './valuation.svg'
import clipboard from './clipboard.svg'
import offer from './offer.svg'
import notifications from './notifications.svg'

const Features = () => {
  const [activeFeature, setActiveFeature] = useState('sell');

  const featureDetails = {
    sell: {
      title: 'Sell Your Home',
      image: sellHomeImage,
      points: [
        {
          text: 'Price your home intelligently using our RealListing™ algorithm',
          icon: dollar,
        },
        {
          text: 'Receive, respond, and manage offers on our online dashboard',
          icon: chat,
        },
        {
          text: 'Get notifications and updates on your home sale in real-time',
          icon: notifications,
        },
        {
          text: 'Manage, store, and track buyer activity on your listings',
          icon: chart, // Replace with the appropriate icon
        },
      ],
    },
    buy: {
      title: 'Buy Your Home',
      image: buyHomeImage,
      points: [
        {
          text: 'Make winning offers on homes with our RealOffer™ algorithm',
          icon: valuation,
        },
        {
          text: 'Download disclosures and fill out forms easily',
          icon: clipboard,
        },
        {
          text: 'Communicate directly with the seller\'s agent',
          icon: chat, // Replace with the appropriate icon
        },
        {
          text: 'Simplify the home buying process with full transparency',
          icon: offer,
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
        <div className='feature-image'>
          <img
            src={featureDetails[activeFeature].image}
            alt={featureDetails[activeFeature].title}
            className="feature-section-image"
          />
        </div>
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
