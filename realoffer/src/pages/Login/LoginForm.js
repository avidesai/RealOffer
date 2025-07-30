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
  const [generalError, setGeneralError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
    // Clear specific field errors and general error when user starts typing
    clearErrors();
  };

  const clearErrors = () => {
    setErrors({});
    setGeneralError('');
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const parseAuthError = (error) => {
    if (!error.response) {
      // Network error or no response
      return {
        type: 'network',
        message: 'Unable to connect to server. Please check your internet connection and try again.'
      };
    }

    const status = error.response.status;
    const errorMessage = error.response.data?.message?.toLowerCase() || '';

    switch (status) {
      case 400:
        // Bad request - validation errors
        if (errorMessage.includes('email') && errorMessage.includes('required')) {
          return {
            type: 'email',
            message: 'Email address is required'
          };
        } else if (errorMessage.includes('password') && errorMessage.includes('required')) {
          return {
            type: 'password',
            message: 'Password is required'
          };
        } else {
          return {
            type: 'validation',
            message: 'Please check your information and try again'
          };
        }
      case 401:
        // Unauthorized - could be invalid credentials
        // Handle generic "Invalid email or password" messages
        if (errorMessage.includes('invalid email or password') || 
            errorMessage.includes('invalid credentials') ||
            errorMessage.includes('email or password')) {
          return {
            type: 'credentials',
            message: 'Invalid email or password. Please check your credentials and try again.'
          };
        } else if (errorMessage.includes('email') && errorMessage.includes('not found')) {
          return {
            type: 'email',
            message: 'No account found with this email address'
          };
        } else if (errorMessage.includes('password') && !errorMessage.includes('email')) {
          return {
            type: 'password',
            message: 'Incorrect password. Please try again.'
          };
        } else if (errorMessage.includes('verify your email') || error.response.data?.emailNotVerified) {
          return {
            type: 'email_verification',
            message: 'Please verify your email address before logging in. Check your inbox for a verification link.',
            emailNotVerified: true
          };
        } else {
          return {
            type: 'credentials',
            message: 'Invalid email or password. Please check your credentials and try again.'
          };
        }
      case 403:
        // Forbidden - account issues
        return {
          type: 'account',
          message: 'Account access denied. Please contact support if this continues.'
        };
      case 429:
        // Too many requests
        return {
          type: 'rate_limit',
          message: 'Too many login attempts. Please wait a few minutes and try again.'
        };
      case 500:
        // Server error
        return {
          type: 'server',
          message: 'Server error. Please try again later.'
        };
      default:
        return {
          type: 'unknown',
          message: error.response.data?.message || 'Login failed. Please try again.'
        };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    setGeneralError('');
    setErrors({});

    try {
      const userData = await login(formData.email, formData.password);
      console.log('Login response:', userData);
      
      if (userData && (userData._id || userData.id)) {
        setSuccessMessage('Logged in successfully');
        setTimeout(() => navigate('/dashboard'), 1500);
      } else {
        throw new Error('User data is incomplete');
      }
    } catch (error) {
      console.error('Log In Error:', error);
      
      const parsedError = parseAuthError(error);
      
      switch (parsedError.type) {
        case 'email':
          setErrors({ email: parsedError.message });
          break;
        case 'password':
          setErrors({ password: parsedError.message });
          break;
        case 'email_verification':
          setGeneralError(parsedError.message);
          break;
        case 'credentials':
          setGeneralError(parsedError.message);
          break;
        case 'network':
        case 'server':
        case 'rate_limit':
        case 'account':
        case 'unknown':
        default:
          setGeneralError(parsedError.message);
          break;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    // Prevent form submission on Enter if there are validation errors
    if (e.key === 'Enter' && (Object.keys(errors).length > 0 || generalError)) {
      e.preventDefault();
    }
  };

  return (
    <div className="log-form">
      <h1 className="log-title">Log In</h1>
      {successMessage && (
        <div className="log-alert log-alert-success">
          {successMessage}
        </div>
      )}
      {generalError && (
        <div className="log-alert log-alert-danger">
          {generalError}
        </div>
      )}
      <form onSubmit={handleSubmit} className="log-form-inner" onKeyDown={handleKeyDown}>
        <div className="log-form-group">
          <label htmlFor="email" className="log-label">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={`log-input ${errors.email ? 'log-input-invalid' : ''}`}
            placeholder="Enter your email address"
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
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="log-password-toggle"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          {errors.password && <div className="log-error">{errors.password}</div>}
        </div>
        <button type="submit" className="log-button" disabled={isLoading}>
          {isLoading ? 'Logging in...' : 'Log In'}
        </button>
      </form>
      <div className="log-footer">
        <p>Need an account? <Link to="/signup">Sign Up</Link></p>
        <p><Link to="/forgot-password">Forgot Password?</Link></p>
      </div>
    </div>
  );
}

export default LoginForm;