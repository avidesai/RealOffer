import React, { useState, useEffect } from 'react';
import axios from 'axios';
import OfferSortBar from './components/OfferSortBar/OfferSortBar';
import './Offers.css';

const Offers = ({ listingId }) => {
  const [offers, setOffers] = useState([]);
  const [filter, setFilter] = useState('active');
  const [sort, setSort] = useState('recent');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const response = await axios.get(`http://localhost:8000/api/offers/${listingId}`);
        setOffers(response.data);
      } catch (error) {
        console.error('Error fetching offers:', error);
      }
    };

    fetchOffers();
  }, [listingId]);

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
  };

  const handleSortChange = (newSort) => {
    setSort(newSort);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const filteredOffers = offers.filter(offer => filter === 'active' ? offer.active : !offer.active);
  const sortedOffers = filteredOffers.sort((a, b) => {
    if (sort === 'recent') {
      return new Date(b.createdAt) - new Date(a.createdAt);
    } else {
      return new Date(a.createdAt) - new Date(b.createdAt);
    }
  });

  const searchedOffers = sortedOffers.filter(offer => offer.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="offers-tab">
      <OfferSortBar onFilterChange={handleFilterChange} onSortChange={handleSortChange} onSearch={handleSearch} />
      <div className="offers-list">
        {searchedOffers.length === 0 ? (
          <p className="no-offers-message">No offers found.</p>
        ) : (
          searchedOffers.map(offer => (
            <div key={offer._id} className="offer-item">
              <div className="offer-info">
                <p className="offer-title">{offer.title}</p>
                <p className="offer-price">${offer.price}</p>
                <p className="offer-agent">{offer.buyersAgent.name}</p>
              </div>
              <div className="offer-actions">
                <button className="view-button">View</button>
                <button className="respond-button">Respond</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Offers;
