// CTA.js

import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import EmailContext from './EmailContext';
import './CTA.css';
import chart from './chart.svg';

const CTA = () => {
  const { setEmail } = useContext(EmailContext);
  let inputRef = React.createRef();

  const handleClick = () => {
    setEmail(inputRef.current.value);
  };
  return (
    <section className="cta-section">
      <h2 className="cta-title">It's easy to get started, and it's free!</h2>
      <div className="cta-subtitle">
        <img src={chart} alt="" className="cta-subtitle-icon" />
        <p>Maximize your next real estate transaction using AI</p>
      </div>
      <div className="cta-input-group">
        <input ref={inputRef} type="email" className="cta-input" placeholder="Enter Your Email to Get Started" />
        <Link onClick={handleClick} to="/signup" className="cta-button">Sign Up Now</Link>
      </div>
    </section>
  );
};

export default CTA;