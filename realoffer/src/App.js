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
import PrivateRoute from './PrivateRoute'; // Import PrivateRoute component
import './App.css'; // Your global styles

function App() {
  const [email, setEmail] = useState('');

  return (
    <EmailContext.Provider value={{ email, setEmail }}>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path='/features' element={<FeaturesPage />} />
          {/* Protected Routes */}
          <Route path="/dashboard" element={<PrivateRoute element={Dashboard} />} />
          <Route path="/profile" element={<PrivateRoute element={Profile} />} />
          <Route path="/mylisting/:id" element={<PrivateRoute element={MyListingDashboard} />} />
          <Route path="/upgrade" element={<PrivateRoute element={UpgradeToPro} />} />
        </Routes>
      </Router>
    </EmailContext.Provider>
  );
}

export default App;
