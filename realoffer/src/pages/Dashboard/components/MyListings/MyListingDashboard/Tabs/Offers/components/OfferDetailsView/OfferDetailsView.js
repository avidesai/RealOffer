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
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOffer = async () => {
      console.log('Fetching offer details for ID:', offerId); // Debugging log
      try {
        const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/offers/${offerId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.data) {
          throw new Error('Offer not found');
        }

        const offerData = response.data;
        setOffer(offerData);

        const documentsResponse = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/documents/offer/${offerId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        offerData.documents = documentsResponse.data;

      } catch (error) {
        console.error('Error fetching offer:', error.response?.data || error.message);
        setError('Error fetching offer details');
      } finally {
        setLoading(false);
      }
    };

    fetchOffer();
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
    }
  };

  if (loading) {
    return <div className="spinner-container"><div className="spinner"></div></div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!offer) {
    return <div className="error-message">Offer not found.</div>;
  }

  return (
    <div className="offer-details-view">
      <button className="offer-back-button" onClick={onBack}>&larr; Back to Offers</button>
      <div className="offer-content">
        <Terms offer={offer} />
        <div className="middle-section">
          <AgentInfo offer={offer} />
          <Messages offer={offer} />
          <Documents offer={offer} />
        </div>
        <PrivateNotes notes={notes} handleNotesChange={handleNotesChange} handleNotesBlur={handleNotesBlur} />
      </div>
    </div>
  );
};

export default OfferDetailsView;
