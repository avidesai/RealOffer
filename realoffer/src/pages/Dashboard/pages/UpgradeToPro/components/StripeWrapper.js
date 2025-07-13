import React from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

// Load Stripe with your publishable key
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

const StripeWrapper = ({ children }) => {
  const options = {
    // You can add global options here if needed
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#4078fb',
        colorBackground: '#ffffff',
        colorText: '#23272f',
        colorDanger: '#e53e3e',
        fontFamily: 'Inter, sans-serif',
        spacingUnit: '4px',
        borderRadius: '7px',
      },
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      {children}
    </Elements>
  );
};

export default StripeWrapper; 