// routes/stripe.js

const express = require('express');
const router = express.Router();
const StripeController = require('../controllers/StripeController');
const authMiddleware = require('../middleware/auth');

// Customer routes
router.post('/customer', authMiddleware, StripeController.createOrGetCustomer);

// Subscription routes
router.post('/subscription', authMiddleware, StripeController.createSubscription);
router.get('/subscription', authMiddleware, StripeController.getSubscription);
router.put('/subscription', authMiddleware, StripeController.updateSubscription);
router.delete('/subscription', authMiddleware, StripeController.cancelSubscription);

// Customer Portal routes
router.post('/create-portal-session', authMiddleware, StripeController.createPortalSession);

// Payment intent routes
router.post('/payment-intent', authMiddleware, StripeController.createPaymentIntent);

// Coupon routes
router.post('/validate-coupon', authMiddleware, StripeController.validateCoupon);

// Pricing routes
router.get('/pricing', StripeController.getPricing);

// Webhook endpoint - no auth middleware needed as Stripe signs the requests
router.post('/webhook', StripeController.handleWebhook);

module.exports = router; 