const docusign = require('docusign-esign');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// DocuSign configuration
const config = {
  integrationKey: process.env.DOCUSIGN_INTEGRATION_KEY,
  clientSecret: process.env.DOCUSIGN_CLIENT_SECRET,
  redirectUri: process.env.DOCUSIGN_REDIRECT_URI,
  authServer: process.env.DOCUSIGN_AUTH_SERVER || 'https://account-d.docusign.com',
  apiUrl: process.env.DOCUSIGN_API_URL || 'https://demo.docusign.net/restapi'
};

// Create DocuSign API client
const createApiClient = () => {
  const apiClient = new docusign.ApiClient();
  apiClient.setBasePath(config.apiUrl);
  return apiClient;
};

// Get DocuSign access token using authorization code
const getAccessTokenFromCode = async (code) => {
  try {
    const apiClient = createApiClient();
    
    // Create the token request
    const tokenRequest = {
      grant_type: 'authorization_code',
      code: code,
      client_id: config.integrationKey,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri
    };

    // Make the token request
    const response = await fetch(`${config.authServer}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(tokenRequest)
    });

    if (!response.ok) {
      throw new Error(`Token request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting DocuSign access token:', error);
    throw error;
  }
};



module.exports = {
  config,
  createApiClient,
  getAccessTokenFromCode
}; 