// LoginForm.js

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import './LoginForm.css';

function LoginForm() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [isPasswordSetup, setIsPasswordSetup] = useState(false);
  const [isMinimalUserFlow, setIsMinimalUserFlow] = useState(false);
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
    
    // For password setup mode, require password validation
    if (isPasswordSetup) {
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters long';
      }
      
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    } else if (isMinimalUserFlow) {
      // For minimal user flow, no password validation needed
      // User will set password in the next step
    } else {
      // For normal login, require password
      if (!formData.password) {
        newErrors.password = 'Password is required';
      }
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
      // If this is password setup mode, handle differently
      if (isPasswordSetup) {
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/users/set-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password
          }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
          // Store authentication data
          localStorage.setItem('user', JSON.stringify(data.user));
          localStorage.setItem('token', data.token);
          
          setSuccessMessage('Password set successfully! Redirecting to dashboard...');
          setTimeout(() => navigate('/dashboard'), 1500);
        } else {
          throw new Error(data.message || 'Failed to set password');
        }
      } else {
        // Normal login flow
        const userData = await login(formData.email, formData.password);
        console.log('Login response:', userData);
        
        if (userData && (userData._id || userData.id)) {
          setSuccessMessage('Logged in successfully');
          setTimeout(() => navigate('/dashboard'), 1500);
        } else {
          throw new Error('User data is incomplete');
        }
      }
    } catch (error) {
      console.error('Log In Error:', error);
      
      // Check if this is a minimal user who needs to set a password
      if (error.response?.status === 401 && error.response?.data?.requiresPasswordSetup) {
        setIsPasswordSetup(true);
        setGeneralError('');
        return;
      }
      
      const parsedError = parseAuthError(error);
      
      switch (parsedError.type) {
        case 'email':
          setErrors({ email: parsedError.message });
          break;
        case 'password':
          setErrors({ password: parsedError.message });
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

  const checkMinimalUser = async () => {
    if (!formData.email.trim()) {
      setErrors({ email: 'Email is required' });
      return;
    }

    setIsLoading(true);
    setGeneralError('');
    setErrors({});

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/users/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.exists && data.user && data.user.isMinimalRegistration) {
        // User exists and is a minimal user
        setIsMinimalUserFlow(true);
        setGeneralError('');
      } else if (response.ok && data.exists) {
        // User exists but is not a minimal user
        setGeneralError('This account already has a password. Please use the normal login form.');
      } else {
        // User doesn't exist
        setGeneralError('No account found with this email address. Please sign up first.');
      }
    } catch (error) {
      console.error('Error checking user:', error);
      setGeneralError('Unable to check account status. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="log-form">
      <h1 className="log-title">
        {isPasswordSetup ? 'Set Your Password' : 
         isMinimalUserFlow ? 'Complete Your Account' : 'Log In'}
      </h1>
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
      
      {isMinimalUserFlow ? (
        // Minimal user flow - show password setup directly
        <div className="log-form-inner">
          <div className="log-form-group">
            <label htmlFor="email" className="log-label">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              className="log-input"
              disabled={true}
            />
          </div>
          
          <div className="log-minimal-user-notice">
            <p>Your account was created with minimal registration. Set a password to complete your account setup.</p>
          </div>
          
          <button 
            type="button" 
            className="log-button" 
            onClick={() => setIsPasswordSetup(true)}
            disabled={isLoading}
          >
            Set Password
          </button>
          
          <div className="log-footer">
            <p>Remember your password? <button 
              type="button" 
              onClick={() => {
                setIsMinimalUserFlow(false);
                setFormData({ email: formData.email, password: '', confirmPassword: '' });
                setErrors({});
                setGeneralError('');
              }}
              className="log-link-button"
            >
              Try Login Instead
            </button></p>
          </div>
        </div>
      ) : (
        // Normal login form
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
              disabled={isPasswordSetup}
            />
            {errors.email && <div className="log-error">{errors.email}</div>}
          </div>
          
          {isPasswordSetup ? (
            <>
              <div className="log-form-group">
                <label htmlFor="password" className="log-label">New Password</label>
                <div className="log-password-field">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`log-input ${errors.password ? 'log-input-invalid' : ''}`}
                    placeholder="Create a password (min 6 characters)"
                    minLength="6"
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
              <div className="log-form-group">
                <label htmlFor="confirmPassword" className="log-label">Confirm Password</label>
                <div className="log-password-field">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`log-input ${errors.confirmPassword ? 'log-input-invalid' : ''}`}
                    placeholder="Confirm your password"
                    minLength="6"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="log-password-toggle"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {errors.confirmPassword && <div className="log-error">{errors.confirmPassword}</div>}
              </div>
            </>
          ) : (
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
          )}
          
          <button type="submit" className="log-button" disabled={isLoading}>
            {isLoading ? (isPasswordSetup ? 'Setting Password...' : 'Logging in...') : (isPasswordSetup ? 'Set Password' : 'Log In')}
          </button>
        </form>
      )}
      
      {isPasswordSetup && (
        <div className="log-footer">
          <p>Remember your password? <button 
            type="button" 
            onClick={() => {
              setIsPasswordSetup(false);
              setIsMinimalUserFlow(false);
              setFormData({ email: formData.email, password: '', confirmPassword: '' });
              setErrors({});
              setGeneralError('');
            }}
            className="log-link-button"
          >
            Back to Login
          </button></p>
        </div>
      )}
      
      {!isPasswordSetup && !isMinimalUserFlow && (
        <div className="log-footer">
          <p>Don't have a password? <button 
            type="button" 
            onClick={checkMinimalUser}
            className="log-link-button"
            disabled={isLoading}
          >
            Set Password
          </button></p>
          <p className="log-footer-links">
            <Link to="/signup">Sign Up</Link>
            <span className="log-footer-divider">•</span>
            <Link to="/forgot-password">Forgot Password?</Link>
          </p>
        </div>
      )}
    </div>
  );
}

export default LoginForm;