// ListingFilterSortBar.js

import React, { useState, useEffect } from 'react';
import './ListingFilterSortBar.css';

function ListingFilterSortBar({ 
  onFilterChange, 
  onSortChange, 
  onSearch, 
  totalListings = 0,
  filteredCount = 0,
  searchQuery = ''
}) {
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('recent');
  const [localSearchQuery, setLocalSearchQuery] = useState('');

  // Sync local search query with prop
  useEffect(() => {
    setLocalSearchQuery(searchQuery);
  }, [searchQuery]);

  // Debounce search to avoid too many calls
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(localSearchQuery);
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [localSearchQuery, onSearch]);

  const handleFilterChange = (e) => {
    setFilter(e.target.value);
    onFilterChange(e.target.value);
  };

  const handleSortChange = (e) => {
    setSort(e.target.value);
    onSortChange(e.target.value);
  };

  const handleSearchChange = (e) => {
    setLocalSearchQuery(e.target.value);
  };

  return (
    <div className="lfsb-bar">
      <div className="lfsb-top-row">
        <div className="lfsb-filter-sort-group">
          <div className="lfsb-filter-section">
            <span className="lfsb-label">Filter</span>
            <select
              className="lfsb-select"
              value={filter}
              onChange={handleFilterChange}
            >
              <option value="all">All Listings ({totalListings})</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div className="lfsb-sort-section">
            <span className="lfsb-label">Sort</span>
            <select
              className="lfsb-select"
              value={sort}
              onChange={handleSortChange}
            >
              <option value="recent">Most Recent</option>
              <option value="oldest">Oldest</option>
              <option value="price-high">Price: High to Low</option>
              <option value="price-low">Price: Low to High</option>
            </select>
          </div>
        </div>
        <div className="lfsb-search-section">
          <input
            type="text"
            className="lfsb-search-input"
            placeholder="Search Listings"
            value={localSearchQuery}
            onChange={handleSearchChange}
          />
        </div>
      </div>
      {filteredCount !== totalListings && (
        <div className="lfsb-results-info">
          Showing {filteredCount} of {totalListings} listings
        </div>
      )}
    </div>
  );
}

export default ListingFilterSortBar;
