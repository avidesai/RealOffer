// OfferView.js

import React, { useState, useEffect } from 'react';
import './OfferView.css';
import axios from 'axios';
import { useAuth } from '../../../../../../../../../context/AuthContext'; // Import the useAuth hook
import Terms from './components/Terms/Terms';
import AgentInfo from './components/AgentInfo/AgentInfo';
import Messages from './components/Messages/Messages';
import Documents from './components/Documents/Documents';
import PrivateNotes from './components/PrivateNotes/PrivateNotes';

const OfferView = ({ offerId, onBack }) => {
  const { token } = useAuth(); // Get the token from AuthContext
  const [offer, setOffer] = useState(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    
    const fetchOfferDetails = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/offers/${offerId}`, {
          headers: {
            Authorization: `Bearer ${token}`, // Include token for authorization
          },
        });
        const offerData = response.data;
  
        // Fetch documents for the offer
        const documentsResponse = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/documents/offer/${offerId}`, {
          headers: {
            Authorization: `Bearer ${token}`, // Include token for authorization
          },
        });
        offerData.documents = documentsResponse.data;
  
        setOffer(offerData);
      } catch (error) {
        console.error('Error fetching offer details:', error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchOfferDetails();
  }, [offerId, token]);

  const handleNotesChange = (event) => {
    setNotes(event.target.value);
  };

  const handleNotesBlur = async () => {
    try {
      await axios.put(
        `${process.env.REACT_APP_BACKEND_URL}/api/offers/${offer._id}/private-notes`,
        { privateListingTeamNotes: notes },
        {
          headers: {
            Authorization: `Bearer ${token}`, // Add the token to the Authorization header
          },
        }
      );
    } catch (error) {
      console.error('Error updating notes:', error);
    }
  };

  if (loading) {
    return (
      <div className="spinner-container">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!offer) {
    return <div>Offer not found.</div>;
  }

  return (
    <div className="offer-details-view">
      <button className="offer-back-button" onClick={onBack}>
        &larr; Back to Offers
      </button>
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

export default OfferView;
