import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './DashboardHeader.css';
import logo from '../../../../assets/images/logo.svg';
import avatar from '../../../../assets/images/avatar.svg'; // Replace with path to your avatar image

function DashboardHeader({ activeTab, setActiveTab }) {
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const dropdownRef = useRef(null); // Add this line

  const handleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  // Add this useEffect hook
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
      <img
        src={logo}
        alt="RealOffer Logo"
        className="header-logo"
        onClick={() => setActiveTab('listings')}
      />

      <div className="header-toggle">
        <button
          onClick={() => setActiveTab('listings')}
          className={`header-toggle-btn ${activeTab === 'listings' ? 'active' : ''}`}
        >
          My Listings
        </button>
        <button
          onClick={() => setActiveTab('buyers')}
          className={`header-toggle-btn ${activeTab === 'buyers' ? 'active' : ''}`}
        >
          For Buyers
        </button>
      </div>

      <div className="header-actions">
        <button className="header-button">Upgrade to Pro</button>
        <div className="user-avatar" onClick={handleDropdown}>
          <img src={avatar} alt="User Avatar" />
        </div>
        {isDropdownOpen && (
          <div className="dropdown-menu" ref={dropdownRef}>
            <Link to="/profile" className="dropdown-item">Profile</Link>
            <Link to="/settings" className="dropdown-item">Settings</Link>
            <Link to="/" className="dropdown-item">Logout</Link>
            {/* Add other dropdown items here */}
          </div>
        )}
      </div>
    </header>
  );
}

export default DashboardHeader;