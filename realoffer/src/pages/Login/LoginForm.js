// LoginForm.js

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import './LoginForm.css';

function LoginForm() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [networkError, setNetworkError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
    setErrors(prevErrors => ({
      ...prevErrors,
      [name]: ''
    }));
    setNetworkError('');
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    if (!formData.password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    setNetworkError('');
    try {
      const userData = await login(formData.email, formData.password);
      console.log('Login response:', userData); // For debugging
      if (userData && (userData._id || userData.id)) {
        setSuccessMessage('Login successful! Redirecting to dashboard...');
        setTimeout(() => navigate('/dashboard'), 2000);
      } else {
        throw new Error('User data is incomplete');
      }
    } catch (error) {
      console.error('Login error:', error);
      if (error.response) {
        setErrors({ form: error.response.data.message || 'Login failed. Please try again.' });
      } else if (error.request) {
        setNetworkError('Unable to connect to the server. Please check your internet connection and try again.');
      } else {
        setNetworkError('An unexpected error occurred. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="log-form">
      <h1 className="log-title">Login</h1>
      {successMessage && (
        <div className="log-alert log-alert-success">
          {successMessage}
        </div>
      )}
      <form onSubmit={handleSubmit} className="log-form-inner">
        <div className="log-form-group">
          <label htmlFor="email" className="log-label">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={`log-input ${errors.email ? 'log-input-invalid' : ''}`}
          />
          {errors.email && <div className="log-error">{errors.email}</div>}
        </div>
        <div className="log-form-group">
          <label htmlFor="password" className="log-label">Password</label>
          <div className="log-password-field">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={`log-input ${errors.password ? 'log-input-invalid' : ''}`}
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="log-password-toggle"
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          {errors.password && <div className="log-error">{errors.password}</div>}
        </div>
        <button type="submit" className="log-button" disabled={isLoading}>
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      {errors.form && (
        <div className="log-alert log-alert-danger">
          {errors.form}
        </div>
      )}
      {networkError && (
        <div className="log-alert log-alert-danger">
          {networkError}
        </div>
      )}
      <div className="log-footer">
        <p>Need an account? <Link to="/signup">Sign Up</Link></p>
        <p><Link to="/reset-password">Reset Password</Link></p>
      </div>
    </div>
  );
}

export default LoginForm;