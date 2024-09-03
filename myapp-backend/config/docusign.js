// config/docusign.js

const docusign = require('docusign-esign');

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
  const scopes = ['signature']; // Ensure 'signature' scope is correctly specified
  return apiClient.getAuthorizationUri({
    response_type: 'code',
    scope: scopes.join(' '), // Join scopes to form a space-separated string
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
  getOAuthLoginUrl,
  getAccessTokenFromCode,
};
