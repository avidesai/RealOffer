import React from 'react';
import './ListingFilterSortBar.css';

function ListingFilterSortBar() {
  // Handle filter and sorting state and functions here
  
  return (
    <div className="filter-sort-bar">
      <div className="filter-section">
        <label htmlFor="filter">Filter:</label>
        <select id="filter">
          <option value="active">Active</option>
          {/* More filter options */}
        </select>
      </div>
      <div className="sort-section">
        <label htmlFor="sort">Sort:</label>
        <select id="sort">
          <option value="recent">Most Recent</option>
          {/* More sort options */}
        </select>
      </div>
      <div className="search-section">
        <input type="text" placeholder="Search Packages" />
        <button className="search-button">Search</button>
      </div>
    </div>
  );
}

export default ListingFilterSortBar;
