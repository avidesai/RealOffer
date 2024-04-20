import React from 'react';
import './CTA.css';

const CTA = () => {
  return (
    <section className="cta-section">
      <h2 className="cta-title">It's easy to get started, and it's free!</h2>
      <p className="cta-subtitle">Maximize your next real estate transaction using AI</p>
      <div className="cta-input-group">
        <input type="email" className="cta-input" placeholder="Enter Your Email to Get Started" />
        <button className="cta-button">Sign Up Now</button>
      </div>
    </section>
  );
};

export default CTA;
