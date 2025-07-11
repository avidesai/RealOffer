const docusign = require('docusign-esign');
const { config, createApiClient, getAccessTokenFromCode, createEnvelope } = require('../config/docusign');
const User = require('../models/User');
const Document = require('../models/Document');
const Offer = require('../models/Offer');
const { containerClient } = require('../config/azureStorage');

// Get DocuSign connection status
exports.getConnectionStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isConnected = !!user.docusignAccessToken;
    res.json({ isConnected });
  } catch (error) {
    console.error('Error checking DocuSign connection:', error);
    res.status(500).json({ message: 'Error checking DocuSign connection' });
  }
};

// Get DocuSign authorization URL
exports.getAuthUrl = async (req, res) => {
  try {
    const apiClient = createApiClient();
    const scopes = ['signature', 'impersonation'];
    const state = req.user.id || req.user._id;
    
    const authUrl = await apiClient.getAuthorizationUri(
      config.integrationKey,
      scopes,
      config.redirectUri,
      'code',
      state
    );

    res.json({ authUrl });
  } catch (error) {
    console.error('Error getting DocuSign auth URL:', error);
    res.status(500).json({ message: 'Error getting DocuSign auth URL' });
  }
};

// Handle DocuSign OAuth callback
exports.handleCallback = async (req, res) => {
  try {
    const { code, state } = req.query;
    console.log('DocuSign callback received:', { code, state });

    if (!code || !state) {
      return res.status(400).json({ message: 'Authorization code and state are required' });
    }

    const user = await User.findById(state);
    console.log('User found for state:', user);

    if (!user) {
      return res.status(404).json({ message: 'User not found for DocuSign callback' });
    }

    try {
      // Get access token using the authorization code
      const tokenData = await getAccessTokenFromCode(code);
      console.log('Token response:', tokenData);

      if (!tokenData || !tokenData.access_token) {
        throw new Error('Invalid token response from DocuSign');
      }

      // Update user with DocuSign tokens
      user.docusignAccessToken = tokenData.access_token;
      user.docusignRefreshToken = tokenData.refresh_token;
      user.docusignTokenExpiry = new Date(Date.now() + (tokenData.expires_in * 1000));
      await user.save();

      // Send success message to frontend
      res.send(`
        <script>
          window.opener.postMessage({ type: 'DOCUSIGN_OAUTH_CALLBACK' }, '*');
          window.close();
        </script>
      `);
    } catch (tokenError) {
      console.error('DocuSign token exchange error:', tokenError);
      return res.status(500).json({ message: 'DocuSign token exchange error', error: tokenError.message });
    }
  } catch (error) {
    console.error('Error handling DocuSign callback:', error, req.query);
    res.status(500).json({ message: 'Error handling DocuSign callback', error: error.message });
  }
};

// Enhanced envelope creation with smart field placement
const createEnhancedEnvelope = async (accessToken, envelopeData) => {
  try {
    const apiClient = createApiClient();
    apiClient.addDefaultHeader('Authorization', `Bearer ${accessToken}`);
    
    const envelopeApi = new docusign.EnvelopesApi(apiClient);
    const envelope = new docusign.EnvelopeDefinition();
    
    envelope.emailSubject = envelopeData.emailSubject;
    envelope.emailBlurb = envelopeData.emailBlurb;
    envelope.status = 'sent';
    
    // Enhanced document preparation with field placement
    envelope.documents = await Promise.all(envelopeData.documents.map(async (doc, index) => {
      const document = new docusign.Document();
      document.documentBase64 = doc.content;
      document.name = doc.name;
      document.fileExtension = 'pdf';
      document.documentId = (index + 1).toString();
      
      return document;
    }));

    // Enhanced recipient configuration
    envelope.recipients = new docusign.Recipients();
    envelope.recipients.signers = envelopeData.recipients.map((recipient, index) => {
      const signer = new docusign.Signer();
      signer.email = recipient.email;
      signer.name = recipient.name;
      signer.recipientId = (index + 1).toString();
      signer.routingOrder = recipient.order || (index + 1).toString();
      
      // Add tabs based on document type and recipient role
      signer.tabs = generateSmartTabs(envelopeData.documents, recipient, index + 1);
      
      return signer;
    }));

    // Add custom fields for tracking
    envelope.customFields = new docusign.CustomFields();
    envelope.customFields.textCustomFields = [];
    
    if (envelopeData.metadata) {
      if (envelopeData.metadata.offerId) {
        envelope.customFields.textCustomFields.push({
          name: 'OfferID',
          value: envelopeData.metadata.offerId,
          show: 'false',
          required: 'false'
        });
      }
      
      if (envelopeData.metadata.listingId) {
        envelope.customFields.textCustomFields.push({
          name: 'PropertyListingID',
          value: envelopeData.metadata.listingId,
          show: 'false', 
          required: 'false'
        });
      }
    }

    const results = await envelopeApi.createEnvelope('me', { envelopeDefinition: envelope });
    return results;
  } catch (error) {
    console.error('Error creating enhanced DocuSign envelope:', error);
    throw error;
  }
};

// Smart tab generation based on document type and recipient role
const generateSmartTabs = (documents, recipient, documentId) => {
  const tabs = new docusign.Tabs();
  
  // Initialize tab arrays
  tabs.signHereTabs = [];
  tabs.dateSignedTabs = [];
  tabs.fullNameTabs = [];
  
  documents.forEach((doc, docIndex) => {
    const actualDocId = (docIndex + 1).toString();
    
    // Different placement strategies based on document type
    if (doc.name.toLowerCase().includes('purchase agreement')) {
      // Purchase Agreement - specific locations
      if (recipient.type === 'buyer-agent') {
        tabs.signHereTabs.push({
          anchorString: 'Buyer Agent Signature',
          anchorXOffset: '0',
          anchorYOffset: '0',
          documentId: actualDocId,
          pageNumber: '1',
          recipientId: (recipient.order || 1).toString()
        });
        
        tabs.dateSignedTabs.push({
          anchorString: 'Date',
          anchorXOffset: '100',
          anchorYOffset: '0',
          documentId: actualDocId,
          pageNumber: '1',
          recipientId: (recipient.order || 1).toString()
        });
      } else if (recipient.type === 'buyer') {
        tabs.signHereTabs.push({
          anchorString: 'Buyer Signature',
          anchorXOffset: '0',
          anchorYOffset: '0',
          documentId: actualDocId,
          pageNumber: '1',
          recipientId: (recipient.order || 1).toString()
        });
        
        tabs.fullNameTabs.push({
          anchorString: 'Buyer Name',
          anchorXOffset: '0',
          anchorYOffset: '0',
          documentId: actualDocId,
          pageNumber: '1',
          recipientId: (recipient.order || 1).toString(),
          value: recipient.name
        });
      }
    } else if (doc.name.toLowerCase().includes('disclosure')) {
      // Disclosure documents - bottom of each page
      tabs.signHereTabs.push({
        anchorString: '/s/',
        anchorXOffset: '0',
        anchorYOffset: '0',
        documentId: actualDocId,
        pageNumber: '1',
        recipientId: (recipient.order || 1).toString()
      });
      
      tabs.dateSignedTabs.push({
        anchorString: '/d/',
        anchorXOffset: '0',
        anchorYOffset: '0',
        documentId: actualDocId,
        pageNumber: '1',
        recipientId: (recipient.order || 1).toString()
      });
    } else {
      // Generic documents - auto-place at bottom
      tabs.signHereTabs.push({
        xPosition: '100',
        yPosition: '700',
        documentId: actualDocId,
        pageNumber: '1',
        recipientId: (recipient.order || 1).toString()
      });
      
      tabs.dateSignedTabs.push({
        xPosition: '300',
        yPosition: '700',
        documentId: actualDocId,
        pageNumber: '1',
        recipientId: (recipient.order || 1).toString()
      });
    }
  });
  
  return tabs;
};

// Enhanced send documents for signing
exports.sendDocumentsForSigning = async (req, res) => {
  try {
    const { offerId, documents, recipients, metadata } = req.body;

    // Get user's DocuSign access token
    const user = await User.findById(req.user.id);
    if (!user || !user.docusignAccessToken) {
      return res.status(401).json({ message: 'DocuSign not connected' });
    }

    // Get offer details for context
    const offer = await Offer.findById(offerId).populate('propertyListing');
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    // Get documents from Azure Storage
    const documentContents = await Promise.all(
      documents.map(async (docId) => {
        const document = await Document.findById(docId);
        if (!document) {
          throw new Error(`Document ${docId} not found`);
        }

        const blockBlobClient = containerClient.getBlockBlobClient(document.azureKey);
        const downloadResponse = await blockBlobClient.download();
        const content = await streamToBuffer(downloadResponse.readableStreamBody);
        
        return {
          id: docId,
          name: document.title,
          content: content.toString('base64'),
          type: document.type
        };
      })
    );

    // Create enhanced envelope
    const envelopeData = {
      emailSubject: `Offer Documents for ${offer.propertyListing.address}`,
      emailBlurb: `Please review and sign the attached offer documents for the property at ${offer.propertyListing.address}. This offer expires on ${new Date(offer.offerExpiryDate).toLocaleDateString()}.`,
      documents: documentContents,
      recipients: recipients,
      metadata: {
        offerId: offerId,
        listingId: offer.propertyListing._id.toString(),
        offerAmount: offer.purchasePrice
      }
    };

    const envelope = await createEnhancedEnvelope(user.docusignAccessToken, envelopeData);

    // Update documents with envelope ID and status
    await Document.updateMany(
      { _id: { $in: documents } },
      { 
        $set: { 
          docusignEnvelopeId: envelope.envelopeId,
          signingStatus: 'pending'
        }
      }
    );

    // Update offer status and save envelope info
    await Offer.findByIdAndUpdate(offerId, {
      $set: {
        'offerStatus': 'pending-signatures',
        'documentWorkflow.envelopeId': envelope.envelopeId,
        'documentWorkflow.recipients': recipients,
        'documentWorkflow.status': 'sent'
      }
    });

    res.json({ 
      envelopeId: envelope.envelopeId,
      status: 'sent',
      recipients: recipients.length,
      message: 'Documents sent for signing successfully'
    });
  } catch (error) {
    console.error('Error sending documents for signing:', error);
    res.status(500).json({ 
      message: 'Error sending documents for signing',
      error: error.message 
    });
  }
};

// Get envelope status
exports.getEnvelopeStatus = async (req, res) => {
  try {
    const { envelopeId } = req.params;
    const user = await User.findById(req.user.id);
    
    if (!user || !user.docusignAccessToken) {
      return res.status(401).json({ message: 'DocuSign not connected' });
    }

    const apiClient = createApiClient();
    apiClient.addDefaultHeader('Authorization', `Bearer ${user.docusignAccessToken}`);
    
    const envelopeApi = new docusign.EnvelopesApi(apiClient);
    const envelopeInfo = await envelopeApi.getEnvelope('me', envelopeId);

    res.json({
      status: envelopeInfo.status,
      created: envelopeInfo.created,
      lastModified: envelopeInfo.lastModified,
      emailSubject: envelopeInfo.emailSubject,
      emailBlurb: envelopeInfo.emailBlurb
    });
  } catch (error) {
    console.error('Error getting envelope status:', error);
    res.status(500).json({ message: 'Error getting envelope status' });
  }
};

// Webhook handler for envelope events
exports.handleWebhook = async (req, res) => {
  try {
    console.log('DocuSign webhook received:', req.body);
    
    const { event, data } = req.body;
    
    if (event === 'envelope-completed') {
      await handleEnvelopeCompleted(data);
    } else if (event === 'envelope-declined') {
      await handleEnvelopeDeclined(data);
    } else if (event === 'envelope-voided') {
      await handleEnvelopeVoided(data);
    }
    
    res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Error processing DocuSign webhook:', error);
    res.status(500).json({ message: 'Error processing webhook' });
  }
};

// Handle completed envelope
const handleEnvelopeCompleted = async (envelopeData) => {
  try {
    const { envelopeId } = envelopeData;
    
    // Find the offer associated with this envelope
    const offer = await Offer.findOne({ 'documentWorkflow.envelopeId': envelopeId });
    if (!offer) {
      console.log('No offer found for envelope:', envelopeId);
      return;
    }
    
    // Download completed documents from DocuSign
    const user = await User.findById(offer.uploadedBy);
    if (!user || !user.docusignAccessToken) {
      console.log('User or token not found for completed envelope');
      return;
    }
    
    const apiClient = createApiClient();
    apiClient.addDefaultHeader('Authorization', `Bearer ${user.docusignAccessToken}`);
    
    const envelopeApi = new docusign.EnvelopesApi(apiClient);
    
    // Get the combined document (all documents in one PDF)
    const documentsResult = await envelopeApi.getDocument('me', envelopeId, 'combined');
    
    // Upload signed document to Azure Storage
    const signedBlobName = `signed-documents/${envelopeId}-completed.pdf`;
    const blockBlobClient = containerClient.getBlockBlobClient(signedBlobName);
    
    await blockBlobClient.uploadData(documentsResult, {
      blobHTTPHeaders: { blobContentType: 'application/pdf' }
    });
    
    // Create new signed document record
    const signedDocument = new Document({
      title: 'Signed Offer Documents',
      type: 'Signed Document Package',
      size: documentsResult.length,
      azureKey: signedBlobName,
      uploadedBy: offer.uploadedBy,
      propertyListing: offer.propertyListing,
      offer: offer._id,
      docType: 'pdf',
      signed: true,
      purpose: 'signed_offer',
      docusignEnvelopeId: envelopeId,
      signingStatus: 'completed'
    });
    
    await signedDocument.save();
    
    // Update offer status and add signed document
    await Offer.findByIdAndUpdate(offer._id, {
      $set: {
        'offerStatus': 'documents-signed',
        'documentWorkflow.status': 'completed',
        'documentWorkflow.completedAt': new Date()
      },
      $push: {
        'documents': signedDocument._id
      }
    });
    
    // Update original documents signing status
    await Document.updateMany(
      { docusignEnvelopeId: envelopeId },
      { $set: { signingStatus: 'completed' } }
    );
    
    console.log('Successfully processed completed envelope:', envelopeId);
    
  } catch (error) {
    console.error('Error handling completed envelope:', error);
  }
};

// Handle declined envelope
const handleEnvelopeDeclined = async (envelopeData) => {
  try {
    const { envelopeId } = envelopeData;
    
    await Offer.findOneAndUpdate(
      { 'documentWorkflow.envelopeId': envelopeId },
      {
        $set: {
          'offerStatus': 'documents-declined',
          'documentWorkflow.status': 'declined',
          'documentWorkflow.declinedAt': new Date()
        }
      }
    );
    
    await Document.updateMany(
      { docusignEnvelopeId: envelopeId },
      { $set: { signingStatus: 'declined' } }
    );
    
  } catch (error) {
    console.error('Error handling declined envelope:', error);
  }
};

// Handle voided envelope
const handleEnvelopeVoided = async (envelopeData) => {
  try {
    const { envelopeId } = envelopeData;
    
    await Offer.findOneAndUpdate(
      { 'documentWorkflow.envelopeId': envelopeId },
      {
        $set: {
          'offerStatus': 'documents-voided',
          'documentWorkflow.status': 'voided',
          'documentWorkflow.voidedAt': new Date()
        }
      }
    );
    
    await Document.updateMany(
      { docusignEnvelopeId: envelopeId },
      { $set: { signingStatus: 'voided' } }
    );
    
  } catch (error) {
    console.error('Error handling voided envelope:', error);
  }
};

// Helper function to convert stream to buffer
const streamToBuffer = async (stream) => {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}; 