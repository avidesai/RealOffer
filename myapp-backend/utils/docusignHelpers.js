// utils/docusignHelpers.js

const { BlobServiceClient } = require('@azure/storage-blob');
const { Document } = require('../models/Document');
const { containerClient, generateSASToken } = require('../config/azureStorage');

const getSignedDocsContainerClient = () => {
  try {
    const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_SIGNED_DOCS_CONNECTION_STRING);
    return blobServiceClient.getContainerClient(process.env.AZURE_SIGNED_DOCS_CONTAINER_NAME);
  } catch (error) {
    console.error('Error getting signed docs container client:', error);
    throw error;
  }
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
    const originalDocument = await Document.findOne({ offer: offerId, _id: documentId });
    if (!originalDocument) {
      throw new Error('Original document not found');
    }
    const signedBlobName = `signed-${offerId}-${originalDocument.azureKey.split('/').pop()}`;
    const signedDocsContainerClient = getSignedDocsContainerClient();
    const blockBlobClient = signedDocsContainerClient.getBlockBlobClient(signedBlobName);
    await blockBlobClient.upload(signedContent, signedContent.length);
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

exports.generateSignedDocsSASToken = (blobName) => {
  try {
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
  } catch (error) {
    console.error('Error generating SAS token:', error);
    throw error;
  }
};
