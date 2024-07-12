// config/azureStorage.js

const { BlobServiceClient, generateBlobSASQueryParameters, StorageSharedKeyCredential, BlobSASPermissions } = require('@azure/storage-blob');
const { v4: uuidv4 } = require('uuid');

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
if (!AZURE_STORAGE_CONNECTION_STRING) {
  throw new Error("Azure Storage Connection string not found");
}

const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
const containerClient = blobServiceClient.getContainerClient(process.env.AZURE_STORAGE_CONTAINER_NAME);

const sharedKeyCredential = new StorageSharedKeyCredential(
  process.env.AZURE_STORAGE_ACCOUNT_NAME,
  process.env.AZURE_STORAGE_ACCOUNT_KEY
);

const generateSASToken = (blobName) => {
  const expiresOn = new Date(new Date().valueOf() + 3600 * 1000); // Token valid for 1 hour
  const permissions = BlobSASPermissions.parse("r"); // Read permission

  const sasToken = generateBlobSASQueryParameters({
    containerName: process.env.AZURE_STORAGE_CONTAINER_NAME,
    blobName,
    expiresOn,
    permissions,
    protocol: "https",
  }, sharedKeyCredential).toString();

  return sasToken;
};

module.exports = {
  containerClient,
  generateSASToken,
};
