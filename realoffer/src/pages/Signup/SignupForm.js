// SignupForm.js

import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import './SignupForm.css';

function SignupForm() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: '',
    agentLicenseNumber: '', // Add license number field
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
    setErrors(prevErrors => ({
      ...prevErrors,
      [name]: ''
    }));
    setGeneralError('');
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (formData.firstName.length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters';
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (formData.lastName.length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    if (!formData.role) {
      newErrors.role = 'Please select a role';
    }

    // Validate license number for agents
    if (formData.role === 'agent' && !formData.agentLicenseNumber.trim()) {
      newErrors.agentLicenseNumber = 'License number is required for real estate agents';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const parseSignupError = (error) => {
    if (!error.response) {
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
        if (errorMessage.includes('email') && errorMessage.includes('already')) {
          return {
            type: 'email',
            message: 'An account with this email already exists'
          };
        } else if (errorMessage.includes('password')) {
          return {
            type: 'password',
            message: 'Password does not meet requirements'
          };
        } else {
          return {
            type: 'validation',
            message: 'Please check your information and try again'
          };
        }
      case 409:
        // Conflict - duplicate email
        return {
          type: 'email',
          message: 'An account with this email already exists'
        };
      case 429:
        // Too many requests
        return {
          type: 'rate_limit',
          message: 'Too many signup attempts. Please wait a few minutes and try again.'
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
          message: error.response.data?.message || 'Signup failed. Please try again.'
        };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setGeneralError('');
    setErrors({});

    const { confirmPassword, ...userData } = formData;

    try {
      await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/users`, userData);
      setSuccessMessage('Account created successfully! Logging you in...');
      
      // Auto-login after successful signup
      await login(formData.email, formData.password);
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (error) {
      console.error('Signup error:', error);
      
      const parsedError = parseSignupError(error);
      
      switch (parsedError.type) {
        case 'email':
          setErrors({ email: parsedError.message });
          break;
        case 'password':
          setErrors({ password: parsedError.message });
          break;
        case 'validation':
          setGeneralError(parsedError.message);
          break;
        case 'network':
        case 'server':
        case 'rate_limit':
        case 'unknown':
        default:
          setGeneralError(parsedError.message);
          break;
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="sup-form">
      <h1 className="sup-title">Create Account</h1>
      {successMessage && (
        <div className="sup-alert sup-alert-success">
          {successMessage}
        </div>
      )}
      {generalError && (
        <div className="sup-alert sup-alert-danger">
          {generalError}
        </div>
      )}
      <form onSubmit={handleSubmit} className="sup-form-inner">
        <div className="sup-form-row">
          <div className="sup-form-group">
            <label htmlFor="firstName" className="sup-label">First Name</label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              className={`sup-input ${errors.firstName ? 'sup-input-invalid' : ''}`}
              placeholder="Enter your first name"
            />
            {errors.firstName && <div className="sup-error">{errors.firstName}</div>}
          </div>
          <div className="sup-form-group">
            <label htmlFor="lastName" className="sup-label">Last Name</label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              className={`sup-input ${errors.lastName ? 'sup-input-invalid' : ''}`}
              placeholder="Enter your last name"
            />
            {errors.lastName && <div className="sup-error">{errors.lastName}</div>}
          </div>
        </div>
        <div className="sup-form-group">
          <label htmlFor="email" className="sup-label">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={`sup-input ${errors.email ? 'sup-input-invalid' : ''}`}
            placeholder="Enter your email address"
          />
          {errors.email && <div className="sup-error">{errors.email}</div>}
        </div>
        <div className="sup-form-group">
          <label htmlFor="password" className="sup-label">Password</label>
          <div className="sup-password-field">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={`sup-input ${errors.password ? 'sup-input-invalid' : ''}`}
              placeholder="Create a strong password"
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="sup-password-toggle"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          {errors.password && <div className="sup-error">{errors.password}</div>}
        </div>
        <div className="sup-form-group">
          <label htmlFor="confirmPassword" className="sup-label">Confirm Password</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            className={`sup-input ${errors.confirmPassword ? 'sup-input-invalid' : ''}`}
            placeholder="Confirm your password"
          />
          {errors.confirmPassword && <div className="sup-error">{errors.confirmPassword}</div>}
        </div>
        <div className="sup-form-group">
          <label htmlFor="role" className="sup-label">Role</label>
          <select
            name="role"
            id="role"
            value={formData.role}
            onChange={handleChange}
            className={`sup-select ${errors.role ? 'sup-input-invalid' : ''}`}
          >
            <option value="">Select your role</option>
            <option value="agent">Real Estate Agent</option>
            <option value="buyer">Buyer</option>
          </select>
          {errors.role && <div className="sup-error">{errors.role}</div>}
        </div>
        {formData.role === 'agent' && (
          <div className="sup-form-group">
            <label htmlFor="agentLicenseNumber" className="sup-label">License Number</label>
            <input
              type="text"
              id="agentLicenseNumber"
              name="agentLicenseNumber"
              value={formData.agentLicenseNumber}
              onChange={handleChange}
              className={`sup-input ${errors.agentLicenseNumber ? 'sup-input-invalid' : ''}`}
              placeholder="Enter your real estate license number"
            />
            {errors.agentLicenseNumber && <div className="sup-error">{errors.agentLicenseNumber}</div>}
          </div>
        )}
        <button type="submit" className="sup-button" disabled={isLoading}>
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>
      <div className="sup-footer">
        <p>Already have an account? <Link to="/login">Log In</Link></p>
      </div>
    </div>
  );
}

export default SignupForm;