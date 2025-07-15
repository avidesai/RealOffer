// BuyerPackageActivitySortBar.js

import React from 'react';
import './BuyerPackageActivitySortBar.css';

const BuyerPackageActivitySortBar = ({ sortBy, filterBy, onSortChange, onFilterChange }) => {
  return (
    <div className="buyer-package-activity-sort-bar">
      <div className="buyer-package-activity-sort-group">
        <label htmlFor="activity-filter">Filter:</label>
        <select
          id="activity-filter"
          value={filterBy}
          onChange={(e) => onFilterChange(e.target.value)}
          className="buyer-package-activity-select"
        >
          <option value="all">All Activities</option>
          <option value="view">Views</option>
          <option value="download">Downloads</option>
          <option value="offer">Offers</option>
        </select>
      </div>

      <div className="buyer-package-activity-sort-group">
        <label htmlFor="activity-sort">Sort:</label>
        <select
          id="activity-sort"
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          className="buyer-package-activity-select"
        >
          <option value="recent">Most Recent</option>
          <option value="oldest">Oldest First</option>
        </select>
      </div>
    </div>
  );
};

export default BuyerPackageActivitySortBar; 