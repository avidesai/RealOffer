// HowItWorks.js

import React, { useState } from 'react';
import './HowItWorks.css';

const HowItWorks = () => {
  const [activeSection, setActiveSection] = useState('sell');

  const details = {
    sell: [
      'List your home using our intuitive online forms.',
      'Review and manage offers and inquiries through our user-friendly dashboard.',
      'Finalize the sale with secure, digital transaction processing.'
    ],
    buy: [
      'Search and compare homes with our comprehensive database.',
      'Make offers online with guidance from our smart tools.',
      'Complete your purchase with confidence through our streamlined process.'
    ],
  };

  return (
    <div className="how-it-works-section">
      <h2 className="how-it-works-title">How It Works</h2>
      <div className="how-it-works-toggle">
        <button
          className={`toggle-btn toggle-btn-left ${activeSection === 'sell' ? 'active' : ''}`}
          onClick={() => setActiveSection('sell')}
        >
          For Sellers
        </button>
        <button
          className={`toggle-btn toggle-btn-right ${activeSection === 'buy' ? 'active' : ''}`}
          onClick={() => setActiveSection('buy')}
        >
          For Buyers
        </button>
      </div>
      <div className="how-it-works-content">
        {details[activeSection].map((detail, index) => (
          <p key={index} className="how-it-works-point">{detail}</p>
        ))}
      </div>
    </div>
  );
};

export default HowItWorks;
