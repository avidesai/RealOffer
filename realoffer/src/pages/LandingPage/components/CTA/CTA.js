// CTA.js

import React, { useContext, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import EmailContext from './EmailContext';
import './CTA.css';
import chart from './chart.svg';

const CTA = () => {
  const { setEmail } = useContext(EmailContext);
  const inputRef = useRef();

  const handleClick = () => {
    setEmail(inputRef.current.value);
  };

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth <= 1024) {
        inputRef.current.placeholder = 'Enter Your Email';
      } else {
        inputRef.current.placeholder = 'Enter Your Email to Get Started';
      }
    }

    window.addEventListener('resize', handleResize);
    handleResize(); // Call the function initially to set the correct placeholder

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

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