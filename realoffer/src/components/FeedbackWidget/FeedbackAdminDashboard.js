import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Star, MessageCircle, HelpCircle, Bug, FileText, Clock, CheckCircle, XCircle } from 'lucide-react';
import './FeedbackAdminDashboard.css';

const FeedbackAdminDashboard = () => {
  const { token, user } = useAuth();
  const [feedback, setFeedback] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedFeedback, setSelectedFeedback] = useState(null);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    fetchFeedback();
    fetchStats();
  }, [user, filter]);

  const fetchFeedback = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/feedback/recent?limit=50&${filter !== 'all' ? `type=${filter}` : ''}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setFeedback(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/feedback/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data.data || {});
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const updateStatus = async (feedbackId, status) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/feedback/${feedbackId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      
      if (response.ok) {
        fetchFeedback();
        fetchStats();
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'rating': return <Star size={16} />;
      case 'feature_request': return <FileText size={16} />;
      case 'bug_report': return <Bug size={16} />;
      case 'support': return <HelpCircle size={16} />;
      default: return <MessageCircle size={16} />;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'resolved': return <CheckCircle size={16} className="status-resolved" />;
      case 'in_progress': return <Clock size={16} className="status-progress" />;
      case 'closed': return <XCircle size={16} className="status-closed" />;
      default: return <Clock size={16} className="status-pending" />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (user?.role !== 'admin') {
    return (
      <div className="fad-error">
        <h2>Access Denied</h2>
        <p>You need admin privileges to view this dashboard.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="fad-loading">
        <div className="fad-loading-spinner"></div>
        <p>Loading feedback...</p>
      </div>
    );
  }

  return (
    <div className="fad-dashboard">
      <div className="fad-header">
        <h1>Feedback Dashboard</h1>
        <div className="fad-stats">
          <div className="fad-stat-card">
            <h3>Total Feedback</h3>
            <p>{stats.total || 0}</p>
          </div>
          <div className="fad-stat-card">
            <h3>Average Rating</h3>
            <p>{stats.avgRating || 0}/5</p>
          </div>
          <div className="fad-stat-card">
            <h3>Pending</h3>
            <p>{feedback.filter(f => f.status === 'pending').length}</p>
          </div>
        </div>
      </div>

      <div className="fad-filters">
        <button 
          className={`fad-filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button 
          className={`fad-filter-btn ${filter === 'rating' ? 'active' : ''}`}
          onClick={() => setFilter('rating')}
        >
          <Star size={14} />
          Ratings
        </button>
        <button 
          className={`fad-filter-btn ${filter === 'feature_request' ? 'active' : ''}`}
          onClick={() => setFilter('feature_request')}
        >
          <FileText size={14} />
          Feature Requests
        </button>
        <button 
          className={`fad-filter-btn ${filter === 'bug_report' ? 'active' : ''}`}
          onClick={() => setFilter('bug_report')}
        >
          <Bug size={14} />
          Bug Reports
        </button>
      </div>

      <div className="fad-list">
        {feedback.map((item) => (
          <div key={item._id} className="fad-item">
            <div className="fad-item-header">
              <div className="fad-item-type">
                {getTypeIcon(item.type)}
                <span className="fad-type-label">{item.type.replace('_', ' ')}</span>
              </div>
              <div className="fad-item-meta">
                <span className="fad-user-info">
                  {item.userId?.firstName} {item.userId?.lastName}
                </span>
                <span className="date">{formatDate(item.createdAt)}</span>
                <span className={`fad-user-type ${item.userType}`}>
                  {item.userType}
                </span>
              </div>
            </div>

            {item.rating && (
              <div className="fad-item-rating">
                <span>Rating: </span>
                {[1, 2, 3, 4, 5].map((star) => (
                  <span key={star} className={`fad-star ${star <= item.rating ? 'filled' : ''}`}>
                    ★
                  </span>
                ))}
              </div>
            )}

            {item.message && (
              <div className="fad-item-message">
                <p>{item.message}</p>
              </div>
            )}

            <div className="fad-item-footer">
              <div className="fad-item-status">
                {getStatusIcon(item.status)}
                <span className="status-label">{item.status.replace('_', ' ')}</span>
              </div>
              
              <div className="fad-item-actions">
                {item.status === 'pending' && (
                  <>
                    <button 
                      className="fad-action-btn review"
                      onClick={() => updateStatus(item._id, 'reviewed')}
                    >
                      Review
                    </button>
                    <button 
                      className="fad-action-btn resolve"
                      onClick={() => updateStatus(item._id, 'resolved')}
                    >
                      Resolve
                    </button>
                  </>
                )}
                {item.status === 'reviewed' && (
                  <button 
                    className="fad-action-btn resolve"
                    onClick={() => updateStatus(item._id, 'resolved')}
                  >
                    Resolve
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {feedback.length === 0 && (
        <div className="fad-empty">
          <p>No feedback found.</p>
        </div>
      )}
    </div>
  );
};

export default FeedbackAdminDashboard;
