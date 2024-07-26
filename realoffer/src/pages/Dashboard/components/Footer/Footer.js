// Footer.js

import React from 'react';
import './Footer.css';
import logo from '../../../../assets/images/logo.svg';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-text">
        <img src={logo} alt="RealOffer Logo" className="footer-logo" />
        <p>RealOffer</p>
      </div>
    </footer>
  );
};

export default Footer;