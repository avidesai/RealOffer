import React from 'react';
import './CTA.css';
import chart from './chart.svg'; // Replace with the actual path to your icon

const CTA = () => {
  return (
    <section className="cta-section">
      <h2 className="cta-title">It's easy to get started, and it's free!</h2>
      <div className="cta-subtitle">
        <img src={chart} alt="" className="cta-subtitle-icon" />
        <p>Maximize your next real estate transaction using AI</p>
      </div>
      <div className="cta-input-group">
        <input type="email" className="cta-input" placeholder="Enter Your Email to Get Started" />
        <button className="cta-button">Sign Up Now</button>
      </div>
    </section>
  );
};

export default CTA;
