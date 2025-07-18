// Activity.js

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../../../../../../context/AuthContext';
import ActivitySortBar from './components/ActivitySortBar/ActivitySortBar';
import TabPaywall from '../../../../../../../components/TabPaywall/TabPaywall';
import Avatar from '../../../../../../../components/Avatar/Avatar';
import './Activity.css';

const Activity = ({ listingId }) => {
  const { token, user } = useAuth(); // Get the token and user from AuthContext
  const [activities, setActivities] = useState([]);
  const [filteredActivities, setFilteredActivities] = useState([]);
  const [expandedUsers, setExpandedUsers] = useState(new Set());
  const [userGroups, setUserGroups] = useState([]);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('most-recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [metrics, setMetrics] = useState({ views: 0, downloads: 0, offers: 0, buyerPackages: 0 });
  const [loading, setLoading] = useState(true);

  const fetchActivityStats = useCallback(async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/activities/stats/${listingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setMetrics({
        views: response.data.views,
        downloads: response.data.downloads,
        offers: response.data.offers,
        buyerPackages: response.data.buyerPackagesCreated
      });
    } catch (error) {
      console.error('Error fetching activity stats:', error);
    }
  }, [listingId, token]);

  const calculateMetrics = useCallback((activitiesData) => {
    // This function is now only used for fallback if stats endpoint fails
    const newMetrics = {
      views: activitiesData.filter(activity => activity.type === 'view').length,
      downloads: activitiesData.filter(activity => activity.type === 'download').length,
      offers: activitiesData.filter(activity => activity.type === 'offer').length,
      buyerPackages: activitiesData.filter(activity => activity.type === 'buyer_package_created').length,
    };
    setMetrics(newMetrics);
  }, []);

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/activities?listingId=${listingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const activitiesData = response.data;
      setActivities(activitiesData);
      // Don't calculate metrics from activities anymore, use the stats endpoint
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  }, [listingId, token]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchActivities(), fetchActivityStats()]);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [fetchActivities, fetchActivityStats]);

  // Group activities by user first, then by activity type
  const groupActivitiesByUser = useCallback((activities) => {
    const userGroups = {};
    const timeWindow = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

    activities.forEach(activity => {
      const userId = activity.user._id;
      if (!userGroups[userId]) {
        userGroups[userId] = [];
      }
      userGroups[userId].push(activity);
    });

    // For each user, group their activities by type
    const processedUserGroups = Object.entries(userGroups).map(([userId, userActivities]) => {
      const grouped = [];
      
      userActivities.forEach(activity => {
        const existingGroup = grouped.find(group => {
          const firstActivity = group[0];
          const sameType = firstActivity.type === activity.type;
          const withinTimeWindow = Math.abs(new Date(firstActivity.timestamp) - new Date(activity.timestamp)) < timeWindow;
          
          // For downloads, also check if it's the same document
          if (activity.type === 'download') {
            const sameDocument = firstActivity.documentModified?._id === activity.documentModified?._id;
            return sameType && sameDocument && withinTimeWindow;
          }
          
          // For other activities, use the original logic
          return sameType && withinTimeWindow;
        });

        if (existingGroup) {
          existingGroup.push(activity);
        } else {
          grouped.push([activity]);
        }
      });

      const processedActivities = grouped.map(group => {
        if (group.length === 1) {
          return group[0];
        } else {
          const mostRecent = group.reduce((latest, current) => 
            new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest
          );
          return {
            ...mostRecent,
            _groupedCount: group.length
          };
        }
      });

      return {
        userId,
        user: userActivities[0].user,
        activities: processedActivities,
        totalActivities: userActivities.length,
        lastActivity: processedActivities[0] // Most recent activity
      };
    });

    return processedUserGroups.sort((a, b) => 
      new Date(b.lastActivity.timestamp) - new Date(a.lastActivity.timestamp)
    );
  }, []);

  const toggleUserExpansion = useCallback((userId) => {
    setExpandedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  }, []);

  useEffect(() => {
    let filtered = [...activities];

    if (filter !== 'all') {
      filtered = filtered.filter(activity => activity.type === filter);
    }

    if (searchQuery) {
      filtered = filtered.filter(activity => {
        const userName = getUserName(activity.user);
        return userName.toLowerCase().includes(searchQuery.toLowerCase());
      });
    }

    filtered.sort((a, b) => 
      sort === 'most-recent' 
        ? new Date(b.timestamp) - new Date(a.timestamp)
        : new Date(a.timestamp) - new Date(b.timestamp)
    );

    // Group similar activities
    const groupedActivities = groupActivitiesByUser(filtered);
    
    // Sort user groups based on sort selection
    const sortedUserGroups = groupedActivities.sort((a, b) => {
      const dateA = new Date(a.lastActivity.timestamp);
      const dateB = new Date(b.lastActivity.timestamp);
      return sort === 'most-recent' ? dateB - dateA : dateA - dateB;
    });
    
    setUserGroups(sortedUserGroups);
  }, [filter, sort, searchQuery, activities, groupActivitiesByUser]);

  const getUserName = (user) => {
    if (!user) return 'Unknown User';
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.firstName) return user.firstName;
    if (user.lastName) return user.lastName;
    if (user.email) return user.email.split('@')[0];
    return 'Unknown User';
  };

  const getActionText = useCallback((activity) => {
    const baseText = (() => {
      switch (activity.type) {
        case 'view':
          return 'viewed the listing';
        case 'download':
          return `downloaded ${activity.documentModified ? activity.documentModified.title : 'a document'}`;
        case 'offer':
          return 'made an offer';
        case 'buyer_package_created':
          return 'created buyer package';
        default:
          return activity.action || 'performed an action';
      }
    })();

    // Add grouped count if applicable
    if (activity._groupedCount && activity._groupedCount > 1) {
      return `${baseText} (${activity._groupedCount} times)`;
    }

    return baseText;
  }, []);

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
      case 'buyer_package_created':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 7L10 17L5 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M21 12V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      default:
        return null;
    }
  };

  // Check if user is pro - if not, show paywall
  if (!user?.isPremium) {
    return (
      <div className="activity-tab">
        <TabPaywall feature="activity" />
      </div>
    );
  }

  return (
    <div className="activity-tab">
      <ActivitySortBar
        onFilterChange={setFilter}
        onSortChange={setSort}
        onSearch={setSearchQuery}
      />
      <div className="activity-stats">
        <div className="activity-stat">
          <div className="stat-icon buyer-package">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 7L10 17L5 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 12V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="stat-number">{metrics.buyerPackages}</span>
          <span className="stat-label">Packages</span>
        </div>
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
        ) : userGroups.length === 0 ? (
          <div className="no-activities">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 8V12" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 16H12.01" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p>No activities found</p>
          </div>
        ) : (
          userGroups.map((userGroup, index) => (
            <div key={index} className="activity-user-group">
              <div 
                className="activity-user-header"
                onClick={() => toggleUserExpansion(userGroup.userId)}
              >
                <Avatar 
                  src={userGroup.user?.profilePhotoUrl}
                  firstName={userGroup.user?.firstName}
                  lastName={userGroup.user?.lastName}
                  alt={getUserName(userGroup.user)}
                  size="activity"
                />
                <div className="user-info">
                  <h3>{getUserName(userGroup.user)}</h3>
                  <p>{userGroup.totalActivities} activities</p>
                </div>
                <div className="expand-arrow">
                  <svg 
                    width="16" 
                    height="16" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                    className={expandedUsers.has(userGroup.userId) ? 'expanded' : ''}
                  >
                    <path 
                      d="M6 9L12 15L18 9" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
              {expandedUsers.has(userGroup.userId) && (
                <div className="activity-user-activities">
                  {userGroup.activities.map((activity, activityIndex) => (
                    <div key={activityIndex} className="activity-item">
                      <div className={`activity-icon ${activity.type === 'buyer_package_created' ? 'buyer-package' : activity.type}`}>
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="activity-content">
                        <div className="activity-header">
                          <div className="activity-user">
                            <strong>{getUserName(activity.user)}</strong>
                            <span className="activity-action">
                              {getActionText(activity)}
                            </span>
                          </div>
                          <p className="activity-date">
                            {new Date(activity.timestamp).toLocaleString('en-US', {
                              month: 'numeric',
                              day: 'numeric',
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </p>
                        </div>
                        {activity.documentModified && activity.type !== 'download' && (
                          <a href={activity.documentModified.url} className="activity-document">
                            {activity.documentModified.title}
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Activity;
