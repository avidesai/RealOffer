import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage/LandingPage';
import EmailContext from './pages/LandingPage/components/CTA/EmailContext';
import Login from './pages/Login/Login';
import Signup from './pages/Signup/Signup';
import FeaturesPage from './pages/Features/FeaturesPage';
import Dashboard from './pages/Dashboard/Dashboard';
import Profile from './pages/Dashboard/pages/Profile/Profile';
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
          {/* Add other routes here as needed */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} /> 
          {/* Removed the route for create-listing-package as it's now handled within the Dashboard component */}
        </Routes>
      </Router>
    </EmailContext.Provider>
  );
}

export default App;
