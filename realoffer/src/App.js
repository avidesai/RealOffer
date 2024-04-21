// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage/LandingPage'; // Adjust the import paths as necessary
import Login from './pages/Login/Login';
import Signup from './pages/Signup/Signup';
import './App.css'; // Your global styles

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        {/* Add other routes here as needed */}
      </Routes>
    </Router>
  );
}

export default App;
