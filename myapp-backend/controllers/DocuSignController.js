const docusign = require('docusign-esign');
const { config, createApiClient, getAccessTokenFromCode, createEnvelope } = require('../config/docusign');
const User = require('../models/User');
const Document = require('../models/Document');
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

// Send documents for signing
exports.sendDocumentsForSigning = async (req, res) => {
  try {
    const { documents, signers, title, message } = req.body;

    // Get user's DocuSign access token
    const user = await User.findById(req.user.id);
    if (!user || !user.docusignAccessToken) {
      return res.status(401).json({ message: 'DocuSign not connected' });
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
          content: content.toString('base64')
        };
      })
    );

    // Create envelope
    const envelopeData = {
      title,
      message,
      documents: documentContents,
      signers
    };

    const envelope = await createEnvelope(user.docusignAccessToken, envelopeData);

    // Update documents with envelope ID
    await Document.updateMany(
      { _id: { $in: documents } },
      { 
        $set: { 
          docusignEnvelopeId: envelope.envelopeId,
          signingStatus: 'pending'
        }
      }
    );

    res.json({ 
      envelopeId: envelope.envelopeId,
      message: 'Documents sent for signing successfully'
    });
  } catch (error) {
    console.error('Error sending documents for signing:', error);
    res.status(500).json({ message: 'Error sending documents for signing' });
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
      documentsUri: envelopeInfo.documentsUri,
      recipientsUri: envelopeInfo.recipientsUri,
      attachmentsUri: envelopeInfo.attachmentsUri,
      envelopeUri: envelopeInfo.envelopeUri,
      emailSubject: envelopeInfo.emailSubject,
      emailBlurb: envelopeInfo.emailBlurb,
      signingLocation: envelopeInfo.signingLocation,
      customFieldsUri: envelopeInfo.customFieldsUri,
      notificationUri: envelopeInfo.notificationUri,
      enableWetSign: envelopeInfo.enableWetSign,
      allowMarkup: envelopeInfo.allowMarkup,
      allowReassign: envelopeInfo.allowReassign,
      createdDateTime: envelopeInfo.createdDateTime,
      lastModifiedDateTime: envelopeInfo.lastModifiedDateTime,
      deliveredDateTime: envelopeInfo.deliveredDateTime,
      initialSentDateTime: envelopeInfo.initialSentDateTime,
      statusChangedDateTime: envelopeInfo.statusChangedDateTime,
      documentsCombinedUri: envelopeInfo.documentsCombinedUri,
      certificateUri: envelopeInfo.certificateUri,
      templatesUri: envelopeInfo.templatesUri
    });
  } catch (error) {
    console.error('Error getting envelope status:', error);
    res.status(500).json({ message: 'Error getting envelope status' });
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