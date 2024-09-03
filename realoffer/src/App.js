// App.js

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage/LandingPage';
import EmailContext from './pages/LandingPage/components/CTA/EmailContext';
import Login from './pages/Login/Login';
import Signup from './pages/Signup/Signup';
import FeaturesPage from './pages/Features/FeaturesPage';
import Dashboard from './pages/Dashboard/Dashboard';
import Profile from './pages/Dashboard/pages/Profile/Profile';
import MyListingDashboard from './pages/Dashboard/components/MyListings/MyListingDashboard/MyListingDashboard';
import UpgradeToPro from './pages/Dashboard/pages/UpgradeToPro/UpgradeToPro';
import { useAuth } from './context/AuthContext'; // Import useAuth hook
import './App.css'; // Your global styles

function PrivateRoute({ element: Component, ...rest }) {
  const { user, loading, checkDocusignConnection, docusignConnected } = useAuth();

  useEffect(() => {
    if (user && !docusignConnected) {
      checkDocusignConnection();
    }
  }, [user, docusignConnected, checkDocusignConnection]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return <Component {...rest} />;
}

function App() {
  const [email, setEmail] = useState('');

  return (
    <EmailContext.Provider value={{ email, setEmail }}>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/features" element={<FeaturesPage />} />
          {/* Protected Routes */}
          <Route path="/dashboard" element={<PrivateRoute element={Dashboard} />} />
          <Route path="/profile" element={<PrivateRoute element={Profile} />} />
          <Route path="/mylisting/:id" element={<PrivateRoute element={MyListingDashboard} />} />
          <Route path="/upgrade" element={<PrivateRoute element={UpgradeToPro} />} />
          {/* DocuSign Callback Route */}
          <Route path="/docusign/callback" element={<PrivateRoute element={Dashboard} />} />
        </Routes>
      </Router>
    </EmailContext.Provider>
  );
}

export default App;
