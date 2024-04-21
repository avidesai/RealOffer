import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './SignupForm.css'; // Ensure the path is correct

function SignupForm() {
  const [name, setName] = useState(''); // New state variable for name
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle signup logic here
  };

  return (
    <form className="signup-form" onSubmit={handleSubmit}>
      <h1 className="signup-title">Sign Up</h1>
      <div className="input-group">
        <label htmlFor="name">Name</label> {/* New label for name */}
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)} // New onChange handler for name
        />
      </div>
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
      <div className="input-group">
        <label htmlFor="confirm-password">Confirm Password</label>
        <input
          type="password"
          id="confirm-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>
      <button type="submit" className="signup-button">SIGN UP</button>
      <div className="signup-footer">
        <p>Already have an account? <Link to="/login">Log In</Link></p>
      </div>
      <hr className="divider"/>
    </form>
  );
}

export default SignupForm;