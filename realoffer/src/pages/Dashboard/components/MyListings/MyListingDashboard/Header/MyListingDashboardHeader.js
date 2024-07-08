// MyListingDashboardHeader.js

import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../../../context/AuthContext';
import './MyListingDashboardHeader.css';
import logo from '../../../../../../../src/assets/images/logo.svg';
import avatar from '../../../../../../../src/assets/images/avatar.svg';

function MyListingDashboardHeader({ onBackClick }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="dashboard-header">
      <div className="header-left">
        <img
          src={logo}
          alt="RealOffer Logo"
          className="header-logo"
          onClick={() => navigate('/dashboard')}
        />
        <button className="back-to-dashboard" onClick={onBackClick}>
          &larr; Back to Dashboard
        </button>
      </div>

      <div className="header-actions">
        {user && !user.isPremium && (
          <button className="header-upgrade-btn">Upgrade to Pro</button>
        )}
        <div className="user-avatar" onClick={handleDropdown}>
          <img src={avatar} alt="User Avatar" />
          {user && (
            <div className="user-info">
              <span className="user-name">{user.firstName}</span>
              <span className="user-email">{user.email}</span>
            </div>
          )}
        </div>
        {isDropdownOpen && (
          <div className="dropdown-menu" ref={dropdownRef}>
            <Link to="/profile" className="dropdown-item">Profile</Link>
            <Link to="/settings" className="dropdown-item">Settings</Link>
            <Link to="/help" className="dropdown-item">Help Center</Link>
            <Link to="/" onClick={handleLogout} className="dropdown-item">Logout</Link>
          </div>
        )}
      </div>
    </header>
  );
}

export default MyListingDashboardHeader;
