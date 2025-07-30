import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './EmailVerification.css';

const EmailVerification = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        setStatus('error');
        setMessage('Invalid verification link. Please check your email for the correct link.');
        return;
      }

      try {
        const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/users/verify-email/${token}`);
        
        if (response.status === 200) {
          setStatus('success');
          setMessage('Email verified successfully! You can now log in to your account.');
        }
      } catch (error) {
        setStatus('error');
        if (error.response?.data?.message) {
          setMessage(error.response.data.message);
        } else {
          setMessage('Failed to verify email. Please try again or contact support.');
        }
      }
    };

    verifyEmail();
  }, [searchParams]);

  const handleLogin = () => {
    navigate('/login');
  };

  const handleResend = async () => {
    setStatus('verifying');
    setMessage('Sending verification email...');
    
    try {
      // You might want to get the email from localStorage or a different source
      // For now, we'll redirect to login where they can request resend
      navigate('/login?resend=true');
    } catch (error) {
      setStatus('error');
      setMessage('Failed to resend verification email. Please try again.');
    }
  };

  return (
    <div className="email-verification">
      <div className="email-verification-container">
        <div className="email-verification-content">
          <div className="email-verification-icon">
            {status === 'verifying' && <div className="spinner"></div>}
            {status === 'success' && <div className="success-icon">✓</div>}
            {status === 'error' && <div className="error-icon">✗</div>}
          </div>
          
          <h1 className="email-verification-title">
            {status === 'verifying' && 'Verifying Email'}
            {status === 'success' && 'Email Verified!'}
            {status === 'error' && 'Verification Failed'}
          </h1>
          
          <p className="email-verification-message">{message}</p>
          
          {status === 'success' && (
            <div className="email-verification-actions">
              <button 
                className="email-verification-button primary"
                onClick={handleLogin}
              >
                Log In
              </button>
            </div>
          )}
          
          {status === 'error' && (
            <div className="email-verification-actions">
              <button 
                className="email-verification-button primary"
                onClick={handleResend}
              >
                Resend Verification Email
              </button>
              <button 
                className="email-verification-button secondary"
                onClick={handleLogin}
              >
                Go to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailVerification; 