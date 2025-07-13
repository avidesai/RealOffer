# Stripe Integration Setup Guide

This guide will help you set up the complete Stripe integration for your RealOffer application.

## 1. Stripe Dashboard Setup

### Step 1: Create Stripe Account
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Create an account or log in
3. Switch to Test mode for development

### Step 2: Create Products and Prices
1. Navigate to **Products** in the Stripe Dashboard
2. Click **+ Add Product**
3. Create a product:
   - **Name**: RealOffer Pro
   - **Description**: Professional real estate tools and analytics
   - **Upload a product image** (optional)

4. Add pricing:
   - **Monthly Price**: $34.00 USD, recurring monthly
   - **Annual Price**: $29.00 USD, recurring monthly (billed annually)

5. Note down the Price IDs (they start with `price_`)

### Step 3: Create Promo Codes
1. Navigate to **Coupons** in the Stripe Dashboard
2. Click **+ Create Coupon**
3. Create a "2 months free" coupon:
   - **ID**: `FREE2MONTHS`
   - **Type**: Duration
   - **Duration**: Once
   - **Duration in months**: 2
   - **Percent off**: 100%
   - **Applies to**: Recurring payments

4. Create additional coupons as needed

### Step 4: Set Up Webhook Endpoints
1. Navigate to **Webhooks** in the Stripe Dashboard
2. Click **+ Add endpoint**
3. Configure the webhook:
   - **Endpoint URL**: `https://your-domain.com/api/stripe/webhook`
   - **Events to send**:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`

4. Save the webhook and note the **Signing secret**

## 2. Environment Variables Setup

### Backend (.env file in myapp-backend/)
```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Add these to your existing .env file
```

### Frontend (.env file in realoffer/)
```env
# Stripe Configuration
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_...
REACT_APP_STRIPE_MONTHLY_PRICE_ID=price_...
REACT_APP_STRIPE_ANNUAL_PRICE_ID=price_...

# Add these to your existing .env file
```

## 3. Testing the Integration

### Test Cards
Use these test card numbers in development:
- **Success**: 4242 4242 4242 4242
- **Declined**: 4000 0000 0000 0002
- **Requires 3D Secure**: 4000 0000 0000 3220

### Test Coupons
- Use `FREE2MONTHS` for testing the 2-month free promo

### Test Webhook
1. Use Stripe CLI to test webhooks locally:
   ```bash
   stripe listen --forward-to localhost:8000/api/stripe/webhook
   ```

## 4. Going Live

### Production Setup
1. Switch to Live mode in Stripe Dashboard
2. Repeat product and webhook setup for live environment
3. Update environment variables with live keys:
   - `STRIPE_SECRET_KEY` → `sk_live_...`
   - `REACT_APP_STRIPE_PUBLISHABLE_KEY` → `pk_live_...`
   - `STRIPE_WEBHOOK_SECRET` → `whsec_...` (live webhook secret)

### Production Webhook
Update webhook endpoint to production URL:
- `https://your-production-domain.com/api/stripe/webhook`

## 5. Features Implemented

### Backend Features
- ✅ Customer creation and management
- ✅ Subscription creation and management
- ✅ Payment processing with Stripe Elements
- ✅ Coupon validation and application
- ✅ Webhook handling for subscription events
- ✅ User premium status updates
- ✅ Subscription cancellation and management

### Frontend Features
- ✅ Stripe Elements integration
- ✅ Real-time coupon validation
- ✅ Payment success/error handling
- ✅ Plan selection (monthly/annual)
- ✅ Billing address collection
- ✅ Terms and conditions acceptance
- ✅ Responsive design

### Premium Features Gated
- ✅ Advanced buyer analytics
- ✅ AI-powered document analysis
- ✅ Premium communication hub
- ✅ Automated offer generation
- ✅ Market intelligence & comps
- ✅ Unlimited active listings
- ✅ Priority customer support

## 6. API Endpoints

### Stripe API Routes
- `POST /api/stripe/customer` - Create/get customer
- `POST /api/stripe/subscription` - Create subscription
- `GET /api/stripe/subscription` - Get subscription details
- `PUT /api/stripe/subscription` - Update subscription
- `DELETE /api/stripe/subscription` - Cancel subscription
- `POST /api/stripe/validate-coupon` - Validate coupon code
- `POST /api/stripe/webhook` - Stripe webhook handler
- `GET /api/stripe/pricing` - Get pricing information

## 7. Database Schema Updates

The User model has been updated with these new fields:
- `stripeCustomerId` - Stripe customer ID
- `stripeSubscriptionId` - Stripe subscription ID
- `stripeSubscriptionStatus` - Subscription status
- `subscriptionCurrentPeriodStart` - Period start date
- `subscriptionCurrentPeriodEnd` - Period end date
- `subscriptionCancelAtPeriodEnd` - Cancel at period end flag
- `paymentMethodId` - Payment method ID
- `trialEnd` - Trial end date

## 8. Error Handling

The integration includes comprehensive error handling for:
- Payment failures
- Invalid coupon codes
- Subscription creation errors
- Webhook processing errors
- Network connectivity issues

## 9. Security Considerations

- ✅ Webhook signature verification
- ✅ Secure API key management
- ✅ User authentication for all endpoints
- ✅ Input validation and sanitization
- ✅ HTTPS enforcement for webhooks

## 10. Next Steps

1. Set up your Stripe dashboard following steps 1-4
2. Configure environment variables
3. Test the integration in development
4. Deploy to production and update to live keys
5. Monitor subscription events and user upgrades

## Support

For any issues with the Stripe integration, check:
1. Stripe Dashboard logs
2. Application server logs
3. Webhook delivery logs
4. Browser console for frontend errors

The integration is now complete and ready for production use! 