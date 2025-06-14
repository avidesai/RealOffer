import React, { useState } from 'react';
import './ActivitySortBar.css';

function ActivitySortBar({ onFilterChange, onSortChange, onSearch }) {
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('most-recent');
  const [searchQuery, setSearchQuery] = useState('');

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    onFilterChange(newFilter);
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

  const handleClearSearch = () => {
    setSearchQuery('');
    onSearch('');
  };

  return (
    <div className="activity-sort-bar improved-activity-sort-bar">
      <div className="filter-sort-section">
        <div className="activity-filter-section">
          <div className="filter-pills">
            <button
              className={`filter-pill ${filter === 'all' ? 'active' : ''}`}
              onClick={() => handleFilterChange('all')}
            >
              All
            </button>
            <button
              className={`filter-pill ${filter === 'view' ? 'active' : ''}`}
              onClick={() => handleFilterChange('view')}
            >
              Views
            </button>
            <button
              className={`filter-pill ${filter === 'download' ? 'active' : ''}`}
              onClick={() => handleFilterChange('download')}
            >
              Downloads
            </button>
            <button
              className={`filter-pill ${filter === 'offer' ? 'active' : ''}`}
              onClick={() => handleFilterChange('offer')}
            >
              Offers
            </button>
          </div>
          <div className="activity-sort-section">
            <select id="sort" value={sort} onChange={handleSortChange}>
              <option value="most-recent">Most Recent</option>
              <option value="least-recent">Least Recent</option>
            </select>
          </div>
        </div>
      </div>
      <div className="activity-search-section">
        <form onSubmit={handleSearchSubmit} className="search-form">
          <div className="search-input">
            <input
              type="text"
              id="search"
              placeholder="Search by user name..."
              value={searchQuery}
              onChange={handleSearchChange}
            />
            {searchQuery && (
              <button
                type="button"
                className="clear-search"
                onClick={handleClearSearch}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
            <button type="submit" className="activity-search-button">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Search
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ActivitySortBar;
