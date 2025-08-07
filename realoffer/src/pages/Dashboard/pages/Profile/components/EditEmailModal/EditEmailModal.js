// EditEmailModal.js

import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../../../../../context/AuthContext';
import './EditEmailModal.css';

const EditEmailModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [newEmail, setNewEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  const checkEmailExists = async (email) => {
    try {
      const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/users/check-email`, {
        email: email.toLowerCase()
      });
      return response.data.exists;
    } catch (error) {
      console.error('Error checking email:', error);
      throw error;
    }
  };

  const handleSave = async () => {
    if (newEmail !== confirmEmail) {
      setError('Email addresses do not match');
      return;
    }

    // Don't allow changing to the same email
    if (newEmail.toLowerCase() === user.email.toLowerCase()) {
      setError('This is already your current email address');
      return;
    }

    setIsChecking(true);
    setError('');

    try {
      // Check if email already exists
      const emailExists = await checkEmailExists(newEmail);
      
      if (emailExists) {
        setError('An account with this email address already exists. Please use a different email address.');
        setIsChecking(false);
        return;
      }

      // Proceed with email update
      await axios.put(`${process.env.REACT_APP_BACKEND_URL}/api/users/${user._id}`, { 
        email: newEmail.toLowerCase() 
      });
      
      onClose();
      window.location.reload(); // Refresh the page to fetch the updated email
    } catch (error) {
      if (error.response?.status === 409) {
        setError('An account with this email address already exists. Please use a different email address.');
      } else {
        setError('Failed to update email. Please try again.');
      }
      console.error('Error updating email:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleClose = () => {
    setNewEmail('');
    setConfirmEmail('');
    setError('');
    setIsChecking(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="email-modal-overlay">
      <div className="email-modal-content">
        <div className="email-modal-header">
          <h2>Change Email Address</h2>
          <button className="edit-email-close-button" onClick={handleClose}></button>
        </div>
        <div className="email-modal-body">
          <div className="email-form-group">
            <label>New Email</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="email-form-control"
              disabled={isChecking}
            />
          </div>
          <div className="email-form-group">
            <label>Confirm Email</label>
            <input
              type="email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              className="email-form-control"
              disabled={isChecking}
            />
          </div>
          {error && <div className="error-message">{error}</div>}
        </div>
        <div className="email-modal-footer">
          <button 
            className="email-save-button" 
            onClick={handleSave}
            disabled={isChecking || !newEmail || !confirmEmail}
          >
            {isChecking ? 'Checking...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditEmailModal;
