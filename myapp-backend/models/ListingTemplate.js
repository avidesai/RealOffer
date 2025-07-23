const mongoose = require('mongoose');

const listingTemplateSchema = new mongoose.Schema({
    templateOwnerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: String,
    description: String,
    newListing: Boolean,
    homeCharacteristics: {
        price: Number,
        address: String,
        city: String,
        state: String,
        zip: String,
        beds: Number,
        baths: Number,
        squareFootage: Number,
        lotSize: Number,
        propertyType: String,
        yearBuilt: Number
    },
    imagesUrls: [String],
    status: String,
    escrowInfo: {
        escrowNumber: String,
        company: {
            name: String,
            phone: String,
            email: String
        }
    },
    scheduleShowingUrl: String, // URL for scheduling showings
    agentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

module.exports = mongoose.model('ListingTemplate', listingTemplateSchema);