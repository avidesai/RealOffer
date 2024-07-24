import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../../../../../context/AuthContext';
import './EditEmailModal.css';

const EditEmailModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [newEmail, setNewEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (newEmail !== confirmEmail) {
      setError('Email addresses do not match');
      return;
    }

    try {
      await axios.put(`http://localhost:8000/api/users/${user._id}`, { email: newEmail });
      onClose();
      window.location.reload(); // Refresh the page to fetch the updated email
    } catch (error) {
      setError('Failed to update email');
      console.error('Error updating email:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="email-modal-overlay">
      <div className="email-modal-content">
        <div className="email-modal-header">
          <h2>Change Email Address</h2>
          <button className="edit-email-close-button" onClick={onClose}></button>
        </div>
        <div className="email-modal-body">
          <div className="email-form-group">
            <label>New Email</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="email-form-control"
            />
          </div>
          <div className="email-form-group">
            <label>Confirm Email</label>
            <input
              type="email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              className="email-form-control"
            />
          </div>
          {error && <div className="error-message">{error}</div>}
        </div>
        <div className="email-modal-footer">
          <button className="email-save-button" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
};

export default EditEmailModal;
