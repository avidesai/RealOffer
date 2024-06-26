import React, { useState } from 'react';
import './BuyerFilterSortBar.css';

function BuyerFilterSortBar({ onFilterChange, onSortChange, onSearch }) {
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

  const handleSearchSubmit = () => {
    onSearch(searchQuery);
  };

  return (
    <div className="buyer-filter-sort-bar">
      <div className="buyer-filters">
        <div className="buyer-filter-section">
          <label htmlFor="filter">Filter:</label>
          <select id="filter" value={filter} onChange={handleFilterChange}>
            <option value="active">Active</option>
            <option value="sold">Sold</option>
            <option value="pending">Pending</option>
            {/* Add more filter options here */}
          </select>
        </div>
        <div className="buyer-sort-section">
          <label htmlFor="sort">Sort:</label>
          <select id="sort" value={sort} onChange={handleSortChange}>
            <option value="recent">Most Recent</option>
            <option value="priceHighLow">Price: High to Low</option>
            <option value="priceLowHigh">Price: Low to High</option>
            {/* Add more sort options here */}
          </select>
        </div>
      </div>
      <div className="buyer-search-section">
        <input
          type="text"
          placeholder="Search Packages"
          value={searchQuery}
          onChange={handleSearchChange}
        />
        <button className="buyer-search-button" onClick={handleSearchSubmit}>
          Search
        </button>
      </div>
    </div>
  );
}

export default BuyerFilterSortBar;
