// DashboardHeader.js

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../../../context/AuthContext';
import './DashboardHeader.css';
import logo from '../../../../assets/images/logo.svg';
import avatar from '../../../../assets/images/avatar.svg';

function DashboardHeader({ activeTab, setActiveTab }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [userData, setUserData] = useState({});
  const [error, setError] = useState(null);
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  const handleDropdown = useCallback(() => {
    setIsDropdownOpen(prev => !prev);
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  const handleUpgradeClick = useCallback(() => {
    navigate('/upgrade');
  }, [navigate]);

  const handleClickOutside = useCallback((event) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setIsDropdownOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleClickOutside]);

  const fetchUserData = useCallback(async () => {
    if (!user || !user.id || !token) return;

    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/users/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setUserData(response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError('Failed to load user data. Please try again later.');
    }
  }, [user, token]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const handleTabClick = useCallback((tab) => {
    setActiveTab(tab);
  }, [setActiveTab]);

  return (
    <header className="dashboard-header">
      <div className="header-left">
        <img
          src={logo}
          alt="RealOffer Logo"
          className="header-logo"
          onClick={() => handleTabClick('listings')}
        />
      </div>
      <nav className="header-nav">
        <button
          onClick={() => handleTabClick('listings')}
          className={`header-nav-btn ${activeTab === 'listings' ? 'active' : ''}`}
        >
          My Listings
        </button>
        <button
          onClick={() => handleTabClick('buyers')}
          className={`header-nav-btn ${activeTab === 'buyers' ? 'active' : ''}`}
        >
          For Buyers
        </button>
      </nav>
      <div className="header-actions">
        {userData && !userData.isPremium && (
          <button className="header-upgrade-btn" onClick={handleUpgradeClick}>
            Upgrade to Pro
          </button>
        )}
        <div className="user-avatar" onClick={handleDropdown}>
          <img src={userData.profilePhotoUrl || avatar} alt="User Avatar" />
          {userData && (
            <div className="user-info">
              <span className="user-name">{userData.firstName}</span>
              <span className="user-email">{userData.email}</span>
            </div>
          )}
        </div>
        {isDropdownOpen && (
          <div className="dropdown-menu" ref={dropdownRef}>
            <Link to="/profile" className="dropdown-item">Profile</Link>
            <Link to="/settings" className="dropdown-item">Settings</Link>
            <Link to="/help" className="dropdown-item">Help Center</Link>
            <Link
              to="/login"
              onClick={(e) => {
                e.preventDefault();
                handleLogout();
              }}
              className="dropdown-item"
            >
              Logout
            </Link>
          </div>
        )}
      </div>
      {error && <div className="error-message">{error}</div>}
    </header>
  );
}

export default React.memo(DashboardHeader);
