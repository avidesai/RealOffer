// src/components/LandingPage/components/Hero/Hero.js
import React from 'react';
import { Link } from 'react-router-dom'; // Import Link
import './Hero.css';

function Hero() {
  return (
    <section className="hero">
      <div className="hero-content">
        <h1 className="hero-title">Welcome to RealOffer</h1>
        <p className="hero-subtitle">Your ultimate real estate transaction toolkit.</p>
        <Link to="/signup" className="hero-cta">Sign Up For Free</Link> {/* Use Link instead of a */}
      </div>
    </section>
  );
}

export default Hero;