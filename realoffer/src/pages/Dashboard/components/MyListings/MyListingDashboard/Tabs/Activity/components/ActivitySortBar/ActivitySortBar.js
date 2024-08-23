import React, { useState } from 'react';
import './ActivitySortBar.css';

function ActivitySortBar({ onFilterChange, onSortChange, onSearch }) {
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('most-recent');
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
    <div className="activity-sort-bar">
      <div className="filter-sort-section">
        <div className="activity-filter-section">
          <label htmlFor="filter">Filter</label>
          <select id="filter" value={filter} onChange={handleFilterChange}>
            <option value="all">All</option>
            <option value="view">View</option>
            <option value="download">Download</option>
            <option value="offer">Offer</option>
          </select>
        </div>
        <div className="activity-sort-section">
          <label htmlFor="sort">Sort</label>
          <select id="sort" value={sort} onChange={handleSortChange}>
            <option value="most-recent">Most Recent</option>
            <option value="least-recent">Least Recent</option>
          </select>
        </div>
      </div>
      <div className="activity-search-section">
        <form onSubmit={handleSearchSubmit} className="search-form">
          <div className="search-input">
            <input
              type="text"
              id="search"
              placeholder="Search Activity"
              value={searchQuery}
              onChange={handleSearchChange}
            />
            <button type="submit" className="activity-search-button">
              Search
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ActivitySortBar;
