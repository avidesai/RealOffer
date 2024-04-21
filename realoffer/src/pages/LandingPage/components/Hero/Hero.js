// src/components/LandingPage/components/Hero/Hero.js
import React from 'react';
import './Hero.css';

function Hero() {
  return (
    <section className="hero">
      <div className="hero-content">
        <h1 className="hero-title">Welcome to RealOffer</h1>
        <p className="hero-subtitle">Your ultimate real estate transaction toolkit.</p>
        <a href="#signup" className="hero-cta">Sign Up For Free</a>
      </div>
    </section>
  );
}

export default Hero;
