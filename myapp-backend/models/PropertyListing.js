const mongoose = require('mongoose');

const propertyListingSchema = new mongoose.Schema({
    title: String,
    description: String,
    newListing: Boolean,
    homeCharacteristics: {
        price: {
            type: Number,
            required: true
        },
        address: String,
        city: String,
        state: String,
        zip: String,
        beds: {
            type: Number,
            required: true
        },
        baths: {
            type: Number,
            required: true
        },
        squareFootage: {
            type: Number,
            required: true
        },
        lotSize: {
            type: Number,
            required: true
        },
        propertyType: String,
        yearBuilt: {
            type: Number,
            required: true
        }
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
    agentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],  // Add this line
}, { timestamps: true });

module.exports = mongoose.model('PropertyListing', propertyListingSchema);
