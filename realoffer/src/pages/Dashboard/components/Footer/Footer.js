// Footer.js

import React from 'react';
import { Twitter, Linkedin, Instagram } from 'lucide-react';
import './Footer.css';
import logo from '../../../../assets/images/logo.svg';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-text">
        <img src={logo} alt="RealOffer Logo" className="footer-logo" />
        <p>RealOffer - Modern Real Estate Solutions</p>
      </div>
      <div className="footer-socials">
        <a href="https://twitter.com/realoffer" target="_blank" rel="noopener noreferrer">
          <Twitter />
        </a>
        <a href="https://linkedin.com/company/realoffer" target="_blank" rel="noopener noreferrer">
          <Linkedin />
        </a>
        <a href="https://instagram.com/realoffer" target="_blank" rel="noopener noreferrer">
          <Instagram />
        </a>
      </div>
    </footer>
  );
};

export default Footer;