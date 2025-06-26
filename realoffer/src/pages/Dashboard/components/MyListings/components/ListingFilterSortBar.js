// ListingFilterSortBar.js

import React, { useState, useEffect } from 'react';
import './ListingFilterSortBar.css';

function ListingFilterSortBar({ onFilterChange, onSortChange, onSearch }) {
  const [filter, setFilter] = useState('active');
  const [sort, setSort] = useState('recent');
  const [searchQuery, setSearchQuery] = useState('');

  // Debounce search to avoid too many calls
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(searchQuery);
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery, onSearch]);

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
              <option value="active">Active</option>
              <option value="archived">Archived</option>
              <option value="all">All Listings</option>
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
            </select>
          </div>
        </div>
        <div className="lfsb-search-section">
          <input
            type="text"
            className="lfsb-search-input"
            placeholder="Search Listings"
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>
      </div>
    </div>
  );
}

export default ListingFilterSortBar;
