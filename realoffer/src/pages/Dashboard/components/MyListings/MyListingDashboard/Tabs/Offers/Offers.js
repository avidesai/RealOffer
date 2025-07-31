// Offers.js

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../../../../../../context/AuthContext';
import OfferSortBar from './components/OfferSortBar/OfferSortBar';
import MakeOfferModal from './components/MakeOfferModal/MakeOfferModal';
import OfferCard from './components/OfferCard/OfferCard';
import OfferDetailsView from './components/OfferView/OfferDetailsView';
import RespondToOfferModal from './components/RespondToOfferModal/RespondToOfferModal';
import './Offers.css';

const Offers = ({ listingId }) => {
  const { token } = useAuth();
  const [offers, setOffers] = useState([]);
  const [propertyListing, setPropertyListing] = useState(null);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('priceHighToLow');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [respondToOffer, setRespondToOffer] = useState(null);

  const fetchOffers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/propertyListings/${listingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOffers(response.data.offers);
      setPropertyListing(response.data);
      setTotalPages(Math.ceil(response.data.offers.length / 4));
    } catch (error) {
      console.error('Error fetching offers:', error);
    } finally {
      setLoading(false);
    }
  }, [listingId, token]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
  };

  const handleSortChange = (newSort) => {
    setSort(newSort);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handleAddOffer = () => {
    if (!listingId) {
      console.error('Cannot create offer: Property listing not available');
      return;
    }
    setShowModal(true);
  };

  const handleCloseModal = async () => {
    setShowModal(false);
    await fetchOffers();
  };

  const handleOfferClick = (offerId) => {
    setSelectedOffer(offerId);
  };

  const handleBackToOffers = () => {
    setSelectedOffer(null);
    fetchOffers();
  };

  const handleUpdateOffer = (updatedOffer) => {
    setOffers((prevOffers) =>
      prevOffers.map((offer) => (offer._id === updatedOffer._id ? updatedOffer : offer))
    );
  };

  const handleRespondToOffer = (offer) => {
    setRespondToOffer(offer);
  };

  const handleCloseRespondModal = async (submitted) => {
    setRespondToOffer(null);
    if (submitted) {
      setLoading(true);
      await fetchOffers();
    }
  };

  const filteredOffers = offers.filter((offer) => {
    if (filter === 'all') {
      return true;
    }
    return offer.offerStatus === filter;
  });

  const sortedOffers = filteredOffers.sort((a, b) => {
    switch (sort) {
      case 'priceHighToLow':
        return b.purchasePrice - a.purchasePrice;
      case 'recent':
        return new Date(b.createdAt) - new Date(a.createdAt);
      case 'oldest':
        return new Date(a.createdAt) - new Date(b.createdAt);
      case 'offerExpiryDate':
        return new Date(b.offerExpiryDate) - new Date(a.offerExpiryDate);
      default:
        return 0;
    }
  });

  const paginatedOffers = sortedOffers.slice((currentPage - 1) * 4, currentPage * 4);

  // Offer counts for dropdowns
  const statusCounts = {
    all: offers.length,
    submitted: offers.filter(o => o.offerStatus === 'submitted').length,
    'under review': offers.filter(o => o.offerStatus === 'under review').length,
    rejected: offers.filter(o => o.offerStatus === 'rejected').length,
    countered: offers.filter(o => o.offerStatus === 'countered').length,
    accepted: offers.filter(o => o.offerStatus === 'accepted').length,
    'pending-signatures': offers.filter(o => o.offerStatus === 'pending-signatures').length,
    'pending-review': offers.filter(o => o.offerStatus === 'pending-review').length,
    'documents-declined': offers.filter(o => o.offerStatus === 'documents-declined').length,
    'documents-voided': offers.filter(o => o.offerStatus === 'documents-voided').length,
  };

  if (loading) {
    return (
      <div className="offers-tab">
        <div className="offers-loading">
          <div className="spinner"></div>
          <p>Loading offers</p>
        </div>
      </div>
    );
  }

  // Find the selected offer data
  const selectedOfferData = offers.find(offer => offer._id === selectedOffer);

  return (
    <div className="offers-tab">
      {selectedOffer ? (
        <OfferDetailsView 
          offerId={selectedOffer} 
          offerData={selectedOfferData}
          onBack={handleBackToOffers}
          onRespond={handleRespondToOffer}
        />
      ) : (
        <>
          <OfferSortBar
            onFilterChange={handleFilterChange}
            onSortChange={handleSortChange}
            onAddOffer={handleAddOffer}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            statusCounts={statusCounts}
          />
          <div className="offers-list">
            {paginatedOffers.length === 0 ? (
              <p className="no-offers-message">No offers found.</p>
            ) : (
              paginatedOffers.map((offer) => (
                <OfferCard
                  key={offer._id}
                  offer={offer}
                  onClick={handleOfferClick}
                  onUpdate={handleUpdateOffer}
                  onRespond={handleRespondToOffer}
                />
              ))
            )}
          </div>
          {showModal && <MakeOfferModal onClose={handleCloseModal} listingId={listingId} />}
        </>
      )}
      {respondToOffer && (
        <RespondToOfferModal
          isOpen={!!respondToOffer}
          onClose={handleCloseRespondModal}
          offer={respondToOffer}
          propertyListing={propertyListing}
        />
      )}
    </div>
  );
};

export default Offers;