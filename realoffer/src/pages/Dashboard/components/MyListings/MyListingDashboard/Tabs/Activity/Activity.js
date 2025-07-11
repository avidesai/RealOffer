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
  const [loading, setLoading] = useState(true);

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
      setLoading(true);
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
    } finally {
      setLoading(false);
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

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'view':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 4.5C7 4.5 2.73 7.61 1 12C2.73 16.39 7 19.5 12 19.5C17 19.5 21.27 16.39 23 12C21.27 7.61 17 4.5 12 4.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'download':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'offer':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 21V5C16 3.89543 15.1046 3 14 3H10C8.89543 3 8 3.89543 8 5V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="activity-tab">
      <ActivitySortBar
        onFilterChange={setFilter}
        onSortChange={setSort}
        onSearch={setSearchQuery}
      />
      <div className="activity-stats">
        <div className="activity-stat">
          <div className="stat-icon view">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 4.5C7 4.5 2.73 7.61 1 12C2.73 16.39 7 19.5 12 19.5C17 19.5 21.27 16.39 23 12C21.27 7.61 17 4.5 12 4.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="stat-number">{metrics.views}</span>
          <span className="stat-label">Views</span>
        </div>
        <div className="activity-stat">
          <div className="stat-icon download">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="stat-number">{metrics.downloads}</span>
          <span className="stat-label">Downloads</span>
        </div>
        <div className="activity-stat">
          <div className="stat-icon offer">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 21V5C16 3.89543 15.1046 3 14 3H10C8.89543 3 8 3.89543 8 5V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="stat-number">{metrics.offers}</span>
          <span className="stat-label">Offers</span>
        </div>
      </div>
      <div className="activity-list">
        {loading ? (
          <div className="activity-tab-loading">
            <div className="activity-tab-spinner"></div>
            <p>Loading activity data...</p>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="no-activities">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 8V12" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 16H12.01" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p>No activities found</p>
          </div>
        ) : (
          filteredActivities.map((activity, index) => (
            <div key={index} className="activity-item">
              <div className="activity-avatar">
                {activity.user.avatar ? (
                  <img src={activity.user.avatar} alt={activity.user.name} />
                ) : (
                  <div className="avatar-initials">{getInitials(activity.user.name)}</div>
                )}
              </div>
              <div className="activity-info">
                <div className="activity-header">
                  <p className="activity-user">
                    <strong>{activity.user.name}</strong>
                    <span className="activity-action">
                      {getActivityIcon(activity.type)}
                      {getActionText(activity)}
                    </span>
                  </p>
                  <p className="activity-date">
                    {new Date(activity.timestamp).toLocaleString()}
                  </p>
                </div>
                {activity.documentModified && (
                  <a href={activity.documentModified.url} className="activity-document">
                    {activity.documentModified.title}
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Activity;
