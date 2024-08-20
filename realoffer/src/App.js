// App.js

import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage/LandingPage';
import EmailContext from './pages/LandingPage/components/CTA/EmailContext';
import Login from './pages/Login/Login';
import Signup from './pages/Signup/Signup';
import FeaturesPage from './pages/Features/FeaturesPage';
import Dashboard from './pages/Dashboard/Dashboard';
import Profile from './pages/Dashboard/pages/Profile/Profile';
import MyListingDashboard from './pages/Dashboard/components/MyListings/MyListingDashboard/MyListingDashboard';
import UpgradeToPro from './pages/Dashboard/pages/UpgradeToPro/UpgradeToPro';
import './App.css'; // Your global styles

import useSpeedInsights from './speed-insights'; // Import the custom hook

function App() {
  const [email, setEmail] = useState('');
  
  useSpeedInsights(); // Invoke the hook here

  return (
    <EmailContext.Provider value={{ email, setEmail }}>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path='/features' element={<FeaturesPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/mylisting/:id" element={<MyListingDashboard />} /> {/* New Route */}
          <Route path="/upgrade" element={<UpgradeToPro />} />
        </Routes>
      </Router>
    </EmailContext.Provider>
  );
}

export default App;
