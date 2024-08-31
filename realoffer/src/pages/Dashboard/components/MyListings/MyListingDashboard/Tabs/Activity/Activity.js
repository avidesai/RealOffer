// Activity.js

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import ActivitySortBar from './components/ActivitySortBar/ActivitySortBar';
import { useAuth } from '../../../../../../../context/AuthContext'; // Import useAuth hook
import './Activity.css';

const Activity = ({ listingId }) => {
  const { token } = useAuth(); // Get the token from AuthContext
  const [activities, setActivities] = useState([]);
  const [filteredActivities, setFilteredActivities] = useState([]);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('most-recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [metrics, setMetrics] = useState({ views: 0, downloads: 0, offers: 0 });

  const calculateMetrics = useCallback((activitiesData) => {
    const newMetrics = {
      views: activitiesData.filter(activity => activity.type === 'view').length,
      downloads: activitiesData.filter(activity => activity.type === 'download').length,
      offers: activitiesData.filter(activity => activity.type === 'offer').length,
    };
    setMetrics(newMetrics);
  }, []);

  const fetchActivities = useCallback(async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/activities?listingId=${listingId}`, {
        headers: {
          'Authorization': `Bearer ${token}` // Include the token in the header
        }
      });
      const activitiesData = response.data;
      setActivities(activitiesData);
      calculateMetrics(activitiesData);
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  }, [calculateMetrics, listingId, token]); // Add token to dependency array

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  useEffect(() => {
    let filtered = [...activities];

    if (filter !== 'all') {
      filtered = filtered.filter(activity => activity.type === filter);
    }

    if (searchQuery) {
      filtered = filtered.filter(activity => 
        activity.user.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    filtered.sort((a, b) => 
      sort === 'most-recent' 
        ? new Date(b.timestamp) - new Date(a.timestamp)
        : new Date(a.timestamp) - new Date(b.timestamp)
    );

    setFilteredActivities(filtered);
  }, [filter, sort, searchQuery, activities]);

  const getActionText = useCallback((activity) => {
    switch (activity.type) {
      case 'view':
        return 'viewed the listing';
      case 'download':
        return `downloaded ${activity.documentModified ? activity.documentModified.title : ''}`;
      case 'offer':
        return 'made an offer';
      default:
        return activity.action;
    }
  }, []);

  return (
    <div className="activity-tab">
      <ActivitySortBar
        onFilterChange={setFilter}
        onSortChange={setSort}
        onSearch={setSearchQuery}
      />
      <div className="activity-stats">
        <div className="activity-stat">
          <span className="stat-number">{metrics.views}</span>
          <span className="stat-label">Views</span>
        </div>
        <div className="activity-stat">
          <span className="stat-number">{metrics.downloads}</span>
          <span className="stat-label">Downloads</span>
        </div>
        <div className="activity-stat">
          <span className="stat-number">{metrics.offers}</span>
          <span className="stat-label">Offers</span>
        </div>
      </div>
      <div className="activity-list">
        {filteredActivities.length === 0 ? (
          <p className="no-activities-message">No activities found.</p>
        ) : (
          filteredActivities.map((activity, index) => (
            <div key={index} className="activity-item">
              <div className="activity-info">
                <p className="activity-user">
                  <strong>{activity.user.name}</strong> {getActionText(activity)}
                </p>
                <p className="activity-date">{new Date(activity.timestamp).toLocaleString()}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Activity;
