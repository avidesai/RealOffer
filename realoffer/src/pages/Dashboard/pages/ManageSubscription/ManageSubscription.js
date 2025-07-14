// ManageSubscription.js

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import api from '../../../../context/api';
import ProfileHeader from '../Profile/components/ProfileHeader/ProfileHeader';
import Footer from '../../components/Footer/Footer';
import './ManageSubscription.css';

const ManageSubscription = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/users/${user._id}`);
      setSubscriptionData(response.data);
    } catch (error) {
      console.error('Error fetching subscription data:', error);
      setError('Failed to load subscription information');
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setLoading(true);
      const response = await api.post('/api/stripe/create-portal-session', {
        customerId: subscriptionData.stripeCustomerId,
        returnUrl: window.location.origin + '/profile'
      });
      
      // Redirect to Stripe Customer Portal
      window.location.href = response.data.url;
    } catch (error) {
      console.error('Error creating portal session:', error);
      setError('Failed to open subscription management. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm('Are you sure you want to cancel your subscription? You will lose access to Pro features at the end of your current billing period.')) {
      return;
    }

    try {
      setLoading(true);
      await api.post('/api/stripe/cancel-subscription', {
        subscriptionId: subscriptionData.stripeSubscriptionId
      });
      
      // Refresh subscription data
      await fetchSubscriptionData();
      setError(null);
    } catch (error) {
      console.error('Error canceling subscription:', error);
      setError('Failed to cancel subscription. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'status-active';
      case 'canceled':
        return 'status-canceled';
      case 'past_due':
        return 'status-past-due';
      case 'trialing':
        return 'status-trialing';
      default:
        return 'status-unknown';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'canceled':
        return 'Canceled';
      case 'past_due':
        return 'Past Due';
      case 'trialing':
        return 'Trial';
      default:
        return status;
    }
  };

  if (loading && !subscriptionData) {
    return (
      <div className="subscription-loading">
        <div className="loading-spinner"></div>
        <p>Loading subscription information...</p>
      </div>
    );
  }

  return (
    <>
      <ProfileHeader backDestination="/profile" />
      <div className="subscription-background">
        <div className="subscription-container">
          <h2 className="subscription-title">Subscription Management</h2>
          <div className="subscription-content">
            {error && (
              <div className="error-message">
                {error}
                <button onClick={() => setError(null)}>×</button>
              </div>
            )}

            <div className="subscription-section">
              <h3>Current Plan</h3>
              <div className="plan-card">
                <div className="plan-header">
                  <h4>Pro Plan</h4>
                  <span className={`status-badge ${getStatusColor(subscriptionData?.stripeSubscriptionStatus)}`}>
                    {getStatusText(subscriptionData?.stripeSubscriptionStatus)}
                  </span>
                </div>
                
                <div className="plan-details">
                  <div className="detail-row">
                    <span>Billing Period:</span>
                    <span>Monthly</span>
                  </div>
                  <div className="detail-row">
                    <span>Current Period Start:</span>
                    <span>{formatDate(subscriptionData?.subscriptionCurrentPeriodStart)}</span>
                  </div>
                  <div className="detail-row">
                    <span>Current Period End:</span>
                    <span>{formatDate(subscriptionData?.subscriptionCurrentPeriodEnd)}</span>
                  </div>
                  {subscriptionData?.subscriptionCancelAtPeriodEnd && (
                    <div className="detail-row warning">
                      <span>⚠️ Subscription will cancel at period end</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="subscription-section">
              <h3>Manage Subscription</h3>
              <div className="action-buttons">
                <button 
                  className="manage-button primary"
                  onClick={handleManageSubscription}
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Manage in Stripe Portal'}
                </button>
                
                {subscriptionData?.stripeSubscriptionStatus === 'active' && !subscriptionData?.subscriptionCancelAtPeriodEnd && (
                  <button 
                    className="manage-button danger"
                    onClick={handleCancelSubscription}
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : 'Cancel Subscription'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default ManageSubscription; 