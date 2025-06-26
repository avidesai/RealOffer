// ListingFilterSortBar.js

import React, { useState } from 'react';
import './ListingFilterSortBar.css';

function ListingFilterSortBar({ onFilterChange, onSortChange, onSearch }) {
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

  // SVG down arrow for custom dropdown
  const downArrow =
    'data:image/svg+xml;utf8,<svg fill="%237a8595" height="18" viewBox="0 0 20 20" width="18" xmlns="http://www.w3.org/2000/svg"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>';

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
        <form className="lfsb-search-form" onSubmit={handleSearchSubmit} autoComplete="off">
          <div className="lfsb-search-input-group">
            <input
              type="text"
              className="lfsb-search-input"
              placeholder="Search Packages"
              value={searchQuery}
              onChange={handleSearchChange}
            />
            <button type="submit" className="lfsb-search-button">Search</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ListingFilterSortBar;
