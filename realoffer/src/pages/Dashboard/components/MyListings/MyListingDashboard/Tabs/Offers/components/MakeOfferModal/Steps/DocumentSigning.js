import React, { useState } from 'react';
import { useAuth } from '../../../../../../../../../../context/AuthContext';
import { useOffer } from '../../../../../../../../../../context/OfferContext';
import DocuSignConfig from './DocuSignConfig';
import './DocumentSigning.css';

const DocumentSigning = ({ handleNextStep, handlePrevStep }) => {
  const { offerData } = useOffer();
  const { token } = useAuth();
  const [signers, setSigners] = useState([{ email: '', name: '' }]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isDocuSignConfigured, setIsDocuSignConfigured] = useState(false);

  const handleAddSigner = () => {
    setSigners([...signers, { email: '', name: '' }]);
  };

  const handleRemoveSigner = (index) => {
    setSigners(signers.filter((_, i) => i !== index));
  };

  const handleSignerChange = (index, field, value) => {
    const newSigners = [...signers];
    newSigners[index][field] = value;
    setSigners(newSigners);
  };

  const handleSendForSigning = async () => {
    if (!isDocuSignConfigured) {
      setError('Please connect your DocuSign account first');
      return;
    }

    setError(null);
    setSending(true);

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/docusign/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          documents: offerData.documents.map(doc => doc.id),
          signers: signers,
          title: `Offer Documents - ${offerData.buyerName || 'New Offer'}`,
          message: 'Please review and sign these offer documents.',
          redirectUrl: window.location.origin
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send documents for signing');
      }

      setSuccess(true);
      
      // Wait a moment before proceeding to next step
      setTimeout(() => {
        handleNextStep();
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="modal-step">
      <div className='offer-modal-header'>
        <h2>Document Signing</h2>
        <p>Send documents for electronic signature</p>
      </div>

      <div className="signing-container">
        <DocuSignConfig onConfigComplete={setIsDocuSignConfigured} />

        {error && (
          <div className="signing-error">
            {error}
          </div>
        )}

        {success && (
          <div className="signing-success">
            Documents sent for signing successfully!
          </div>
        )}

        {isDocuSignConfigured && (
          <>
            <div className="signers-list">
              {signers.map((signer, index) => (
                <div key={index} className="signer-input-group">
                  <input
                    type="text"
                    placeholder="Signer Name"
                    value={signer.name}
                    onChange={(e) => handleSignerChange(index, 'name', e.target.value)}
                    className="signer-input"
                  />
                  <input
                    type="email"
                    placeholder="Signer Email"
                    value={signer.email}
                    onChange={(e) => handleSignerChange(index, 'email', e.target.value)}
                    className="signer-input"
                  />
                  {signers.length > 1 && (
                    <button
                      onClick={() => handleRemoveSigner(index)}
                      className="remove-signer-button"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={handleAddSigner}
              className="add-signer-button"
            >
              Add Another Signer
            </button>

            <div className="signing-actions">
              <button
                onClick={handlePrevStep}
                className="prev-step-button"
                disabled={sending}
              >
                Previous
              </button>
              <button
                onClick={handleSendForSigning}
                className="send-for-signing-button"
                disabled={sending || signers.some(s => !s.email || !s.name)}
              >
                {sending ? 'Sending...' : 'Send for Signing'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DocumentSigning; 