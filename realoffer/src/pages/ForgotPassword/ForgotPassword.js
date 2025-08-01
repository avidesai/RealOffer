import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import './ForgotPassword.css';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('form'); // 'form', 'success', 'error'
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/users/request-password-reset`, {
        email: email.trim()
      });
      
      if (response.status === 200) {
        setStatus('success');
        setMessage('If an account with this email exists, a password reset link has been sent to your inbox.');
      }
    } catch (error) {
      setStatus('error');
      if (error.response?.data?.message) {
        setMessage(error.response.data.message);
      } else {
        setMessage('Failed to send password reset email. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  const handleTryAgain = () => {
    setStatus('form');
    setMessage('');
    setError('');
  };

  const renderContent = () => {
    if (status === 'success') {
      return (
        <div className="forgot-password-form">
          <div className="forgot-password-icon success">✓</div>
          <h1 className="forgot-password-title">Check Your Email</h1>
          <p className="forgot-password-message">{message}</p>
          <div className="forgot-password-actions">
            <button 
              className="forgot-password-button primary"
              onClick={handleBackToLogin}
            >
              Back to Login
            </button>
          </div>
        </div>
      );
    }

    if (status === 'error') {
      return (
        <div className="forgot-password-form">
          <div className="forgot-password-icon error">✗</div>
          <h1 className="forgot-password-title">Something Went Wrong</h1>
          <p className="forgot-password-message">{message}</p>
          <div className="forgot-password-actions">
            <button 
              className="forgot-password-button primary"
              onClick={handleTryAgain}
            >
              Try Again
            </button>
            <button 
              className="forgot-password-button secondary"
              onClick={handleBackToLogin}
            >
              Back to Login
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="forgot-password-form">
        <h1 className="forgot-password-title">Forgot Password?</h1>
        <p className="forgot-password-message">
          Enter your email address and we'll send you a link to reset your password.
        </p>
        
        <form onSubmit={handleSubmit} className="forgot-password-form-inner">
          <div className="forgot-password-field">
            <label htmlFor="email" className="forgot-password-label">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError('');
              }}
              className={`forgot-password-input ${error ? 'forgot-password-input-invalid' : ''}`}
              placeholder="Enter your email address"
              disabled={isLoading}
            />
            {error && (
              <div className="forgot-password-error">{error}</div>
            )}
          </div>
          
          <button
            type="submit"
            className="forgot-password-button primary"
            disabled={isLoading}
          >
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
        
        <div className="forgot-password-footer">
          <button 
            className="forgot-password-link"
            onClick={handleBackToLogin}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="forgot-password-page-container">
      <Header />
      <div className="forgot-password-content-wrapper">
        {renderContent()}
      </div>
      <Footer />
    </div>
  );
};

export default ForgotPassword; 