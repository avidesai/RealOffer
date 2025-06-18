// Features.js

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Features.css';
import chart from './chart.svg'
import chat from './chat.svg'
import clipboard from './clipboard.svg'
import offer from './offer.svg'
import notifications from './notifications.svg'

const Features = () => {
  const [activeFeature, setActiveFeature] = useState('listing');

  const featureDetails = {
    listing: {
      title: 'For Listing Agents',
      subtitle: 'Streamline your listings and close deals faster',
      points: [
        {
          text: 'Upload and organize disclosure documents with AI-powered analysis',
          icon: clipboard,
        },
        {
          text: 'Track buyer engagement and document views in real-time',
          icon: chart,
        },
        {
          text: 'Receive and manage offers through a centralized dashboard',
          icon: offer,
        },
        {
          text: 'Communicate securely with buyers and their agents',
          icon: chat,
        },
        {
          text: 'Generate professional listing agreements and contracts',
          icon: notifications,
        },
      ],
    },
    buyer: {
      title: 'For Buyer\'s Agents',
      subtitle: 'Make competitive offers and win more deals',
      points: [
        {
          text: 'Access disclosure documents instantly, 24/7',
          icon: clipboard,
        },
        {
          text: 'Submit professional offers with all required documents attached',
          icon: offer,
        },
        {
          text: 'Track offer status and receive instant notifications',
          icon: notifications,
        },
        {
          text: 'Communicate directly with listing agents through the platform',
          icon: chat,
        },
        {
          text: 'Monitor listing activity and buyer interest levels',
          icon: chart,
        },
      ],
    },
  };

  return (
    <div className="features-section">
      <h2 className="features-title">Built for Real Estate Professionals</h2>
      <div className="features-feature-toggle">
        <button
          className={`features-toggle-btn features-toggle-btn-left ${activeFeature === 'listing' ? 'active' : ''}`}
          onClick={() => setActiveFeature('listing')}
        >
          Listing Agents
        </button>
        <button
          className={`features-toggle-btn features-toggle-btn-right ${activeFeature === 'buyer' ? 'active' : ''}`}
          onClick={() => setActiveFeature('buyer')}
        >
          Buyer's Agents
        </button>
      </div>
      <div className="feature-content">
        <div className="feature-details">
          <div className="feature-header">
            <h3 className="feature-role-title">{featureDetails[activeFeature].title}</h3>
            <p className="feature-role-subtitle">{featureDetails[activeFeature].subtitle}</p>
          </div>
          {featureDetails[activeFeature].points.map((point, index) => (
            <div key={index} className="feature-point">
              <img src={point.icon} alt="" className="feature-point-icon" />
              <p>{point.text}</p>
            </div>
          ))}
          <Link to="/signup" className="sign-up-btn">Start Free Trial</Link> 
        </div>
      </div>
    </div>
  );
};

export default Features;
