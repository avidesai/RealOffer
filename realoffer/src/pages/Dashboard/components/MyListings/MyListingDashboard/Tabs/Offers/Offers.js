// Offers.js

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import OfferSortBar from './components/OfferSortBar/OfferSortBar';
import MakeOfferModal from './components/MakeOfferModal/MakeOfferModal';
import OfferCard from './components/OfferCard/OfferCard';
import OfferDetailsView from './components/OfferDetailsView/OfferDetailsView';
import './Offers.css';

const Offers = ({ listingId }) => {
  const [offers, setOffers] = useState([]);
  const [filter, setFilter] = useState('active');
  const [sort, setSort] = useState('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);

  const fetchOffers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:8000/api/propertyListings/${listingId}`);
      setOffers(response.data.offers);
      setTotalPages(Math.ceil(response.data.offers.length / 10));
    } catch (error) {
      console.error('Error fetching offers:', error);
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
  };

  const handleSortChange = (newSort) => {
    setSort(newSort);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handleAddOffer = () => {
    setShowModal(true);
  };

  const handleCloseModal = async () => {
    setShowModal(false);
    await fetchOffers();
  };

  const handleDownloadSummary = () => {
    console.log('Download Summary clicked');
    // Add logic to download summary
  };

  const handleOfferClick = (offerId) => {
    setSelectedOffer(offerId);
  };

  const handleBackToOffers = () => {
    setSelectedOffer(null);
    fetchOffers();
  };

  const handleNotesUpdate = (offerId, newNotes) => {
    setOffers((prevOffers) =>
      prevOffers.map((offer) =>
        offer._id === offerId ? { ...offer, privateListingTeamNotes: newNotes } : offer
      )
    );
  };

  const filteredOffers = offers.filter((offer) => {
    return true; // default to show all if no filter matches
  });

  const sortedOffers = filteredOffers.sort((a, b) => {
    if (sort === 'recent') {
      return new Date(b.createdAt) - new Date(a.createdAt);
    } else {
      return new Date(a.createdAt) - new Date(b.createdAt);
    }
  });

  const searchedOffers = sortedOffers.filter((offer) =>
    offer.specialTerms?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const paginatedOffers = searchedOffers.slice((currentPage - 1) * 10, currentPage * 10);

  return (
    <div className="offers-tab">
      {selectedOffer ? (
        <OfferDetailsView offerId={selectedOffer} onBack={handleBackToOffers} onNotesUpdate={handleNotesUpdate} />
      ) : (
        <>
          <OfferSortBar
            onFilterChange={handleFilterChange}
            onSortChange={handleSortChange}
            onSearch={handleSearch}
            onAddOffer={handleAddOffer}
            onDownloadSummary={handleDownloadSummary}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
          <div className="offers-list">
            {loading && (
              <div className="spinner-container">
                <div className="spinner"></div>
              </div>
            )}
            {paginatedOffers.length === 0 ? (
              <p className="no-offers-message">No offers found.</p>
            ) : (
              paginatedOffers.map((offer) => (
                <OfferCard key={offer._id} offer={offer} onClick={handleOfferClick} onNotesUpdate={handleNotesUpdate} />
              ))
            )}
          </div>
          {showModal && <MakeOfferModal onClose={handleCloseModal} listingId={listingId} />}
        </>
      )}
    </div>
  );
};

export default Offers;

