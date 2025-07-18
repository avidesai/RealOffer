// models/User.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    profilePhotoUrl: { type: String, default: '' },
    role: { type: String, enum: ['agent', 'buyer', 'seller', 'admin'], default: '' },
    isActive: { type: Boolean, default: false },
    emailConfirmed: { type: Boolean, default: false },
    lastLogin: { type: Date, default: null },
    twoFactorAuthenticationEnabled: { type: Boolean, default: false },
    notificationSettings: { type: String, default: '' },
    phone: { type: String, default: '' },
    brokeragePhoneNumber: { type: String, default: '' }, // Added this line
    addressLine1: { type: String, default: '' },
    addressLine2: { type: String, default: '' },
    homepage: { type: String, default: '' },
    agentLicenseNumber: { type: String, default: '' },
    brokerageLicenseNumber: { type: String, default: '' },
    agencyName: { type: String, default: '' },
    agencyWebsite: { type: String, default: '' },
    agencyImage: { type: String, default: '' },
    agencyAddressLine1: { type: String, default: '' },
    agencyAddressLine2: { type: String, default: '' },
    linkedIn: { type: String, default: '' },
    twitter: { type: String, default: '' },
    facebook: { type: String, default: '' },
    bio: { type: String, default: '' },
    isVerifiedAgent: { type: Boolean, default: false },
    receiveMarketingMaterials: { type: Boolean, default: false },
    isPremium: { type: Boolean, default: false },
    premiumPlan: { type: String, default: '' },
    templates: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ListingTemplate', default: [] }],
    contacts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: [] }],
    listingPackages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'PropertyListing', default: [] }],
    
    // DocuSign integration fields
    docusignAccessToken: { type: String },
    docusignRefreshToken: { type: String },
    docusignTokenExpiry: { type: Date },
    docusignAccountId: { type: String },
    docusignUserId: { type: String },
    
    // Stripe integration fields
    stripeCustomerId: { type: String },
    stripeSubscriptionId: { type: String },
    stripeSubscriptionStatus: { type: String, enum: ['active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'trialing', 'unpaid'] },
    subscriptionCurrentPeriodStart: { type: Date },
    subscriptionCurrentPeriodEnd: { type: Date },
    subscriptionCancelAtPeriodEnd: { type: Boolean, default: false },
    paymentMethodId: { type: String },
    trialEnd: { type: Date },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

module.exports = mongoose.model('User', userSchema);
