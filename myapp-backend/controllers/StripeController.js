// controllers/StripeController.js

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/User');

// Create or retrieve Stripe customer
exports.createOrGetCustomer = async (req, res) => {
  try {
    const { id } = req.user;
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let stripeCustomer;
    
    // Check if user already has a Stripe customer
    if (user.stripeCustomerId) {
      try {
        stripeCustomer = await stripe.customers.retrieve(user.stripeCustomerId);
        if (stripeCustomer.deleted) {
          throw new Error('Customer was deleted');
        }
      } catch (error) {
        console.log('Error retrieving customer, creating new one:', error.message);
        stripeCustomer = null;
      }
    }
    
    // Create new customer if needed
    if (!stripeCustomer) {
      stripeCustomer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        metadata: {
          userId: user._id.toString(),
          userRole: user.role
        }
      });
      
      // Update user with new customer ID
      await User.findByIdAndUpdate(id, { stripeCustomerId: stripeCustomer.id });
    }
    
    res.json({ customer: stripeCustomer });
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ message: 'Error creating customer', error: error.message });
  }
};

// Create subscription
exports.createSubscription = async (req, res) => {
  try {
    const { priceId, paymentMethodId, couponCode } = req.body;
    const { id } = req.user;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Ensure customer exists
    let stripeCustomer;
    if (user.stripeCustomerId) {
      stripeCustomer = await stripe.customers.retrieve(user.stripeCustomerId);
    } else {
      stripeCustomer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        metadata: {
          userId: user._id.toString(),
          userRole: user.role
        }
      });
      await User.findByIdAndUpdate(id, { stripeCustomerId: stripeCustomer.id });
    }

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: stripeCustomer.id,
    });

    // Set as default payment method
    await stripe.customers.update(stripeCustomer.id, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Create subscription parameters
    const subscriptionParams = {
      customer: stripeCustomer.id,
      items: [{ price: priceId }],
      payment_settings: {
        payment_method_types: ['card'],
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
    };

    // Apply coupon if provided
    if (couponCode) {
      try {
        const coupon = await stripe.coupons.retrieve(couponCode);
        subscriptionParams.coupon = couponCode;
      } catch (couponError) {
        console.log('Coupon error:', couponError.message);
        // Continue without coupon if invalid
      }
    }

    // Create subscription
    const subscription = await stripe.subscriptions.create(subscriptionParams);

    // Update user in database
    await User.findByIdAndUpdate(id, {
      stripeSubscriptionId: subscription.id,
      stripeSubscriptionStatus: subscription.status,
      subscriptionCurrentPeriodStart: new Date(subscription.current_period_start * 1000),
      subscriptionCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
      paymentMethodId: paymentMethodId,
      isPremium: subscription.status === 'active' || subscription.status === 'trialing',
      premiumPlan: priceId.includes('annual') ? 'annual' : 'monthly',
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      // End trial when user upgrades to paid subscription
      isOnTrial: false
    });

    res.json({
      subscription,
      clientSecret: subscription.latest_invoice.payment_intent?.client_secret,
    });
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({ message: 'Error creating subscription', error: error.message });
  }
};

// Create payment intent for one-time payments
exports.createPaymentIntent = async (req, res) => {
  try {
    const { amount, currency = 'usd' } = req.body;
    const { id } = req.user;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: currency,
      customer: user.stripeCustomerId,
      metadata: {
        userId: user._id.toString(),
        userEmail: user.email
      }
    });

    res.json({
      clientSecret: paymentIntent.client_secret
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({ message: 'Error creating payment intent', error: error.message });
  }
};

// Get subscription details
exports.getSubscription = async (req, res) => {
  try {
    const { id } = req.user;
    const user = await User.findById(id);
    
    if (!user || !user.stripeSubscriptionId) {
      return res.json({ subscription: null, hasSubscription: false });
    }

    const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
    
    res.json({
      subscription: subscription,
      hasSubscription: true,
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ message: 'Error retrieving subscription', error: error.message });
  }
};

// Cancel subscription
exports.cancelSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.body;
    const { id } = req.user;
    
    const user = await User.findById(id);
    if (!user || !user.stripeSubscriptionId) {
      return res.status(404).json({ message: 'No subscription found' });
    }

    // Verify the subscription belongs to this user
    if (user.stripeSubscriptionId !== subscriptionId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    // Update user in database
    await User.findByIdAndUpdate(id, {
      stripeSubscriptionStatus: subscription.status,
      subscriptionCancelAtPeriodEnd: subscription.cancel_at_period_end,
      isPremium: true // Keep premium until period end
    });

    res.json({ subscription });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ message: 'Error canceling subscription', error: error.message });
  }
};

// Create Stripe Customer Portal session
exports.createPortalSession = async (req, res) => {
  try {
    const { customerId, returnUrl } = req.body;
    const { id } = req.user;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify the customer belongs to this user
    if (user.stripeCustomerId !== customerId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Create portal session error:', error);
    res.status(500).json({ message: 'Error creating portal session', error: error.message });
  }
};

// Update subscription (change plan)
exports.updateSubscription = async (req, res) => {
  try {
    const { newPriceId } = req.body;
    const { id } = req.user;
    
    const user = await User.findById(id);
    if (!user || !user.stripeSubscriptionId) {
      return res.status(404).json({ message: 'No subscription found' });
    }

    const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
    
    const updatedSubscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
      items: [{
        id: subscription.items.data[0].id,
        price: newPriceId,
      }],
    });

    // Update user in database
    await User.findByIdAndUpdate(id, {
      premiumPlan: newPriceId.includes('annual') ? 'annual' : 'monthly'
    });

    res.json({ subscription: updatedSubscription });
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({ message: 'Error updating subscription', error: error.message });
  }
};

// Validate coupon
exports.validateCoupon = async (req, res) => {
  try {
    const { couponCode } = req.body;
    
    const coupon = await stripe.coupons.retrieve(couponCode);
    
    if (!coupon.valid) {
      return res.status(400).json({ message: 'Coupon is not valid' });
    }
    
    res.json({
      valid: true,
      coupon: {
        id: coupon.id,
        percentOff: coupon.percent_off,
        amountOff: coupon.amount_off,
        duration: coupon.duration,
        durationInMonths: coupon.duration_in_months
      }
    });
  } catch (error) {
    console.error('Validate coupon error:', error);
    res.status(400).json({ message: 'Invalid coupon code', error: error.message });
  }
};

// Webhook handler
exports.handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.log(`Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  } catch (error) {
    console.error('Webhook handling error:', error);
    return res.status(500).json({ message: 'Webhook processing failed' });
  }

  res.json({ received: true });
};

// Helper function to handle subscription updates
async function handleSubscriptionUpdate(subscription) {
  try {
    const customer = await stripe.customers.retrieve(subscription.customer);
    const userId = customer.metadata.userId;
    
    if (!userId) {
      console.error('No userId found in customer metadata');
      return;
    }

    const updateData = {
      stripeSubscriptionId: subscription.id,
      stripeSubscriptionStatus: subscription.status,
      subscriptionCurrentPeriodStart: new Date(subscription.current_period_start * 1000),
      subscriptionCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
      subscriptionCancelAtPeriodEnd: subscription.cancel_at_period_end,
      isPremium: subscription.status === 'active' || subscription.status === 'trialing',
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      // End trial when subscription becomes active
      isOnTrial: subscription.status === 'active' ? false : undefined
    };

    await User.findByIdAndUpdate(userId, updateData);
    console.log(`Updated user ${userId} subscription status to ${subscription.status}`);
  } catch (error) {
    console.error('Error handling subscription update:', error);
  }
}

// Helper function to handle subscription deletion
async function handleSubscriptionDeleted(subscription) {
  try {
    const customer = await stripe.customers.retrieve(subscription.customer);
    const userId = customer.metadata.userId;
    
    if (!userId) {
      console.error('No userId found in customer metadata');
      return;
    }

    await User.findByIdAndUpdate(userId, {
      stripeSubscriptionStatus: 'canceled',
      isPremium: false,
      subscriptionCancelAtPeriodEnd: false
    });
    
    console.log(`Canceled subscription for user ${userId}`);
  } catch (error) {
    console.error('Error handling subscription deletion:', error);
  }
}

// Helper function to handle successful payments
async function handlePaymentSucceeded(invoice) {
  try {
    const customer = await stripe.customers.retrieve(invoice.customer);
    const userId = customer.metadata.userId;
    
    if (!userId) {
      console.error('No userId found in customer metadata');
      return;
    }

    // Update user's premium status if not already set
    const user = await User.findById(userId);
    if (!user.isPremium && invoice.subscription) {
      await User.findByIdAndUpdate(userId, { 
        isPremium: true,
        // End trial when payment succeeds
        isOnTrial: false
      });
      console.log(`Activated premium for user ${userId}`);
    }
  } catch (error) {
    console.error('Error handling payment success:', error);
  }
}

// Helper function to handle failed payments
async function handlePaymentFailed(invoice) {
  try {
    const customer = await stripe.customers.retrieve(invoice.customer);
    const userId = customer.metadata.userId;
    
    if (!userId) {
      console.error('No userId found in customer metadata');
      return;
    }

    // You might want to send an email notification here
    console.log(`Payment failed for user ${userId}`);
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

// Get pricing information
exports.getPricing = async (req, res) => {
  try {
    const prices = await stripe.prices.list({
      active: true,
      expand: ['data.product']
    });
    
    res.json({ prices: prices.data });
  } catch (error) {
    console.error('Get pricing error:', error);
    res.status(500).json({ message: 'Error retrieving pricing', error: error.message });
  }
}; 