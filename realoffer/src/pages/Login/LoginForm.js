import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Import useNavigate 
import google from './google.svg'; // Ensure the path is correct
import docusign from './docusign.svg'; // Ensure the path is correct
import './LoginForm.css';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle login logic here
    navigate('/dashboard');
  };

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <h1 className="login-title">Login</h1>
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
