const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    profilePhotoUrl: String,
    role: { type: String, enum: ['agent', 'buyer', 'seller', 'admin'] },
    isActive: Boolean,
    emailConfirmed: Boolean,
    lastLogin: Date,
    twoFactorAuthenticationEnabled: Boolean,
    notificationSettings: String,
    phone: String,
    addressLine1: String,
    addressLine2: String,
    homepage: String,
    agentLicenseNumber: String,
    brokerageLicenseNumber: String,
    agencyName: String,
    agencyWebsite: String,
    agencyImage: String,
    agencyAddressLine1: String,
    agencyAddressLine2: String,
    linkedIn: String,
    twitter: String,
    facebook: String,
    bio: String,
    isVerifiedAgent: Boolean,
    receiveMarketingMaterials: Boolean,
    isPremium: Boolean,
    premiumPlan: String,
    templates: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ListingTemplate' }],
    contacts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
