// Footer.js

import React from 'react';
import { Link } from 'react-router-dom'; // Import Link component
import './Footer.css';
import logo from '../../assets/images/logo.svg'; // Update the path to your logo image

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-text">
        <Link to="/"> {/* Wrap the logo with Link component pointing to the homepage */}
          <img src={logo} alt="RealOffer Logo" className="footer-logo" />
        </Link>
        <p>RealOffer © {new Date().getFullYear()}</p>
      </div>
      <div className="footer-socials">

      </div>
    </footer>
  );
};

export default Footer;