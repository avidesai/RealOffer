// Footer.js

import React from 'react';
import './Footer.css';
import { ReactComponent as FacebookIcon } from './facebook.svg';
import { ReactComponent as TwitterIcon } from './twitter.svg';
import { ReactComponent as LinkedInIcon } from './linkedin.svg';
import logo from '../../assets/images/logo.svg'; // Update the path to your logo image

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-text">
        <img src={logo} alt="" className="footer-logo" />
        <p>RealOffer © {new Date().getFullYear()}</p>
      </div>
      <div className="footer-socials">
        <LinkedInIcon />
        <FacebookIcon />
        <TwitterIcon />
      </div>
    </footer>
  );
};

export default Footer;