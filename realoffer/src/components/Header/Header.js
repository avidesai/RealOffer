// src/components/Header/Header.js

import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Header.css';
import logo from '../../assets/images/logo.svg';
import { useAuth } from '../../context/AuthContext';

function Header() {
  const { user, logout, checkAuthStatus } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const handleLoginClick = (e) => {
    if (user) {
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
    <header className="header">
      <Link to="/">
        <img src={logo} alt="RealOffer Logo" className="header-logo" />
      </Link>
      <div className="header-group">
        <nav className="header-navigation">
          <Link to="/features" className="header-link">Features</Link>
        </nav>
        <div className="header-divider"></div>
        <div className="header-actions">
          <Link to="/login" className="header-link" onClick={handleLoginClick}>
            {user ? 'Dashboard' : 'Log In'}
          </Link>
          {user ? (
            <button className="header-logout-button" onClick={handleLogoutClick}>
              Log Out
            </button>
          ) : (
            <Link to="/signup" className="header-signup-button">Sign Up</Link>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;