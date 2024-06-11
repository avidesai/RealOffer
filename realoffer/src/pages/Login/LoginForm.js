// /Login/LoginForm.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import google from './google.svg'; // Ensure these paths are correct
import docusign from './docusign.svg';
import './LoginForm.css';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState(''); // State to hold login error messages
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(''); // Clear any existing errors
    try {
      const response = await axios.post('http://localhost:8000/api/users/login', { email, password });
      if (response.data) {
        console.log('Login successful:', response.data);
        navigate('/dashboard'); // Navigate to dashboard on successful login
      }
    } catch (error) {
      console.error('Error logging in:', error.response?.data?.message || 'Server error');
      setErrorMessage(error.response?.data?.message || 'Login failed, please try again.'); // Display error message
    }
  };

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <h1 className="login-title">Login</h1>
      {errorMessage && <p className="error-message">{errorMessage}</p>} {/* Display error messages */}
      <div className="input-group">
        <label htmlFor="email">Email</label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="input-group">
        <label htmlFor="password">Password</label>
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <button type="submit" className="login-button">LOGIN</button>
      <div className="login-footer">
        <p>Need an account? <Link to="/signup">Sign Up</Link></p>
        <p><Link to="/reset-password">Reset Password</Link></p>
      </div>
      <hr className="divider"/>
      <p className="alternative-login-text">Other ways to login</p>
      <div className="alternative-login-methods">
        <button className="google-button">
          <img src={google} alt="Google logo" className="logo" />
          Google
        </button>
        <button className="docuSign-button">
          <img src={docusign} alt="DocuSign logo" className="logo" />
          DocuSign
        </button>
        {/* More buttons can be added here */}
      </div>
    </form>
  );
}

export default LoginForm;
