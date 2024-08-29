// config/docusign.js

const docusign = require('docusign-esign');
const fs = require('fs');
const path = require('path');

const dsConfig = {
  clientId: process.env.DOCUSIGN_CLIENT_ID,
  clientSecret: process.env.DOCUSIGN_CLIENT_SECRET,
  redirectUri: process.env.DOCUSIGN_REDIRECT_URI,
  userId: process.env.DOCUSIGN_USER_ID,
  accountId: process.env.DOCUSIGN_ACCOUNT_ID,
  basePath: process.env.DOCUSIGN_BASE_PATH,
  privateKeyLocation: path.resolve(__dirname, './docusign_private.key')
};

const apiClient = new docusign.ApiClient();
apiClient.setBasePath(dsConfig.basePath);

const getJWTToken = async () => {
  const privateKey = fs.readFileSync(dsConfig.privateKeyLocation);
  const jwtLifeSec = 10 * 60; // 10 minutes
  const scopes = 'signature impersonation';
  
  try {
    const results = await apiClient.requestJWTUserToken(
      dsConfig.clientId,
      dsConfig.userId,
      scopes,
      privateKey,
      jwtLifeSec
    );
    return results.body.access_token;
  } catch (error) {
    console.error('Error getting JWT token:', error);
    throw error;
  }
};

module.exports = {
  dsConfig,
  apiClient,
  getJWTToken
};