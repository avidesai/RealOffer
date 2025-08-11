// BuyerPackageDashboardHeader.js

import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../../../../../context/AuthContext';
import { hasPremiumAccess } from '../../../../../../utils/trialUtils';
import './BuyerPackageDashboardHeader.css';
import logo from '../../../../../../../src/assets/images/logo.svg';
import Avatar from '../../../../../../components/Avatar/Avatar';

function BuyerPackageDashboardHeader({ onBackClick }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [userData, setUserData] = useState({});
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleLogout = async () => {
    await logout();
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

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/users/${user._id}`);
        setUserData(response.data);
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, [user._id]);

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
        {userData && !hasPremiumAccess(userData) && (
          <button className="header-upgrade-btn" onClick={handleUpgradeClick}>
            Upgrade to Pro
          </button>
        )}
        <div className="user-avatar" onClick={handleDropdown}>
          <Avatar 
            src={userData.profilePhotoUrl}
            firstName={userData.firstName}
            lastName={userData.lastName}
            size="medium"
            alt="User Avatar"
          />
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
            <Link to="/" onClick={handleLogout} className="dropdown-item">Log Out</Link>
          </div>
        )}
      </div>
    </header>
  );
}

export default BuyerPackageDashboardHeader; 