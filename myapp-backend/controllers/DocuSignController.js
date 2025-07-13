const docusign = require('docusign-esign');
const { config, createApiClient, getAccessTokenFromCode } = require('../config/docusign');
const User = require('../models/User');
const Document = require('../models/Document');
const Offer = require('../models/Offer');
const { containerClient } = require('../config/azureStorage');

// Helper function to refresh DocuSign access token
const refreshDocusignToken = async (refreshToken) => {
  try {
    const response = await fetch(`${config.authServer}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: config.integrationKey,
        client_secret: config.clientSecret
      })
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error refreshing DocuSign token:', error);
    throw error;
  }
};

// Get DocuSign connection status
exports.getConnectionStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.docusignAccessToken) {
      return res.json({ isConnected: false });
    }

    // Check if token is expired
    if (user.docusignTokenExpiry && new Date() > user.docusignTokenExpiry) {
      console.log('DocuSign token expired, attempting refresh for connection status...');
      
      if (!user.docusignRefreshToken) {
        // Token expired and no refresh token
        return res.json({ isConnected: false, reason: 'Token expired' });
      }
      
      try {
        // Attempt to refresh the token
        const refreshedTokenData = await refreshDocusignToken(user.docusignRefreshToken);
        
        // Update user with new tokens
        user.docusignAccessToken = refreshedTokenData.access_token;
        if (refreshedTokenData.refresh_token) {
          user.docusignRefreshToken = refreshedTokenData.refresh_token;
        }
        user.docusignTokenExpiry = new Date(Date.now() + (refreshedTokenData.expires_in * 1000));
        await user.save();
        
        console.log('DocuSign token refreshed successfully for connection status');
        return res.json({ isConnected: true, refreshed: true });
      } catch (refreshError) {
        console.error('Failed to refresh DocuSign token for connection status:', refreshError);
        return res.json({ isConnected: false, reason: 'Token refresh failed' });
      }
    }

    res.json({ isConnected: true });
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
    
    // Enhanced document preparation without automatic field placement
    envelope.documents = await Promise.all(envelopeData.documents.map(async (doc, index) => {
      const document = new docusign.Document();
      document.documentBase64 = doc.content;
      document.name = doc.name;
      document.fileExtension = 'pdf';
      document.documentId = (index + 1).toString();
      

      
      return document;
    }));

    // Enhanced recipient configuration with Agent and Signer roles
    envelope.recipients = new docusign.Recipients();
    envelope.recipients.signers = [];
    envelope.recipients.agents = [];
    
    // Debug: Log recipients being processed
    console.log('Processing recipients for DocuSign envelope:', JSON.stringify(envelopeData.recipients, null, 2));
    
    // Use a counter for unique recipient IDs (DocuSign requires integer or GUID format)
    let recipientIdCounter = 1;
    let signerRoutingOrder = 3; // Start buyers at routing order 3 (after agent setup=1 and agent signing=2)
    
    // Process recipients by role (check both 'role' and 'type' fields for compatibility)
    envelopeData.recipients.forEach((recipient, index) => {
      // Check for both 'role' and 'type' fields to handle different frontend formats
      const recipientRole = recipient.role || recipient.type;
      
      if (recipientRole === 'agent' || recipient.type === 'buyer-agent') {
        // Create Agent recipient for field setup
        const agent = new docusign.Agent();
        agent.email = recipient.email;
        agent.name = recipient.name;
        agent.recipientId = recipientIdCounter.toString();
        agent.routingOrder = '1'; // Agents always go first for field setup
        envelope.recipients.agents.push(agent);
        recipientIdCounter++;
        
        // Also add as signer if they need to sign (typically order 2)
        const agentAsSigner = new docusign.Signer();
        agentAsSigner.email = recipient.email;
        agentAsSigner.name = recipient.name;
        agentAsSigner.recipientId = recipientIdCounter.toString(); // Use proper integer ID
        agentAsSigner.routingOrder = '2'; // Agent signs after setting up fields
        envelope.recipients.signers.push(agentAsSigner);
        recipientIdCounter++;
      } else {
        // Create regular Signer recipient
        const signer = new docusign.Signer();
        signer.email = recipient.email;
        signer.name = recipient.name;
        signer.recipientId = recipientIdCounter.toString();
        signer.routingOrder = signerRoutingOrder.toString(); // Buyers start from order 3+ (after agent setup and agent signing)
        envelope.recipients.signers.push(signer);
        recipientIdCounter++;
        signerRoutingOrder++;
      }
    });

    // Add eventNotification for webhook callbacks
    envelope.eventNotification = new docusign.EventNotification();
    envelope.eventNotification.url = `${process.env.BACKEND_URL}/api/docusign/webhook`;
    envelope.eventNotification.requireAcknowledgment = 'true';
    envelope.eventNotification.useSoapInterface = 'false';
    envelope.eventNotification.soapNameSpace = '';
    envelope.eventNotification.includeCertificateWithSoap = 'false';
    envelope.eventNotification.signMessageWithX509Cert = 'false';
    envelope.eventNotification.includeDocuments = 'true';
    envelope.eventNotification.includeEnvelopeVoidReason = 'true';
    envelope.eventNotification.includeTimeZone = 'true';
    envelope.eventNotification.includeSenderAccountAsCustomField = 'true';
    envelope.eventNotification.includeDocumentFields = 'false';
    envelope.eventNotification.includeCertificateOfCompletion = 'false';
    
    // Configure envelope events to monitor
    envelope.eventNotification.envelopeEvents = [
      { envelopeEventStatusCode: 'completed' },
      { envelopeEventStatusCode: 'declined' },
      { envelopeEventStatusCode: 'voided' }
    ];

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

    // Validate all document IDs are positive integers
    envelope.documents.forEach((doc, index) => {
      const docId = parseInt(doc.documentId);
      if (!doc.documentId || isNaN(docId) || docId <= 0) {
        throw new Error(`Invalid document ID for document ${index}: "${doc.documentId}". Must be a positive integer.`);
      }
    });



    const results = await envelopeApi.createEnvelope('me', { envelopeDefinition: envelope });
    
    // Debug: Log the actual response structure
    console.log('DocuSign envelope creation response:', JSON.stringify(results, null, 2));
    
    return {
      envelopeId: results.envelopeId,
      status: results.status,
      ...results
    };
  } catch (error) {
    console.error('Error creating enhanced DocuSign envelope:', error);
    throw error;
  }
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

    // Check if token is expired and refresh if needed
    if (user.docusignTokenExpiry && new Date() > user.docusignTokenExpiry) {
      console.log('DocuSign token expired, attempting refresh...');
      try {
        if (!user.docusignRefreshToken) {
          return res.status(401).json({ message: 'DocuSign token expired and no refresh token available. Please reconnect DocuSign.' });
        }
        
        // Refresh the token
        const refreshedTokenData = await refreshDocusignToken(user.docusignRefreshToken);
        
        // Update user with new tokens
        user.docusignAccessToken = refreshedTokenData.access_token;
        if (refreshedTokenData.refresh_token) {
          user.docusignRefreshToken = refreshedTokenData.refresh_token;
        }
        user.docusignTokenExpiry = new Date(Date.now() + (refreshedTokenData.expires_in * 1000));
        await user.save();
        
        console.log('DocuSign token refreshed successfully');
      } catch (refreshError) {
        console.error('Failed to refresh DocuSign token:', refreshError);
        return res.status(401).json({ message: 'DocuSign token expired and refresh failed. Please reconnect DocuSign.' });
      }
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
          name: document.title,
          content: content.toString('base64'),
          type: document.type,
          originalId: docId // Keep for reference but don't use as documentId
        };
      })
    );

    // Create enhanced envelope
    const envelopeData = {
      emailSubject: `Offer Documents for ${offer.propertyListing.address} - Agent Field Setup Required`,
      emailBlurb: `Please review the attached offer documents for the property at ${offer.propertyListing.address}. 

BUYER'S AGENT: You are receiving this as an Agent to set up signature fields first. Please:
1. Open the envelope and use the DocuSign tagging interface to place signature fields
2. Add tabs for yourself and all buyers as needed
3. Click "Send" to route the envelope to all signers in order

This offer expires on ${new Date(offer.offerExpiryDate).toLocaleDateString()}.

After field setup, all recipients will automatically receive signing invitations in the configured order. The agent will sign first, followed by the buyers.`,
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
    console.error('Error stack:', error.stack);
    console.error('Request body:', JSON.stringify(req.body, null, 2));
    
    // Handle specific DocuSign API errors
    if (error.response) {
      const status = error.response.status;
      const errorData = error.response.data;
      
      if (status === 401) {
        return res.status(401).json({ 
          message: 'DocuSign authentication failed. Please reconnect DocuSign.',
          error: 'Unauthorized',
          docusignError: errorData
        });
      } else if (status === 400) {
        return res.status(400).json({ 
          message: 'Invalid request to DocuSign API',
          error: 'Bad Request',
          docusignError: errorData
        });
      }
    }
    
    // Handle general errors
    res.status(500).json({ 
      message: 'Error sending documents for signing',
      error: error.message,
      stack: error.stack
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
    console.log('DocuSign Connect webhook received:', req.body);
    
    // DocuSign Connect sends XML data, but we'll handle both XML and JSON
    let envelopeData;
    
    if (req.body && typeof req.body === 'object') {
      // Handle JSON format (for testing or future DocuSign updates)
      envelopeData = req.body;
    } else {
      // Handle XML format from DocuSign Connect
      // For now, we'll extract the envelope ID from XML if needed
      // This is a simplified approach - you may want to use a proper XML parser
      const bodyStr = req.body.toString();
      const envelopeIdMatch = bodyStr.match(/<EnvelopeStatus.*?<EnvelopeID>(.*?)<\/EnvelopeID>/);
      const statusMatch = bodyStr.match(/<Status>(.*?)<\/Status>/);
      
      if (envelopeIdMatch && statusMatch) {
        envelopeData = {
          envelopeId: envelopeIdMatch[1],
          status: statusMatch[1]
        };
      } else {
        console.error('Could not parse DocuSign webhook XML:', bodyStr);
        return res.status(400).json({ message: 'Invalid webhook format' });
      }
    }
    
    const { envelopeId, status } = envelopeData;
    
    if (!envelopeId) {
      console.error('No envelope ID found in webhook data');
      return res.status(400).json({ message: 'No envelope ID found' });
    }
    
    console.log(`Processing envelope ${envelopeId} with status: ${status}`);
    
    if (status === 'completed' || status === 'Completed') {
      await handleEnvelopeCompleted({ envelopeId });
    } else if (status === 'declined' || status === 'Declined') {
      await handleEnvelopeDeclined({ envelopeId });
    } else if (status === 'voided' || status === 'Voided') {
      await handleEnvelopeVoided({ envelopeId });
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
    
    // Get recipient information for tracking who signed
    let recipients = [];
    try {
      const recipientInfo = await envelopeApi.listRecipients('me', envelopeId);
      recipients = [
        ...(recipientInfo.signers || []),
        ...(recipientInfo.agents || [])
      ].map(r => ({
        name: r.name,
        email: r.email,
        signedAt: r.signedDateTime ? new Date(r.signedDateTime) : new Date()
      }));
    } catch (recipientError) {
      console.warn('Could not fetch recipient info:', recipientError);
    }
    
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
      signingStatus: 'completed',
      signedBy: recipients
    });
    
    await signedDocument.save();
    
    // Update offer status to pending-review (new status flow)
    await Offer.findByIdAndUpdate(offer._id, {
      $set: {
        'offerStatus': 'pending-review', // Changed from 'documents-signed' to 'pending-review'
        'documentWorkflow.status': 'completed',
        'documentWorkflow.completedAt': new Date()
      },
      $push: {
        'documents': signedDocument._id
      }
    });
    
    // Update ALL original documents signing status and add signature info
    const originalDocuments = await Document.find({ docusignEnvelopeId: envelopeId });
    await Promise.all(originalDocuments.map(async (doc) => {
      await Document.findByIdAndUpdate(doc._id, {
        $set: { 
          signingStatus: 'completed',
          signed: true,
          signedBy: recipients
        }
      });
    }));
    
    console.log(`Successfully processed completed envelope: ${envelopeId}`);
    console.log(`- Offer status updated to pending-review`);
    console.log(`- ${originalDocuments.length} original documents marked as signed`);
    console.log(`- Signed by: ${recipients.map(r => r.name).join(', ')}`);
    
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
    
    // Update all original documents
    const originalDocuments = await Document.find({ docusignEnvelopeId: envelopeId });
    await Promise.all(originalDocuments.map(async (doc) => {
      await Document.findByIdAndUpdate(doc._id, {
        $set: { signingStatus: 'declined' }
      });
    }));
    
    console.log(`Envelope ${envelopeId} declined - ${originalDocuments.length} documents marked as declined`);
    
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
    
    // Update all original documents
    const originalDocuments = await Document.find({ docusignEnvelopeId: envelopeId });
    await Promise.all(originalDocuments.map(async (doc) => {
      await Document.findByIdAndUpdate(doc._id, {
        $set: { signingStatus: 'voided' }
      });
    }));
    
    console.log(`Envelope ${envelopeId} voided - ${originalDocuments.length} documents marked as voided`);
    
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