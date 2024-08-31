import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ViewerSortBar from './components/ViewerSortBar/ViewerSortBar';
import { useAuth } from '../../../../../../../context/AuthContext'; // Import useAuth hook
import './Viewers.css';

const Viewers = ({ listingId }) => {
  const { token } = useAuth(); // Get the token from AuthContext
  const [viewers, setViewers] = useState([]);
  const [filter, setFilter] = useState('active');
  const [sort, setSort] = useState('name-asc');

  useEffect(() => {
    const fetchViewers = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/viewers/${listingId}`, {
          headers: {
            'Authorization': `Bearer ${token}` // Include the token in the header
          }
        });
        setViewers(response.data);
      } catch (error) {
        console.error('Error fetching viewers:', error);
      }
    };

    fetchViewers();
  }, [listingId, token]); // Add token to dependency array

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
  };

  const handleSortChange = (newSort) => {
    setSort(newSort);
  };

  const filteredViewers = viewers.filter(viewer => filter === 'active' ? viewer.active : !viewer.active);
  const sortedViewers = filteredViewers.sort((a, b) => {
    if (sort === 'name-asc') {
      return a.name.localeCompare(b.name);
    } else {
      return b.name.localeCompare(a.name);
    }
  });

  return (
    <div className="viewers-tab">
      <ViewerSortBar onFilterChange={handleFilterChange} onSortChange={handleSortChange} />
      <div className="viewers-list">
        {sortedViewers.length === 0 ? (
          <p className="no-viewers-message">No viewers found.</p>
        ) : (
          sortedViewers.map(viewer => (
            <div key={viewer._id} className="viewer-item">
              <div className="viewer-info">
                <p className="viewer-name">{viewer.name}</p>
                <p className="viewer-email">{viewer.email}</p>
                <p className="viewer-phone">{viewer.phone}</p>
                <p className="viewer-role">{viewer.role}</p>
              </div>
              <div className="viewer-actions">
                <button className="edit-button">Edit</button>
                <button className="remind-button">Remind</button>
                <button className="remove-button">Remove</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Viewers;
