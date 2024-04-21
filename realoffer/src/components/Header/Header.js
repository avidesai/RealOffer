// src/components/Header/Header.js
import React from 'react';
import { Link } from 'react-router-dom'; // Import Link
import './Header.css';
import logo from '../../assets/images/logo.svg'; // Update the path to your logo image

function Header() {
  return (
    <header className="header">
      <Link to="/">
        <img src={logo} alt="RealOffer Logo" className="header-logo" />
      </Link>
      <nav className="header-navigation">
        <Link to="/features" className="header-link">Features</Link>
        <Link to="/services" className="header-link">Services</Link>
        <Link to="/pricing" className="header-link">Pricing</Link>
      </nav>
      <div className="header-actions">
        <Link to="/login" className="header-link">Log In</Link>
        <Link to="/signup" className="header-button">Sign Up</Link>
      </div>
    </header>
  );
}

export default Header;