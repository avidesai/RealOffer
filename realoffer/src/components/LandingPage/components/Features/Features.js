// Features.js

import React, { useState } from 'react';
import './Features.css';
import sellHomeImage from './sell-home.jpeg'; // Replace with actual image path
import buyHomeImage from './buy-home.jpeg'; // Replace with actual image path

const Features = () => {
  const [activeFeature, setActiveFeature] = useState('sell');

  const featureDetails = {
    sell: {
      title: 'Sell Your Home',
      image: sellHomeImage,
      points: [
        'Price your home intelligently using our AI pricing tool.',
        'Receive, respond, and manage offers on our online dashboard.',
        'Manage, store, and track activity on your listings.',
      ],
    },
    buy: {
      title: 'Buy Your Home',
      image: buyHomeImage,
      points: [
        'Make offers that win with our smart offer algorithm.',
        'Download disclosures, fill out forms, and communicate directly with the seller\'s agent.',
        'Simplify the home buying process with transparency.',
      ],
    },
  };

  return (
    <div className="features-section">
      <h2 className="features-title">Our Key Features</h2>
      <div className="features-toggle">
        <button
          className={`toggle-btn ${activeFeature === 'sell' ? 'active' : ''}`}
          onClick={() => setActiveFeature('sell')}
        >
          Sell Your Home
        </button>
        <button
          className={`toggle-btn ${activeFeature === 'buy' ? 'active' : ''}`}
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
            <p key={index} className="feature-point">{point}</p>
          ))}
          <button className="sign-up-btn">Sign Up Now</button>
        </div>
      </div>
    </div>
  );
};

export default Features;
