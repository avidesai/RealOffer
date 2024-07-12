import React from 'react';
import { useNavigate } from 'react-router-dom';
import './UpgradeHeader.css';
import logo from '../../../../../../src/assets/images/logo.svg';

function UpgradeHeader({ onBackClick }) {
  const navigate = useNavigate();

  const handleBackClick = () => {
    navigate('/dashboard');
  };

  return (
    <header className="upgrade-header">
      <div className="header-left">
        <img
          src={logo}
          alt="RealOffer Logo"
          className="header-logo"
          onClick={handleBackClick}
        />
        <button className="back-to-dashboard" onClick={handleBackClick}>
          &larr; Back to Dashboard
        </button>
      </div>
    </header>
  );
}

export default UpgradeHeader;
