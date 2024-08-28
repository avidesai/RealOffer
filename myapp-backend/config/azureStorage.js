// config/azureStorage.js

const { BlobServiceClient, generateBlobSASQueryParameters, StorageSharedKeyCredential, BlobSASPermissions } = require('@azure/storage-blob');
const { v4: uuidv4 } = require('uuid');

// Original storage
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
if (!AZURE_STORAGE_CONNECTION_STRING) {
  throw new Error("Azure Storage Connection string not found");
}

// New storage for signed documents
const AZURE_SIGNED_DOCS_CONNECTION_STRING = process.env.AZURE_SIGNED_DOCS_CONNECTION_STRING;
if (!AZURE_SIGNED_DOCS_CONNECTION_STRING) {
  throw new Error("Azure Signed Docs Storage Connection string not found");
}

// Original blob service client
const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
const containerClient = blobServiceClient.getContainerClient(process.env.AZURE_STORAGE_CONTAINER_NAME);

// New blob service client for signed documents
const signedDocsBlobServiceClient = BlobServiceClient.fromConnectionString(AZURE_SIGNED_DOCS_CONNECTION_STRING);
const signedDocsContainerClient = signedDocsBlobServiceClient.getContainerClient(process.env.AZURE_SIGNED_DOCS_CONTAINER_NAME);

// Original shared key credential
const sharedKeyCredential = new StorageSharedKeyCredential(
  process.env.AZURE_STORAGE_ACCOUNT_NAME,
  process.env.AZURE_STORAGE_ACCOUNT_KEY
);

// New shared key credential for signed documents
const signedDocsSharedKeyCredential = new StorageSharedKeyCredential(
  process.env.AZURE_SIGNED_DOCS_ACCOUNT_NAME,
  process.env.AZURE_SIGNED_DOCS_ACCOUNT_KEY
);

const generateSASToken = (blobName, isSigned = false) => {
  const expiresOn = new Date(new Date().valueOf() + 3600 * 1000); // Token valid for 1 hour
  const permissions = BlobSASPermissions.parse("r"); // Read permission

  const sasToken = generateBlobSASQueryParameters({
    containerName: isSigned ? process.env.AZURE_SIGNED_DOCS_CONTAINER_NAME : process.env.AZURE_STORAGE_CONTAINER_NAME,
    blobName,
    expiresOn,
    permissions,
    protocol: "https",
  }, isSigned ? signedDocsSharedKeyCredential : sharedKeyCredential).toString();

  return sasToken;
};

module.exports = {
  containerClient,
  signedDocsContainerClient,
  generateSASToken,
};