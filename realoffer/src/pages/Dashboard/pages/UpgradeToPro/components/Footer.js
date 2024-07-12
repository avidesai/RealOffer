// Footer.js

import React from 'react';
import { Link } from 'react-router-dom'; // Import Link component
import './Footer.css';
import logo from '../../../../../assets/images/logo.svg';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-text">
        <img src={logo} alt="RealOffer Logo" className="footer-logo" />
        <p>RealOffer © {new Date().getFullYear()}</p>
      </div>
      <div className="footer-socials">

      </div>
    </footer>
  );
};

export default Footer;