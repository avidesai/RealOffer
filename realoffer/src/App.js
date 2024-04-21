// src/App.js
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage/LandingPage';
import EmailContext from './pages/LandingPage/components/CTA/EmailContext';
import Login from './pages/Login/Login';
import Signup from './pages/Signup/Signup';
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
          {/* Add other routes here as needed */}
        </Routes>
      </Router>
    </EmailContext.Provider>
    
  );
}

export default App;
