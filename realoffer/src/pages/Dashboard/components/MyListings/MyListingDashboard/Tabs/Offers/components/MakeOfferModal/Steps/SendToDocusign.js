// SendToDocusign.js
import React, { useState, useEffect } from 'react';
import { useOffer } from '../../../../../../../../../../context/OfferContext';
import axios from 'axios';
import './SendToDocusign.css';

const SendToDocusign = ({ handlePrevStep, handleNextStep }) => {
  const { offerData, updateOfferData } = useOffer();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [signingUrl, setSigningUrl] = useState('');

  const handleSignDocuments = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await axios.post('/api/docusign/create-signing-session', {
        offerId: offerData._id,
      });
      setSigningUrl(response.data.signingUrl);
    } catch (error) {
      console.error('Error creating DocuSign signing session:', error);
      setError('Failed to create signing session. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const checkSigningStatus = async () => {
      if (!signingUrl) return;

      try {
        const response = await axios.get(`/api/docusign/status/${offerData._id}`);
        if (response.data.status === 'completed') {
          // Update documents with signed versions
          const updatedDocuments = await axios.get(`/api/documents/offer/${offerData._id}`);
          updateOfferData({ documents: updatedDocuments.data });
          handleNextStep();
        }
      } catch (error) {
        console.error('Error checking signing status:', error);
      }
    };

    const intervalId = setInterval(checkSigningStatus, 5000); // Check every 5 seconds

    return () => clearInterval(intervalId);
  }, [signingUrl, offerData._id, updateOfferData, handleNextStep]);

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
        <button className="next-button" onClick={handleNextStep} disabled={!signingUrl}>
          Next
        </button>
      </div>
    </div>
  );
};

export default SendToDocusign;