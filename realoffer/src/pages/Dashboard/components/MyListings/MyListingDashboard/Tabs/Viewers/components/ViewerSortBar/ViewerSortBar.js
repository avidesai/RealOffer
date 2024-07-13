import React, { useState } from 'react';
import './ViewerSortBar.css';

function ViewerSortBar({ onFilterChange, onSortChange }) {
  const [filter, setFilter] = useState('active');
  const [sort, setSort] = useState('name-asc');

  const handleFilterChange = (e) => {
    setFilter(e.target.value);
    onFilterChange(e.target.value);
  };

  const handleSortChange = (e) => {
    setSort(e.target.value);
    onSortChange(e.target.value);
  };

  return (
    <div className="viewer-sort-bar">
      <div className="filter-sort-section">
        <div className="viewer-filter-section">
          <label htmlFor="filter">Filter</label>
          <select id="filter" value={filter} onChange={handleFilterChange}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div className="viewer-sort-section">
          <label htmlFor="sort">Sort</label>
          <select id="sort" value={sort} onChange={handleSortChange}>
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export default ViewerSortBar;
