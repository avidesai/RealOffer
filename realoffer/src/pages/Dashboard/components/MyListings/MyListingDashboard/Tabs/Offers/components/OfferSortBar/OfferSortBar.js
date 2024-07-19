// OfferSortBar.js

import React, { useState } from 'react';
import './OfferSortBar.css';

function OfferSortBar({ onFilterChange, onSortChange, onSearch }) {
  const [filter, setFilter] = useState('active');
  const [sort, setSort] = useState('recent');
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
    <div className="offer-sort-bar">
      <div className="filter-sort-section">
        <div className="offer-filter-section">
          <label htmlFor="filter">Filter</label>
          <select id="filter" value={filter} onChange={handleFilterChange}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div className="offer-sort-section">
          <label htmlFor="sort">Sort</label>
          <select id="sort" value={sort} onChange={handleSortChange}>
            <option value="recent">Most Recent</option>
            <option value="oldest">Oldest</option>
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
  );
}

export default OfferSortBar;
