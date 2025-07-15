// BuyerPackageActivity.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../../../../../context/AuthContext';
import BuyerPackageActivitySortBar from './components/BuyerPackageActivitySortBar/BuyerPackageActivitySortBar';
import './BuyerPackageActivity.css';

const BuyerPackageActivity = ({ buyerPackageId }) => {
  const { token } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('recent');
  const [filterBy, setFilterBy] = useState('all');

  useEffect(() => {
    fetchActivities();
  }, [buyerPackageId, sortBy, filterBy]);

  const fetchActivities = async () => {
    if (!buyerPackageId) return;

    try {
      setLoading(true);
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/activities?buyerPackageId=${buyerPackageId}&sort=${sortBy}&filter=${filterBy}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setActivities(response.data);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'view':
        return '👁️';
      case 'download':
        return '⬇️';
      case 'offer':
        return '📋';
      case 'buyer_package_created':
        return '📦';
      default:
        return '📝';
    }
  };

  const getActivityText = (activity) => {
    switch (activity.type) {
      case 'view':
        return 'Viewed the property';
      case 'download':
        return `Downloaded ${activity.metadata?.documentTitle || 'a document'}`;
      case 'offer':
        return 'Made an offer';
      case 'buyer_package_created':
        return 'Created buyer package';
      default:
        return 'Performed an action';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) {
        return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
      } else {
        return date.toLocaleDateString();
      }
    }
  };

  if (loading) {
    return (
      <div className="buyer-package-activity-loading">
        <div className="buyer-package-activity-spinner"></div>
        <p>Loading activity...</p>
      </div>
    );
  }

  return (
    <div className="buyer-package-activity">
      <div className="buyer-package-activity-header">
        <h2>Activity</h2>
        <p>Track views, downloads, and offers for this property</p>
      </div>

      <BuyerPackageActivitySortBar
        sortBy={sortBy}
        filterBy={filterBy}
        onSortChange={setSortBy}
        onFilterChange={setFilterBy}
      />

      <div className="buyer-package-activity-list">
        {activities.length === 0 ? (
          <div className="buyer-package-activity-empty">
            <p>No activity recorded yet.</p>
          </div>
        ) : (
          activities.map((activity) => (
            <div key={activity._id} className="buyer-package-activity-item">
              <div className="buyer-package-activity-icon">
                {getActivityIcon(activity.type)}
              </div>
              <div className="buyer-package-activity-content">
                <p className="buyer-package-activity-text">
                  {getActivityText(activity)}
                </p>
                <span className="buyer-package-activity-time">
                  {formatDate(activity.timestamp)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default BuyerPackageActivity; 