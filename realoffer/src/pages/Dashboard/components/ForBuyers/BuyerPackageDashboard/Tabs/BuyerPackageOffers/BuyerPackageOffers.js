// BuyerPackageOffers.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../../../../../context/AuthContext';
import './BuyerPackageOffers.css';

const BuyerPackageOffers = ({ buyerPackageId }) => {
  const { token } = useAuth();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOffers();
  }, [buyerPackageId]);

  const fetchOffers = async () => {
    if (!buyerPackageId) return;

    try {
      setLoading(true);
      // First get the buyer package to find the property listing
      const buyerPackageResponse = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/buyerPackages/${buyerPackageId}?trackView=false`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      // Get the property listing offers
      const propertyListing = buyerPackageResponse.data.propertyListing;
      if (propertyListing && propertyListing._id) {
        const offersResponse = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/offers?listingId=${propertyListing._id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        setOffers(offersResponse.data);
      }
    } catch (error) {
      console.error('Error fetching offers:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#f59e0b';
      case 'accepted':
        return '#10b981';
      case 'rejected':
        return '#ef4444';
      case 'counter':
        return '#8b5cf6';
      default:
        return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div className="buyer-package-offers-loading">
        <div className="buyer-package-offers-spinner"></div>
        <p>Loading offers...</p>
      </div>
    );
  }

  return (
    <div className="buyer-package-offers">
      <div className="buyer-package-offers-header">
        <h2>Offers</h2>
        <p>View all offers made on this property</p>
      </div>

      <div className="buyer-package-offers-list">
        {offers.length === 0 ? (
          <div className="buyer-package-offers-empty">
            <p>No offers have been made on this property yet.</p>
          </div>
        ) : (
          offers.map((offer) => (
            <div key={offer._id} className="buyer-package-offer-item">
              <div className="buyer-package-offer-header">
                <div className="buyer-package-offer-info">
                  <h4 className="buyer-package-offer-price">
                    {formatPrice(offer.offerAmount)}
                  </h4>
                  <span 
                    className="buyer-package-offer-status"
                    style={{ color: getStatusColor(offer.status) }}
                  >
                    {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
                  </span>
                </div>
                <span className="buyer-package-offer-date">
                  {formatDate(offer.createdAt)}
                </span>
              </div>
              
              {offer.buyerAgent && (
                <div className="buyer-package-offer-agent">
                  <p><strong>Buyer Agent:</strong> {offer.buyerAgent.firstName} {offer.buyerAgent.lastName}</p>
                  {offer.buyerAgent.agencyName && (
                    <p><strong>Agency:</strong> {offer.buyerAgent.agencyName}</p>
                  )}
                </div>
              )}

              {offer.notes && (
                <div className="buyer-package-offer-notes">
                  <p><strong>Notes:</strong></p>
                  <p>{offer.notes}</p>
                </div>
              )}

              {offer.status === 'counter' && offer.counterOffer && (
                <div className="buyer-package-counter-offer">
                  <p><strong>Counter Offer:</strong> {formatPrice(offer.counterOffer.amount)}</p>
                  {offer.counterOffer.notes && (
                    <p><strong>Counter Notes:</strong> {offer.counterOffer.notes}</p>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default BuyerPackageOffers; 