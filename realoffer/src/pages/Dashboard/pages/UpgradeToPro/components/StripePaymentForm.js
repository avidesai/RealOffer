import React, { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useAuth } from '../../../../../context/AuthContext';
import api from '../../../../../context/api';

const StripePaymentForm = ({ 
  plan, 
  onSuccess, 
  onError, 
  couponCode, 
  termsAccepted,
  onTermsChange
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [billingDetails, setBillingDetails] = useState({
    name: '',
    address: {
      line1: '',
      city: '',
      state: '',
      postal_code: ''
    }
  });

  const handleBillingChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setBillingDetails(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setBillingDetails(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements || !termsAccepted) {
      return;
    }

    setProcessing(true);

    try {
      const cardElement = elements.getElement(CardElement);

      // Create payment method
      const { error: paymentMethodError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          name: billingDetails.name,
          email: user.email,
          address: billingDetails.address
        }
      });

      if (paymentMethodError) {
        throw new Error(paymentMethodError.message);
      }

      // Get the appropriate price ID based on plan
      const priceId = plan === 'annual' 
        ? process.env.REACT_APP_STRIPE_ANNUAL_PRICE_ID 
        : process.env.REACT_APP_STRIPE_MONTHLY_PRICE_ID;

      // Create subscription
      const response = await api.post('/api/stripe/subscription', {
        priceId: priceId,
        paymentMethodId: paymentMethod.id,
        couponCode: couponCode || undefined
      });

      const { subscription, clientSecret } = response.data;

      // Handle subscription payment if needed
      if (subscription.status === 'incomplete') {
        const { error: confirmError } = await stripe.confirmCardPayment(clientSecret);
        if (confirmError) {
          throw new Error(confirmError.message);
        }
      }

      onSuccess(subscription);
    } catch (error) {
      console.error('Payment error:', error);
      onError(error.message || 'An error occurred while processing your payment');
    } finally {
      setProcessing(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#23272f',
        '::placeholder': {
          color: '#a0aec0',
        },
        fontFamily: 'Inter, sans-serif',
        lineHeight: '1.4',
      },
      invalid: {
        color: '#e53e3e',
      },
    },
    hidePostalCode: true, // We'll collect this separately
  };

  return (
    <form onSubmit={handleSubmit} className="stripe-payment-form">
      <div className="upgrade-payment-fields">
        <div className="stripe-card-element-container">
          <CardElement 
            options={cardElementOptions}
            className="stripe-card-element"
          />
        </div>
        
        <input
          type="text"
          placeholder="Name on Card"
          value={billingDetails.name}
          onChange={(e) => handleBillingChange('name', e.target.value)}
          className="upgrade-input"
          required
        />
        
        <input
          type="text"
          placeholder="Billing Address"
          value={billingDetails.address.line1}
          onChange={(e) => handleBillingChange('address.line1', e.target.value)}
          className="upgrade-input"
          required
        />
        
        <div className="upgrade-payment-row">
          <input
            type="text"
            placeholder="City"
            value={billingDetails.address.city}
            onChange={(e) => handleBillingChange('address.city', e.target.value)}
            className="upgrade-input"
            required
          />
          <input
            type="text"
            placeholder="State"
            value={billingDetails.address.state}
            onChange={(e) => handleBillingChange('address.state', e.target.value)}
            className="upgrade-input"
            required
          />
          <input
            type="text"
            placeholder="ZIP"
            value={billingDetails.address.postal_code}
            onChange={(e) => handleBillingChange('address.postal_code', e.target.value)}
            className="upgrade-input"
            required
          />
        </div>
      </div>

      <div className="upgrade-terms-row">
        <div className="upgrade-terms-label">
          <input 
            type="checkbox" 
            checked={termsAccepted} 
            onChange={onTermsChange} 
          />
          <span>I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a></span>
        </div>
      </div>

      <button 
        type="submit" 
        className="upgrade-enroll-btn"
        disabled={!stripe || processing || !termsAccepted}
      >
        {processing ? 'Processing...' : 'Start Pro Subscription'}
      </button>
    </form>
  );
};

export default StripePaymentForm; 