// src/components/LandingPage/components/Hero/Hero.js

import React from 'react';
import { Link } from 'react-router-dom';
import './Hero.css';

function Hero() {
  return (
    <section className="hero">
      <div className="hero-content">
        <h1 className="hero-title">Streamline Your Real Estate Transactions</h1>
        <p className="hero-subtitle">Powerful tools for listing agents and buyer's agents</p>
        <div className="hero-cta-container">
          <Link to="/signup" className="hero-cta">Get Started</Link>
          <Link to="/demo" className="hero-secondary-cta">Watch Demo</Link>
        </div>
      </div>
      <div className="hero-image">
        {/* This is a placeholder. Replace with an actual image or illustration */}
        <div className="hero-image-placeholder"></div>
      </div>
    </section>
  );
}

export default Hero;