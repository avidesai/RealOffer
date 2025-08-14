// BuyerPackageOffers.js

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../../../../../../context/AuthContext';
import OfferSortBar from './components/OfferSortBar/OfferSortBar';
import MakeOfferModal from './components/MakeOfferModal/MakeOfferModal';
import OfferCard from './components/OfferCard/OfferCard';
import OfferDetailsView from './components/OfferView/OfferDetailsView';
import RespondToOfferModal from './components/RespondToOfferModal/RespondToOfferModal';
import './BuyerPackageOffers.css';

const BuyerPackageOffers = ({ buyerPackageId, listingId }) => {
  const { token, user } = useAuth();
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
    if (!buyerPackageId || !listingId) return;
    
    // Extract the listing ID - it could be either a string ID or an object with _id
    const actualListingId = typeof listingId === 'string' ? listingId : listingId?._id;
    
    if (!actualListingId) {
      console.error('No listing ID available for offers');
      return;
    }
    
    setLoading(true);
    try {
      // Get all offers for this listing
      const offersResponse = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/offers/property/${actualListingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Filter to only show offers created by the current user
      const userOffers = offersResponse.data.filter(offer => 
        offer.buyersAgent && offer.buyersAgent._id === user._id
      );
      
      setOffers(userOffers);
      setPropertyListing({ _id: actualListingId }); // Set a minimal property listing object
      setTotalPages(Math.ceil(userOffers.length / 4));
    } catch (error) {
      console.error('Error fetching offers:', error);
    } finally {
      setLoading(false);
    }
  }, [buyerPackageId, listingId, token, user._id]);

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
    // Extract the listing ID - it could be either a string ID or an object with _id
    const actualListingId = typeof listingId === 'string' ? listingId : listingId?._id;
    
    if (!actualListingId) {
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

  return (
    <div className="offers-tab">
      {selectedOffer ? (
        <OfferDetailsView offerId={selectedOffer} onBack={handleBackToOffers} />
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
              <div className="offers-tab-no-offers-message">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14 2V8H20" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 13H8" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 17H8" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M10 9H9H8" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p>No offers submitted yet.</p>
              </div>
            ) : (
              paginatedOffers.map((offer) => (
                <OfferCard
                  key={offer._id}
                  offer={offer}
                  onClick={handleOfferClick}
                  onUpdate={handleUpdateOffer}
                />
              ))
            )}
          </div>
          {showModal && <MakeOfferModal onClose={handleCloseModal} listingId={typeof listingId === 'string' ? listingId : listingId?._id} buyerPackageId={buyerPackageId} />}
          {respondToOffer && (
            <RespondToOfferModal
              isOpen={!!respondToOffer}
              onClose={handleCloseRespondModal}
              offer={respondToOffer}
              propertyListing={propertyListing}
            />
          )}
        </>
      )}
    </div>
  );
};

export default BuyerPackageOffers; 