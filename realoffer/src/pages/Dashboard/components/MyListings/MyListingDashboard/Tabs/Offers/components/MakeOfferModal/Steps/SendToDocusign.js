// SendToDocusign.js
import React, { useState, useEffect, useCallback } from 'react';
import { useOffer } from '../../../../../../../../../../context/OfferContext';
import { useAuth } from '../../../../../../../../../../context/AuthContext';
import axios from 'axios';
import './SendToDocusign.css';

const SendToDocusign = ({ handlePrevStep, handleNextStep }) => {
  const { offerData, updateOfferData } = useOffer();
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [signingUrl, setSigningUrl] = useState('');
  const [signingStatus, setSigningStatus] = useState('');

  const handleSignDocuments = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      if (!token) {
        throw new Error('No authentication token found');
      }
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/docusign/create-signing-session`,
        { offerId: offerData._id },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      setSigningUrl(response.data.signingUrl);
      setSigningStatus('initiated');
    } catch (error) {
      console.error('Error creating DocuSign signing session:', error);
      setError(error.response?.data?.message || 'Failed to create signing session. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [offerData._id, token]);

  const checkSigningStatus = useCallback(async () => {
    if (signingStatus !== 'initiated') return;
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/docusign/status/${offerData._id}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      if (response.data.status === 'completed') {
        setSigningStatus('completed');
        // Update documents with signed versions
        const updatedDocuments = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}/api/documents/offer/${offerData._id}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );
        updateOfferData({ documents: updatedDocuments.data });
      }
    } catch (error) {
      console.error('Error checking signing status:', error);
      setError('Failed to check signing status. Please try again.');
    }
  }, [signingStatus, offerData._id, updateOfferData]);

  useEffect(() => {
    let intervalId;
    if (signingStatus === 'initiated') {
      intervalId = setInterval(checkSigningStatus, 5000); // Check every 5 seconds
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [checkSigningStatus, signingStatus]);

  useEffect(() => {
    if (signingStatus === 'completed') {
      handleNextStep();
    }
  }, [signingStatus, handleNextStep]);

  const handleRetry = () => {
    setError('');
    setSigningStatus('');
    setSigningUrl('');
  };

  return (
    <div className="modal-step docusign-step">
      <div className='offer-modal-header'>
        <h2>Sign Documents</h2>
        <p>Sign all necessary documents for your offer.</p>
      </div>
      {error && (
        <div className="error-message">
          {error}
          <button onClick={handleRetry}>Retry</button>
        </div>
      )}
      {!signingUrl ? (
        <button
          className="sign-documents-button"
          onClick={handleSignDocuments}
          disabled={isLoading}
        >
          {isLoading ? 'Preparing...' : 'Sign Documents'}
        </button>
      ) : (
        <iframe
          src={signingUrl}
          width="100%"
          height="500px"
          title="DocuSign Signing Session"
        />
      )}
      <div className="button-container">
        <button className="step-back-button" onClick={handlePrevStep} disabled={isLoading || signingStatus === 'initiated'}>Back</button>
        <button className="next-button" onClick={handleNextStep} disabled={signingStatus !== 'completed'}>
          Next
        </button>
      </div>
    </div>
  );
};

export default SendToDocusign;