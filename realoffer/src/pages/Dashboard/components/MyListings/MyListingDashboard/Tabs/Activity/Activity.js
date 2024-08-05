import React, { useState, useEffect } from 'react';
import ActivitySortBar from './components/ActivitySortBar/ActivitySortBar';
import './Activity.css';

const Activity = () => {
  const [activities, setActivities] = useState([]);
  const [filteredActivities, setFilteredActivities] = useState([]);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('most-recent');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Mock data
    const mockData = [
      { user: 'Garret Jones', action: 'left the package', timestamp: 'August 04, 2024 at 12:12 PM', documentModified: '', user2: '' },
      { user: 'NgocAnh Nguyen', action: 'viewed the package', timestamp: 'August 02, 2024 at 6:40 PM', documentModified: '', user2: '' },
      { user: 'Ken Nachtweih', action: 'viewed', timestamp: 'August 02, 2024 at 4:06 PM', documentModified: 'Offer Instructions.pdf', user2: '' },
      { user: 'Ken Nachtweih', action: 'viewed', timestamp: 'August 02, 2024 at 4:06 PM', documentModified: 'Coversheet.pdf', user2: '' },
      { user: 'Ken Nachtweih', action: 'viewed', timestamp: 'August 02, 2024 at 4:06 PM', documentModified: 'To Be Signed w/ Offer (disclosures, cover pages, etc.).pdf', user2: '' },
      { user: 'Ken Nachtweih', action: 'viewed the package', timestamp: 'August 02, 2024 at 4:05 PM', documentModified: '', user2: '' },
      { user: 'Ken Nachtweih', action: 'requested access for the package', timestamp: 'August 02, 2024 at 4:04 PM', documentModified: '', user2: '' },
      { user: 'Kristina Carter', action: 'viewed the package', timestamp: 'August 02, 2024 at 1:30 PM', documentModified: '', user2: '' },
      { user: 'Kristina Carter', action: 'viewed', timestamp: 'August 02, 2024 at 12:56 PM', documentModified: 'To Be Signed w/ Offer (disclosures, cover pages, etc.).pdf', user2: '' },
      { user: 'Kristina Carter', action: 'viewed the package', timestamp: 'August 02, 2024 at 12:56 PM', documentModified: '', user2: '' },
      { user: 'Kristina Carter', action: 'viewed', timestamp: 'August 02, 2024 at 12:36 PM', documentModified: 'Offer Instructions.pdf', user2: '' }
    ];

    setActivities(mockData);
  }, []);

  useEffect(() => {
    let filtered = [...activities];

    if (filter !== 'all') {
      filtered = filtered.filter(activity => activity.type === filter);
    }

    if (searchQuery) {
      filtered = filtered.filter(activity => activity.user.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    if (sort === 'most-recent') {
      filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } else {
      filtered.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }

    setFilteredActivities(filtered);
  }, [filter, sort, searchQuery, activities]);

  return (
    <div className="activity-tab">
      <ActivitySortBar
        onFilterChange={setFilter}
        onSortChange={setSort}
        onSearch={setSearchQuery}
      />
      <div className="activity-stats">
        <div className="activity-stat">
          <span className="stat-number">131</span>
          <span className="stat-label">Interested Parties</span>
        </div>
        <div className="activity-stat">
          <span className="stat-number">457</span>
          <span className="stat-label">Views</span>
        </div>
        <div className="activity-stat">
          <span className="stat-number">34</span>
          <span className="stat-label">Downloads</span>
        </div>
        <div className="activity-stat">
          <span className="stat-number">14</span>
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
                  <strong>{activity.user}</strong> {activity.action} <span className="activity-document">{activity.documentModified}</span>
                </p>
                <p className="activity-date">{activity.timestamp}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Activity;
