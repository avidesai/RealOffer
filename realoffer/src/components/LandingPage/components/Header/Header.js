// src/components/LandingPage/components/Header/Header.js
import React from 'react';
import './Header.css';
import logo from '../../../../assets/images/logo.svg'; // Update the path to your logo image

function Header() {
  return (
    <header className="header">
      <img src={logo} alt="RealOffer Logo" className="header-logo" />
      <nav className="header-navigation">
        <a href="#features" className="header-link">Features</a>
        <a href="#services" className="header-link">Services</a>
        <a href="#pricing" className="header-link">Pricing</a>
      </nav>
      <div className="header-actions">
        <a href="#login" className="header-link">Log In</a>
        <a href="#signup" className="header-button">Sign Up</a>
      </div>
    </header>
  );
}

export default Header;
