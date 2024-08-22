import React, { useState } from 'react';
import './MessageSortBar.css';

function MessageSortBar({ onFilterChange, onSortChange, onSearch }) {
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
    <div className="message-sort-bar">
      <div className="filter-sort-section">
        <div className="message-filter-section">
          <label htmlFor="filter">Filter</label>
          <select id="filter" value={filter} onChange={handleFilterChange}>
            <option value="all">All</option>
            <option value="invitations">Invitations</option>
            <option value="messages">Messages</option>
            <option value="replies">Replies</option>
          </select>
        </div>
        <div className="message-sort-section">
          <label htmlFor="sort">Sort</label>
          <select id="sort" value={sort} onChange={handleSortChange}>
            <option value="most-recent">Most Recent</option>
            <option value="least-recent">Least Recent</option>
          </select>
        </div>
      </div>
      <div className="message-search-section">
        <form onSubmit={handleSearchSubmit} className="search-form">
          <div className="search-input">
            <input
              type="text"
              id="search"
              placeholder="Search Messages"
              value={searchQuery}
              onChange={handleSearchChange}
            />
            <button type="submit" className="message-search-button">
              Search
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default MessageSortBar;