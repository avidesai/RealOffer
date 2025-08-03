// OfferDetailsView.js

import React, { useState, useEffect } from 'react';
import './OfferDetailsView.css';
import axios from 'axios';
import { useAuth } from '../../../../../../../../../context/AuthContext';
import Terms from './components/Terms/Terms';
import AgentInfo from './components/AgentInfo/AgentInfo';
import MessageThread from './components/MessageThread/MessageThread';
import Documents from './components/Documents/Documents';
import OfferViewBar from './components/OfferViewBar/OfferViewBar';

const OfferDetailsView = ({ offerId, onBack }) => {
  const { token } = useAuth();
  const [offer, setOffer] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOfferAndDocuments = async () => {
      try {
        setLoading(true);
        setError(null);

        const [offerResponse, documentsResponse] = await Promise.all([
          axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/offers/${offerId}`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/documents/offer/${offerId}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        const offerData = offerResponse.data;
        setOffer(offerData);
        setDocuments(documentsResponse.data);
      } catch (error) {
        console.error('Error fetching offer and documents:', error);
        setError('Failed to load offer details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchOfferAndDocuments();
  }, [offerId, token]);

  if (loading) {
    return <div className="odv-spinner-container"><div className="odv-spinner"></div></div>;
  }

  if (error) {
    return <div className="odv-error-message">{error}</div>;
  }

  if (!offer) {
    return <div className="odv-error-message">No offer data available.</div>;
  }

  return (
    <div className="odv-offer-details-view">
      <OfferViewBar onBack={onBack} />
      <div className="odv-offer-content">
        <Terms offer={offer} />
        <div className="odv-middle-section">
          <AgentInfo offer={offer} />
          <Documents documents={documents} />
        </div>
        <MessageThread offer={offer} />
      </div>
    </div>
  );
};

export default OfferDetailsView;