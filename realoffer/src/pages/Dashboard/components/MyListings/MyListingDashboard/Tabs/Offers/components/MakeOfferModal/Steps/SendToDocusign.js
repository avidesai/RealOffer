// SendToDocusign.js
import React, { useState, useEffect, useCallback } from 'react';
import { useOffer } from '../../../../../../../../../../context/OfferContext';
import axios from 'axios';
import './SendToDocusign.css';

const SendToDocusign = ({ handlePrevStep, handleNextStep }) => {
  const { offerData, updateOfferData } = useOffer();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [signingUrl, setSigningUrl] = useState('');
  const [signingStatus, setSigningStatus] = useState('');

  const handleSignDocuments = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/docusign/create-signing-session`, {
        offerId: offerData._id,
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      setSigningUrl(response.data.signingUrl);
      setSigningStatus('initiated');
    } catch (error) {
      console.error('Error creating DocuSign signing session:', error);
      setError('Failed to create signing session. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [offerData._id]);

  const checkSigningStatus = useCallback(async () => {
    if (signingStatus !== 'initiated') return;
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/docusign/status/${offerData._id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.data.status === 'completed') {
        setSigningStatus('completed');
        // Update documents with signed versions
        const updatedDocuments = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/documents/offer/${offerData._id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });
        updateOfferData({ documents: updatedDocuments.data });
      }
    } catch (error) {
      console.error('Error checking signing status:', error);
    }
  }, [signingStatus, offerData._id, updateOfferData]);

  useEffect(() => {
    const intervalId = setInterval(checkSigningStatus, 5000); // Check every 5 seconds
    return () => clearInterval(intervalId);
  }, [checkSigningStatus]);

  useEffect(() => {
    if (signingStatus === 'completed') {
      handleNextStep();
    }
  }, [signingStatus, handleNextStep]);

  return (
    <div className="modal-step docusign-step">
      <div className='offer-modal-header'>
        <h2>Sign Documents</h2>
        <p>Sign all necessary documents for your offer.</p>
      </div>
      {error && <div className="error-message">{error}</div>}
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
        <button className="step-back-button" onClick={handlePrevStep}>Back</button>
        <button className="next-button" onClick={handleNextStep} disabled={signingStatus !== 'completed'}>
          Next
        </button>
      </div>
    </div>
  );
};

export default SendToDocusign;