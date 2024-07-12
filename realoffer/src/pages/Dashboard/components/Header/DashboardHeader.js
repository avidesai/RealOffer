// DashboardHeader.js

import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import './DashboardHeader.css';
import logo from '../../../../assets/images/logo.svg';
import avatar from '../../../../assets/images/avatar.svg';

function DashboardHeader({ activeTab, setActiveTab }) {
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

  const handleUpgradeClick = () => {
    navigate('/upgrade');
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
          onClick={() => setActiveTab('listings')}
        />
      </div>

      <nav className="header-nav">
        <button
          onClick={() => setActiveTab('listings')}
          className={`header-nav-btn ${activeTab === 'listings' ? 'active' : ''}`}
        >
          My Listings
        </button>
        <button
          onClick={() => setActiveTab('buyers')}
          className={`header-nav-btn ${activeTab === 'buyers' ? 'active' : ''}`}
        >
          For Buyers
        </button>
      </nav>

      <div className="header-actions">
        {user && !user.isPremium && (
          <button className="header-upgrade-btn" onClick={handleUpgradeClick}>
            Upgrade to Pro
          </button>
        )}
        <div className="user-avatar" onClick={handleDropdown}>
          <img src={user.profilePhotoUrl || avatar} alt="User Avatar" />
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

export default DashboardHeader;
