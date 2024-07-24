// Offers.js

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import OfferSortBar from './components/OfferSortBar/OfferSortBar';
import MakeOfferModal from './components/MakeOfferModal/MakeOfferModal';
import OfferCard from './components/OfferCard/OfferCard'; // Import OfferCard
import './Offers.css';

const Offers = ({ listingId }) => {
  const [offers, setOffers] = useState([]);
  const [filter, setFilter] = useState('active');
  const [sort, setSort] = useState('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false); // Add loading state

  const fetchOffers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:8000/api/propertyListings/${listingId}`);
      console.log('Fetched Offers:', response.data.offers); // Log fetched offers
      setOffers(response.data.offers);
      setTotalPages(Math.ceil(response.data.offers.length / 10)); // Assuming 10 offers per page
    } catch (error) {
      console.error('Error fetching offers:', error);
    } finally {
      setLoading(false); // Stop loading after fetching
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
    await fetchOffers(); // Refresh offers after closing the modal
  };

  const handleDownloadSummary = () => {
    console.log('Download Summary clicked');
    // Add logic to download summary
  };

  const filteredOffers = offers.filter(offer => {
    return true; // default to show all if no filter matches
  });

  const sortedOffers = filteredOffers.sort((a, b) => {
    if (sort === 'recent') {
      return new Date(b.createdAt) - new Date(a.createdAt);
    } else {
      return new Date(a.createdAt) - new Date(b.createdAt);
    }
  });

  const searchedOffers = sortedOffers.filter(offer => offer.specialTerms?.toLowerCase().includes(searchQuery.toLowerCase()));

  const paginatedOffers = searchedOffers.slice((currentPage - 1) * 10, currentPage * 10);

  return (
    <div className="offers-tab">
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
          paginatedOffers.map(offer => (
            <OfferCard key={offer._id} offer={offer} /> // Use OfferCard to render each offer
          ))
        )}
      </div>
      {showModal && (
        <MakeOfferModal
          onClose={handleCloseModal}
          listingId={listingId}
        />
      )}
    </div>
  );
};

export default Offers;
