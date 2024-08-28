// utils/docusignHelpers.js
const docusign = require('docusign-esign');
const fs = require('fs');
const path = require('path');
const { BlobServiceClient } = require('@azure/storage-blob');
const { Document } = require('../models/Document');
const { containerClient, generateSASToken } = require('../config/azureStorage');

// Add this new function to create a container client for signed documents
const getSignedDocsContainerClient = () => {
  const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_SIGNED_DOCS_CONNECTION_STRING);
  return blobServiceClient.getContainerClient(process.env.AZURE_SIGNED_DOCS_CONTAINER_NAME);
};

exports.getAccessToken = async () => {
  const jwtLifeSec = 10 * 60; // requested lifetime for the JWT is 10 min
  const scopes = 'signature impersonation';
  const jwtConfig = {
    dsJWTClientId: process.env.DOCUSIGN_CLIENT_ID,
    impersonatedUserGuid: process.env.DOCUSIGN_IMPERSONATED_USER_GUID,
    privateKeyLocation: path.resolve(__dirname, '../config/docusign_private.key'),
    authServer: 'account-d.docusign.com'
  };
  const jwtToken = new docusign.ApiClient();
  const results = await jwtToken.requestJWTUserToken(
    jwtConfig.dsJWTClientId,
    jwtConfig.impersonatedUserGuid,
    scopes,
    fs.readFileSync(jwtConfig.privateKeyLocation),
    jwtLifeSec
  );
  return results.body.access_token;
};

exports.fetchDocumentContent = async (document) => {
  try {
    const sasToken = generateSASToken(document.azureKey);
    const documentUrlWithSAS = `${document.thumbnailUrl}?${sasToken}`;
    const response = await fetch(documentUrlWithSAS);
    if (!response.ok) {
      throw new Error(`Failed to fetch document: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer).toString('base64');
  } catch (error) {
    console.error('Error fetching document content:', error);
    throw error;
  }
};

exports.saveSignedDocument = async (offerId, documentId, signedContent) => {
  try {
    // Find the original document
    const originalDocument = await Document.findOne({ offer: offerId, _id: documentId });
    if (!originalDocument) {
      throw new Error('Original document not found');
    }

    // Create a new blob name for the signed document
    const signedBlobName = `signed-${offerId}-${originalDocument.azureKey.split('/').pop()}`;

    // Get the container client for signed documents
    const signedDocsContainerClient = getSignedDocsContainerClient();

    // Upload the signed document to the new Azure Blob Storage
    const blockBlobClient = signedDocsContainerClient.getBlockBlobClient(signedBlobName);
    await blockBlobClient.upload(signedContent, signedContent.length);

    // Update the document in the database
    const updatedDocument = await Document.findByIdAndUpdate(
      documentId,
      {
        azureKey: signedBlobName,
        thumbnailUrl: blockBlobClient.url,
        signed: true,
        size: signedContent.length,
      },
      { new: true }
    );

    if (!updatedDocument) {
      throw new Error('Failed to update document in database');
    }

    console.log(`Signed document saved for offer ${offerId}, document ${documentId}`);
    return updatedDocument;
  } catch (error) {
    console.error('Error saving signed document:', error);
    throw error;
  }
};

// Add this new function to generate SAS token for signed documents
exports.generateSignedDocsSASToken = (blobName) => {
  const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_SIGNED_DOCS_CONNECTION_STRING);
  const containerClient = blobServiceClient.getContainerClient(process.env.AZURE_SIGNED_DOCS_CONTAINER_NAME);
  const blobClient = containerClient.getBlobClient(blobName);

  const expiresOn = new Date(new Date().valueOf() + 3600 * 1000); // 1 hour from now
  const permissions = "r"; // Read permission

  const sasToken = blobClient.generateSasUrl({
    permissions: permissions,
    expiresOn: expiresOn,
  });

  return sasToken;
};