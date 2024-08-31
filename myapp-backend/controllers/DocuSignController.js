// controllers/DocuSignController.js

const docusign = require('docusign-esign');
const Offer = require('../models/Offer');
const Document = require('../models/Document');
const { dsConfig, apiClient, getJWTToken } = require('../config/docusign');
const { fetchDocumentContent, saveSignedDocument } = require('../utils/docusignHelpers');

exports.createSigningSession = async (req, res) => {
  const { offerId } = req.body;

  if (!offerId) {
    return res.status(400).json({ message: 'Offer ID is required' });
  }

  try {
    const offer = await Offer.findById(offerId).populate('documents');
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    if (offer.buyersAgent.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to create signing session for this offer' });
    }

    const accessToken = await getJWTToken();
    apiClient.addDefaultHeader('Authorization', 'Bearer ' + accessToken);

    const envelopesApi = new docusign.EnvelopesApi(apiClient);

    const documents = await Promise.all(offer.documents.map(async (doc, index) => ({
      documentBase64: await fetchDocumentContent(doc),
      name: doc.title,
      fileExtension: doc.docType === 'pdf' ? 'pdf' : 'png',
      documentId: (index + 1).toString()
    })));

    const envDef = new docusign.EnvelopeDefinition();
    envDef.emailSubject = 'Please sign your offer documents';
    envDef.documents = documents;
    envDef.recipients = {
      signers: [{
        email: req.user.email,
        name: req.user.name,
        recipientId: '1',
        routingOrder: '1',
        clientUserId: req.user.id.toString()
      }]
    };
    envDef.status = 'sent';

    const autoPlace = new docusign.AutoPlace();
    autoPlace.anchorString = '/sn1/';
    autoPlace.anchorUnits = 'pixels';
    autoPlace.anchorXOffset = '20';
    autoPlace.anchorYOffset = '10';
    envDef.autoPlace = [autoPlace];

    const envelope = await envelopesApi.createEnvelope(dsConfig.accountId, { envelopeDefinition: envDef });

    const viewRequest = new docusign.RecipientViewRequest();
    viewRequest.returnUrl = `${process.env.APP_URL}/offer/${offerId}/docusign-complete`;
    viewRequest.authenticationMethod = 'none';
    viewRequest.email = req.user.email;
    viewRequest.userName = req.user.name;
    viewRequest.clientUserId = req.user.id.toString();

    const signingUrl = await envelopesApi.createRecipientView(dsConfig.accountId, envelope.envelopeId, { recipientViewRequest: viewRequest });

    offer.docusignEnvelopeId = envelope.envelopeId;
    offer.docusignStatus = 'sent';
    await offer.save();

    res.json({ signingUrl: signingUrl.url });
  } catch (error) {
    console.error('Error creating DocuSign signing session:', error);
    res.status(500).json({ message: 'Failed to create signing session', error: error.message });
  }
};

exports.handleDocuSignWebhook = async (req, res) => {
  const { envelopeStatus, envelopeId } = req.body;

  if (!verifyWebhookRequest(req)) {
    return res.status(401).json({ message: 'Unauthorized webhook request' });
  }

  if (envelopeStatus === 'completed') {
    try {
      const offer = await Offer.findOne({ docusignEnvelopeId: envelopeId });
      if (!offer) {
        return res.status(404).json({ message: 'Offer not found' });
      }

      const accessToken = await getJWTToken();
      apiClient.addDefaultHeader('Authorization', 'Bearer ' + accessToken);

      const envelopesApi = new docusign.EnvelopesApi(apiClient);

      const documents = await envelopesApi.listDocuments(dsConfig.accountId, envelopeId);

      for (const doc of documents.envelopeDocuments) {
        const signedDocContent = await envelopesApi.getDocument(dsConfig.accountId, envelopeId, doc.documentId);
        await saveSignedDocument(offer._id, doc.documentId, signedDocContent);
      }

      offer.status = 'signed';
      offer.docusignStatus = 'completed';
      await offer.save();

      res.status(200).end();
    } catch (error) {
      console.error('Error processing DocuSign webhook:', error);
      res.status(500).json({ message: 'Error processing webhook', error: error.message });
    }
  } else {
    res.status(200).end();
  }
};

exports.getSigningStatus = async (req, res) => {
  const { offerId } = req.params;

  try {
    const offer = await Offer.findById(offerId);
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    if (offer.buyersAgent.toString() !== req.user.id && offer.propertyListing.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to get signing status for this offer' });
    }

    res.json({ status: offer.docusignStatus });
  } catch (error) {
    console.error('Error getting signing status:', error);
    res.status(500).json({ message: 'Failed to get signing status', error: error.message });
  }
};

function verifyWebhookRequest(req) {
  // Implement DocuSign webhook verification logic here
  // For now, we'll return true as a placeholder
  return true;
}