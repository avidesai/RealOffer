// src/components/Header/Header.js

import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import './Header.css';
import logo from '../../assets/images/logo.svg';
import { useAuth } from '../../context/AuthContext';

function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLoginClick = (e) => {
    // Don't redirect if user is on public facing listing page
    if (user && !location.pathname.includes('/listings/public/')) {
      e.preventDefault();
      navigate('/dashboard');
    }
  };

  const handleLogoutClick = (e) => {
    e.preventDefault();
    logout();
    navigate('/');
  };

  return (
    <header className="main-header">
      <Link to="/">
        <img src={logo} alt="RealOffer Logo" className="main-header-logo" />
      </Link>
      <div className="main-header-group">
        <nav className="main-header-navigation">
          <Link to="/features" className="main-header-link">Features</Link>
        </nav>
        <div className="main-header-divider"></div>
        <div className="main-header-actions">
          {/* Log In link redirects to /dashboard if the user is logged in */}
          <Link to="/login" className="main-header-link" onClick={handleLoginClick}>
            {user ? 'Dashboard' : 'Log In'}
          </Link>
          {/* If the user is logged in, show Logout, otherwise show Sign Up */}
          {user ? (
            <button className="main-header-logout-button" onClick={handleLogoutClick}>
              Log Out
            </button>
          ) : (
            <Link to="/signup" className="main-header-signup-button">Sign Up</Link>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;