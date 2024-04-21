import React, { useState } from 'react';
import './Login.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle login logic here
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <h1 className="login-title">Login</h1>
        <div className="input-group">
          <label htmlFor="email">EMAIL</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="input-group">
          <label htmlFor="password">PASSWORD</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit" className="login-button">LOGIN</button>
        <div className="login-footer">
          <p>Need an account? <a href="/signup">Sign Up</a></p>
          <p><a href="/reset-password">Reset Password</a></p>
        </div>
        <hr className="divider"/>
        <p className="alternative-login-text">Other ways to login</p>
        <div className="alternative-login-methods">
          <button className="google-button">Google</button>
          <button className="docuSign-button">DocuSign</button>
          {/* More buttons can be added here */}
        </div>
      </form>
    </div>
  );
}

export default Login;
