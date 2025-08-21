// App.js

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage/LandingPage';
import EmailContext from './pages/LandingPage/components/CTA/EmailContext';
import Login from './pages/Login/Login';
import Signup from './pages/Signup/Signup';
import FeaturesPage from './pages/Features/FeaturesPage';
import PublicFacingListing from './pages/PublicFacingListing/PublicFacingListing';
import EmailVerification from './pages/EmailVerification/EmailVerification';
import PasswordReset from './pages/PasswordReset/PasswordReset';
import ForgotPassword from './pages/ForgotPassword/ForgotPassword';
import Dashboard from './pages/Dashboard/Dashboard';
import Profile from './pages/Dashboard/pages/Profile/Profile';
import MyListingDashboard from './pages/Dashboard/components/MyListings/MyListingDashboard/MyListingDashboard';
import BuyerPackageDashboard from './pages/Dashboard/components/ForBuyers/BuyerPackageDashboard/BuyerPackageDashboard';
import UpgradeToPro from './pages/Dashboard/pages/UpgradeToPro/UpgradeToPro';
import ManageSubscription from './pages/Dashboard/pages/ManageSubscription/ManageSubscription';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';
import { useAuth } from './context/AuthContext'; // Import useAuth hook
import './App.css'; // Your global styles

// Helper function to load Google Places API asynchronously with async and defer
const loadGooglePlacesScript = (callback) => {
  const existingScript = document.getElementById('google-places-script');
  if (!existingScript) {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_API_KEY}&libraries=places`;
    script.id = 'google-places-script';
    script.async = true; // Load script asynchronously
    script.defer = true; // Defer script loading
    document.body.appendChild(script);
    script.onload = () => {
      if (callback) callback();
    };
  } else if (callback) callback();
};

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

  useEffect(() => {
    loadGooglePlacesScript(); // Load Google Places API when the app starts
  }, []);

  return (
    <EmailContext.Provider value={{ email, setEmail }}>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/listings/public/:token" element={
            <ErrorBoundary>
              <PublicFacingListing />
            </ErrorBoundary>
          } />
          <Route path="/verify-email" element={<EmailVerification />} />
          <Route path="/reset-password" element={<PasswordReset />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          {/* Protected Routes */}
          <Route path="/dashboard" element={<PrivateRoute element={Dashboard} />} />
          <Route path="/profile" element={<PrivateRoute element={Profile} />} />
          <Route path="/mylisting/:id" element={<PrivateRoute element={MyListingDashboard} />} />
          <Route path="/buyerpackage/:id" element={<PrivateRoute element={BuyerPackageDashboard} />} />
          <Route path="/upgrade" element={<PrivateRoute element={UpgradeToPro} />} />
          <Route path="/dashboard/manage-subscription" element={<PrivateRoute element={ManageSubscription} />} />
          {/* DocuSign Callback Route */}
          <Route path="/docusign/callback" element={<PrivateRoute element={Dashboard} />} />
        </Routes>
      </Router>
    </EmailContext.Provider>
  );
}

export default App;
