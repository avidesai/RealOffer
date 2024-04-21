// Features.js

import React, { useState } from 'react';
import { Link } from 'react-router-dom'; // Import Link
import './Features.css';
import sellHomeImage from './sell-home.jpeg';
import buyHomeImage from './buy-home.jpeg';
import chart from './chart.svg'
import chat from './chat.svg'
import dollar from './dollar.svg'
import valuation from './valuation.svg'
import clipboard from './clipboard.svg'
import offer from './offer.svg'

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
          text: 'Manage, store, and track buyer activity on your listings',
          icon: chart,
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
          text: 'Download disclosures, fill out forms, and talk directly with the seller\'s agent',
          icon: clipboard,
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
      <div className="features-toggle">
        <button
          className={`toggle-btn toggle-btn-left ${activeFeature === 'sell' ? 'active' : ''}`}
          onClick={() => setActiveFeature('sell')}
        >
          Sell Your Home
        </button>
        <button
          className={`toggle-btn toggle-btn-right ${activeFeature === 'buy' ? 'active' : ''}`}
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
