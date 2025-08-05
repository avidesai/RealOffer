// /controllers/offerController.js

const mongoose = require('mongoose');
const Offer = require('../models/Offer');
const PropertyListing = require('../models/PropertyListing');
const Document = require('../models/Document');
const Activity = require('../models/Activity');
const Message = require('../models/Message');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { offerDocumentsContainerClient } = require('../config/azureStorage');
const { getPdfPageCount } = require('./DocumentController');
const notificationService = require('../utils/notificationService');
const User = require('../models/User');
const emailService = require('../utils/emailService');

// Configure multer for in-memory storage before uploading to Azure
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB file size limit
    files: 10 // Maximum number of files
  }
});

exports.uploadOfferDocuments = upload.array('documents', 10);

// Create a new offer
exports.createOffer = async (req, res) => {
  try {
    console.log('Request Body:', req.body); // Debugging
    console.log('percentDown from request:', req.body.percentDown);
    console.log('balanceOfDownPayment from request:', req.body.balanceOfDownPayment);

    const propertyListingId = req.body.propertyListing;
    if (!mongoose.Types.ObjectId.isValid(propertyListingId)) {
      return res.status(400).json({ message: 'Invalid propertyListing ID' });
    }

    const propertyListing = await PropertyListing.findById(propertyListingId);
    if (!propertyListing) {
      return res.status(404).json({ message: 'Property listing not found' });
    }

    // Parse documentWorkflow if it exists
    let documentWorkflow = {};
    if (req.body.documentWorkflow) {
      try {
        documentWorkflow = JSON.parse(req.body.documentWorkflow);
      } catch (error) {
        console.error('Error parsing documentWorkflow:', error);
        // Continue without document workflow if parsing fails
      }
    }

    const offerData = {
      ...req.body,
      offerExpiryDate: req.body.offerExpiryDate,
      sellerRentBack: req.body.sellerRentBack,
      sellerRentBackDays: req.body.sellerRentBackDays,
      'buyerDetails.buyerName': req.body.buyerName,
      documentWorkflow: documentWorkflow,
      buyerPackage: req.body.buyerPackage, // Add buyer package ID
      // Handle percentage fields - convert to numbers if they exist
      initialDepositPercent: req.body.initialDepositPercent ? parseFloat(req.body.initialDepositPercent) : undefined,
      downPaymentPercent: req.body.downPaymentPercent ? parseFloat(req.body.downPaymentPercent) : undefined,
      // Ensure calculated fields are properly converted to numbers
      percentDown: req.body.percentDown ? parseFloat(req.body.percentDown) : undefined,
      balanceOfDownPayment: req.body.balanceOfDownPayment ? parseFloat(req.body.balanceOfDownPayment) : undefined
    };

    // Set the buyersAgent (creator of the offer) to the currently authenticated user
    offerData.buyersAgent = req.user.id;

    // Robust document ID extraction (support both 'documents' and 'documents[]' field names)
    let documentIds = [];
    if (req.body.documents) {
      documentIds = Array.isArray(req.body.documents) ? req.body.documents : [req.body.documents];
    }
    if (req.body['documents[]']) {
      const extraDocs = Array.isArray(req.body['documents[]']) ? req.body['documents[]'] : [req.body['documents[]']];
      documentIds = [...documentIds, ...extraDocs];
    }

    // Remove potential duplicates
    documentIds = [...new Set(documentIds)];

    offerData.documents = documentIds;  // store on offer itself

    const offer = new Offer(offerData);
    await offer.save();
    console.log('Saved offer percentDown:', offer.percentDown);
    console.log('Saved offer balanceOfDownPayment:', offer.balanceOfDownPayment);

    // Attach offer ID to each referenced document
    if (documentIds.length > 0) {
      await Document.updateMany(
        { _id: { $in: documentIds } },
        { $set: { offer: offer._id } }
      );
    }

    // Also push the offer reference into the property listing for quick lookup
    await PropertyListing.findByIdAndUpdate(
      propertyListingId,
      { $push: { offers: offer._id } }
    );

    // Create activity record for the offer - link to both property listing and buyer package
    const activity = new Activity({
      user: req.user.id,
      action: `made an offer of $${req.body.purchasePrice?.toLocaleString() || 'N/A'} for ${propertyListing.homeCharacteristics.address}`,
      type: 'offer',
      propertyListing: propertyListingId,
      buyerPackage: req.body.buyerPackage, // Link to buyer package
      metadata: {
        offerAmount: req.body.purchasePrice,
        offerStatus: 'submitted',
        userRole: req.user.role || 'buyer',
        documentTitle: propertyListing.homeCharacteristics.address
      }
    });

    await activity.save();

    // Create initial message if buyer included a message
    if (req.body.buyersAgentMessage && req.body.buyersAgentMessage.trim()) {
      const initialMessage = new Message({
        offer: offer._id,
        sender: req.user.id,
        content: req.body.buyersAgentMessage,
        messageType: 'offer_message',
        subject: 'Initial Offer Message'
      });
      await initialMessage.save();
    }

    // Send notification to listing agent (non-blocking)
    const buyerName = `${req.user.firstName || 'Unknown'} ${req.user.lastName || 'User'}`;
    notificationService.sendOfferNotification(
      propertyListingId,
      req.body.purchasePrice,
      buyerName,
      req.user.role || 'buyer'
    ).catch(error => {
      console.error('Failed to send offer notification:', error);
    });

    // Fetch the complete offer with populated documents
    const populatedOffer = await Offer.findById(offer._id).populate('documents');
    res.status(201).json(populatedOffer);
  } catch (error) {
    console.error('Error creating offer:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get all offers for a specific listing
exports.getOffersByListing = async (req, res) => {
  try {
    const offers = await Offer.find({ propertyListing: req.params.listingId }).populate('buyersAgent').populate('propertyListing');
    res.status(200).json(offers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a specific offer
exports.getOfferById = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id).populate('buyersAgent').populate('propertyListing');
    if (!offer) return res.status(404).json({ message: 'Offer not found' });
    
    // Check authorization - user must be listing creator, listing agent, team member, or buyer's agent
    const isListingCreator = offer.propertyListing.createdBy.toString() === req.user.id;
    const isListingAgent = offer.propertyListing.agentIds.some(agentId => agentId.toString() === req.user.id);
    const isTeamMember = offer.propertyListing.teamMemberIds.some(teamMemberId => teamMemberId.toString() === req.user.id);
    const isBuyersAgent = offer.buyersAgent && offer.buyersAgent._id.toString() === req.user.id;
    
    if (!isListingCreator && !isListingAgent && !isTeamMember && !isBuyersAgent) {
      return res.status(403).json({ message: 'Not authorized to view this offer' });
    }
    
    res.status(200).json(offer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a specific offer
exports.updateOffer = async (req, res) => {
  try {
    const offer = await Offer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!offer) return res.status(404).json({ message: 'Offer not found' });
    res.status(200).json(offer);
  } catch (error) {
    res.status500().json({ message: error.message });
  }
};

// Delete a specific offer
exports.deleteOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id).populate('propertyListing');
    if (!offer) return res.status(404).json({ message: 'Offer not found' });
    
    // Check authorization - only listing creator, agents, and team members can delete offers
    const isListingCreator = offer.propertyListing.createdBy.toString() === req.user.id;
    const isListingAgent = offer.propertyListing.agentIds.some(agentId => agentId.toString() === req.user.id);
    const isTeamMember = offer.propertyListing.teamMemberIds.some(teamMemberId => teamMemberId.toString() === req.user.id);
    
    if (!isListingCreator && !isListingAgent && !isTeamMember) {
      return res.status(403).json({ message: 'Not authorized to delete this offer' });
    }
    
    await Offer.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Offer deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update the private listing team notes
exports.updatePrivateNotes = async (req, res) => {
  try {
    const { id } = req.params;
    const { privateListingTeamNotes } = req.body;

    const offer = await Offer.findById(id).populate('propertyListing');
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    // Check authorization - only listing creator, agents, and team members can update private notes
    const isListingCreator = offer.propertyListing.createdBy.toString() === req.user.id;
    const isListingAgent = offer.propertyListing.agentIds.some(agentId => agentId.toString() === req.user.id);
    const isTeamMember = offer.propertyListing.teamMemberIds.some(teamMemberId => teamMemberId.toString() === req.user.id);
    
    if (!isListingCreator && !isListingAgent && !isTeamMember) {
      return res.status(403).json({ message: 'Not authorized to update private notes' });
    }

    const updatedOffer = await Offer.findByIdAndUpdate(
      id,
      { privateListingTeamNotes },
      { new: true, runValidators: true }
    );

    res.status(200).json(updatedOffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update the status of a specific offer
exports.updateOfferStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { offerStatus } = req.body;

    const offer = await Offer.findById(id).populate('propertyListing');
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    // Check authorization - only listing creator, agents, and team members can update offer status
    const isListingCreator = offer.propertyListing.createdBy.toString() === req.user.id;
    const isListingAgent = offer.propertyListing.agentIds.some(agentId => agentId.toString() === req.user.id);
    const isTeamMember = offer.propertyListing.teamMemberIds.some(teamMemberId => teamMemberId.toString() === req.user.id);
    
    if (!isListingCreator && !isListingAgent && !isTeamMember) {
      return res.status(403).json({ message: 'Not authorized to update offer status' });
    }

    const updatedOffer = await Offer.findByIdAndUpdate(
      id,
      { offerStatus },
      { new: true, runValidators: true }
    );

    res.status(200).json(updatedOffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.respondToOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const { responseType, subject, message } = req.body;

    const offer = await Offer.findById(id)
      .populate('propertyListing')
      .populate('presentedBy', 'firstName lastName email');
    
    if (!offer) return res.status(404).json({ message: 'Offer not found' });

    // Check authorization - only listing creator and agents can respond to offers
    const isListingCreator = offer.propertyListing.createdBy.toString() === req.user.id;
    const isListingAgent = offer.propertyListing.agentIds.some(agentId => agentId.toString() === req.user.id);
    
    if (!isListingCreator && !isListingAgent) {
      return res.status(403).json({ message: 'Not authorized to respond to this offer' });
    }

    // Get responder info
    const responder = await User.findById(req.user.id);
    const responderName = `${responder.firstName} ${responder.lastName}`.trim();

    // Create a new message in the conversation
    const newMessage = new Message({
      offer: id,
      sender: req.user.id,
      content: message,
      subject: subject,
      messageType: 'response',
      responseType: responseType
    });

    await newMessage.save();

    // Maintain backward compatibility by also adding to responses array
    const response = {
      responseType,
      subject,
      message
    };

    offer.responses.push(response);

    if (responseType === 'acceptOffer') {
      offer.offerStatus = 'accepted';
    } else if (responseType === 'rejectOffer') {
      offer.offerStatus = 'rejected';
    } else if (responseType === 'counterOffer') {
      offer.offerStatus = 'countered';
    }

    await offer.save();

    // Send email notification to the agent who created the offer
    if (offer.presentedBy && offer.presentedBy.email) {
      try {
        const propertyAddress = offer.propertyListing.homeCharacteristics?.address || 'Property Address';
        const agentName = `${offer.presentedBy.firstName} ${offer.presentedBy.lastName}`.trim();
        
        await emailService.sendOfferResponseNotification(
          offer.presentedBy.email,
          agentName,
          propertyAddress,
          responseType,
          subject,
          message,
          responderName,
          offer.purchasePrice
        );
      } catch (emailError) {
        console.error('Error sending offer response email:', emailError);
        // Don't fail the request if email fails
      }
    }

    // Populate sender info for response
    await newMessage.populate('sender', 'firstName lastName email profilePhotoUrl');

    res.status(200).json({
      offer,
      message: newMessage
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
