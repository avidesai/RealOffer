// OfferDetailsView.js

import React, { useState, useEffect } from 'react';
import './OfferDetailsView.css';
import axios from 'axios';
import { useAuth } from '../../../../../../../../../context/AuthContext';
import Terms from './components/Terms/Terms';
import AgentInfo from './components/AgentInfo/AgentInfo';
import Messages from './components/Messages/Messages';
import Documents from './components/Documents/Documents';
import PrivateNotes from './components/PrivateNotes/PrivateNotes';

const OfferDetailsView = ({ offerId, onBack }) => {
  const { token } = useAuth();
  const [offer, setOffer] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [notes, setNotes] = useState('');
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
        setNotes(offerData.privateListingTeamNotes || '');
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

  const handleNotesChange = (event) => {
    setNotes(event.target.value);
  };

  const handleNotesBlur = async () => {
    try {
      await axios.put(`${process.env.REACT_APP_BACKEND_URL}/api/offers/${offer._id}/private-notes`, {
        privateListingTeamNotes: notes,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Error updating notes:', error);
      // Optionally, show an error message to the user
    }
  };

  if (loading) {
    return <div className="spinner-container"><div className="spinner"></div></div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!offer) {
    return <div className="error-message">No offer data available.</div>;
  }

  return (
    <div className="offer-details-view">
      <button className="offer-back-button" onClick={onBack}>&larr; Back to Offers</button>
      <div className="offer-content">
        <Terms offer={offer} />
        <div className="middle-section">
          <AgentInfo offer={offer} />
          <Messages offer={offer} />
          <Documents documents={documents} />
        </div>
        <PrivateNotes notes={notes} handleNotesChange={handleNotesChange} handleNotesBlur={handleNotesBlur} />
      </div>
    </div>
  );
};

export default OfferDetailsView;