// OfferSortBar.js

import React, { useState } from 'react';
import './OfferSortBar.css';
import OfferToolBar from '../OfferToolBar/OfferToolBar';

const getStatusStyle = (status) => {
  switch (status) {
    case 'submitted':
      return { text: 'Submitted', className: 'status-submitted' };
    case 'under review':
      return { text: 'Under Review', className: 'status-under-review' };
    case 'accepted':
      return { text: 'Accepted', className: 'status-accepted' };
    case 'rejected':
      return { text: 'Rejected', className: 'status-rejected' };
    default:
      return { text: 'Submitted', className: 'status-submitted' };
  }
};

function OfferSortBar({ onFilterChange, onSortChange, onSearch, onAddOffer, onDownloadSummary, currentPage, totalPages, onPageChange }) {
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('priceHighToLow');
  const [searchQuery, setSearchQuery] = useState('');

  const handleFilterChange = (e) => {
    setFilter(e.target.value);
    onFilterChange(e.target.value);
  };

  const handleSortChange = (e) => {
    setSort(e.target.value);
    onSortChange(e.target.value);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  return (
    <div className="offer-sort-bar-wrapper">
      <div className="offer-sort-bar">
        <div className="filter-sort-section">
          <div className="offer-filter-section">
            <label htmlFor="filter">Status</label>
            <select id="filter" value={filter} onChange={handleFilterChange}>
              <option value="all">All</option>
              <option value="submitted">{getStatusStyle('submitted').text}</option>
              <option value="under review">{getStatusStyle('under review').text}</option>
              <option value="accepted">{getStatusStyle('accepted').text}</option>
              <option value="rejected">{getStatusStyle('rejected').text}</option>
            </select>
          </div>
          <div className="offer-sort-section">
            <label htmlFor="sort">Sort</label>
            <select id="sort" value={sort} onChange={handleSortChange}>
              <option value="priceHighToLow">Price (High to Low)</option>
              <option value="recent">Most Recent</option>
              <option value="oldest">Oldest</option>
              <option value="offerExpiryDate">Offer Expiry Date</option>
            </select>
          </div>
        </div>
        <div className="offer-search-section">
          <form onSubmit={handleSearchSubmit} className="search-form">
            <div className="search-input">
              <input
                type="text"
                id="search"
                placeholder="Search Offers"
                value={searchQuery}
                onChange={handleSearchChange}
              />
              <button type="submit" className="offer-search-button">
                Search
              </button>
            </div>
          </form>
        </div>
      </div>
      <div className="divider-line"></div>
      <OfferToolBar
        onAddOffer={onAddOffer}
        onDownloadSummary={onDownloadSummary}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </div>
  );
}

export default OfferSortBar;
