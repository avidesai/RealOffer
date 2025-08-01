import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import './PasswordReset.css';

const PasswordReset = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('form'); // 'form', 'success', 'error'
  const [message, setMessage] = useState('');
  const [token, setToken] = useState('');

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (!tokenParam) {
      setStatus('error');
      setMessage('Invalid reset link. Please request a new password reset.');
      return;
    }
    setToken(tokenParam);
  }, [searchParams]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear errors when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters long';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.newPassword)) {
      newErrors.newPassword = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    setErrors({});
    
    try {
      const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/users/reset-password`, {
        token,
        newPassword: formData.newPassword
      });
      
      if (response.status === 200) {
        setStatus('success');
        setMessage('Password reset successfully! You can now log in with your new password.');
      }
    } catch (error) {
      setStatus('error');
      if (error.response?.data?.message) {
        setMessage(error.response.data.message);
      } else {
        setMessage('Failed to reset password. Please try again or request a new reset link.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    navigate('/login');
  };

  const handleRequestNewReset = () => {
    navigate('/forgot-password');
  };

  const renderContent = () => {
    if (status === 'success') {
      return (
        <div className="password-reset-form">
          <div className="password-reset-icon success">✓</div>
          <h1 className="password-reset-title">Password Reset Successful!</h1>
          <p className="password-reset-message">{message}</p>
          <div className="password-reset-actions">
            <button 
              className="password-reset-button primary"
              onClick={handleLogin}
            >
              Log In
            </button>
          </div>
        </div>
      );
    }

    if (status === 'error') {
      return (
        <div className="password-reset-form">
          <div className="password-reset-icon error">✗</div>
          <h1 className="password-reset-title">Reset Failed</h1>
          <p className="password-reset-message">{message}</p>
          <div className="password-reset-actions">
            <button 
              className="password-reset-button primary"
              onClick={handleRequestNewReset}
            >
              Request New Reset
            </button>
            <button 
              className="password-reset-button secondary"
              onClick={handleLogin}
            >
              Go to Login
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="password-reset-form">
        <h1 className="password-reset-title">Reset Your Password</h1>
        <p className="password-reset-message">
          Enter your new password below. Make sure it's secure and easy to remember.
        </p>
        
        <form onSubmit={handleSubmit} className="password-reset-form-inner">
          <div className="password-reset-field">
            <label htmlFor="newPassword" className="password-reset-label">
              New Password
            </label>
            <div className="password-reset-input-container">
              <input
                type={showPassword ? 'text' : 'password'}
                id="newPassword"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                className={`password-reset-input ${errors.newPassword ? 'password-reset-input-invalid' : ''}`}
                placeholder="Enter your new password"
              />
              <button
                type="button"
                className="password-reset-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {errors.newPassword && (
              <div className="password-reset-error">{errors.newPassword}</div>
            )}
          </div>
          
          <div className="password-reset-field">
            <label htmlFor="confirmPassword" className="password-reset-label">
              Confirm Password
            </label>
            <div className="password-reset-input-container">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`password-reset-input ${errors.confirmPassword ? 'password-reset-input-invalid' : ''}`}
                placeholder="Confirm your new password"
              />
              <button
                type="button"
                className="password-reset-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {errors.confirmPassword && (
              <div className="password-reset-error">{errors.confirmPassword}</div>
            )}
          </div>
          
          <button
            type="submit"
            className="password-reset-button primary"
            disabled={isLoading}
          >
            {isLoading ? 'Resetting Password...' : 'Reset Password'}
          </button>
        </form>
      </div>
    );
  };

  return (
    <div className="password-reset-page-container">
      <Header />
      <div className="password-reset-content-wrapper">
        {renderContent()}
      </div>
      <Footer />
    </div>
  );
};

export default PasswordReset; 