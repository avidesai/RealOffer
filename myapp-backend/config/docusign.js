// config/docusign.js

const docusign = require('docusign-esign');
const path = require('path');

const dsConfig = {
  clientId: process.env.DOCUSIGN_CLIENT_ID,
  clientSecret: process.env.DOCUSIGN_CLIENT_SECRET,
  redirectUri: process.env.DOCUSIGN_REDIRECT_URI,
  accountId: process.env.DOCUSIGN_ACCOUNT_ID,
  basePath: process.env.DOCUSIGN_BASE_PATH,
};

const apiClient = new docusign.ApiClient();
apiClient.setBasePath(dsConfig.basePath);

const getOAuthLoginUrl = () => {
  return apiClient.getAuthorizationUri({
    response_type: 'code',
    scope: 'signature',
    client_id: dsConfig.clientId,
    redirect_uri: dsConfig.redirectUri,
  });
};

const getAccessTokenFromCode = async (code) => {
  try {
    const results = await apiClient.generateAccessToken(
      dsConfig.clientId,
      dsConfig.clientSecret,
      code
    );
    return results.body.access_token;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw error;
  }
};

module.exports = {
  dsConfig,
  apiClient,
  getOAuthLoginUrl,
  getAccessTokenFromCode,
};
