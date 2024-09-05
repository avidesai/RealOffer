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
  const scopes = ['signature'];
  return apiClient.getAuthorizationUri({
    response_type: 'code',
    scope: scopes.join(' '),
    client_id: dsConfig.clientId,
    redirect_uri: dsConfig.redirectUri, // Make sure this is correctly passed
  });
};


const getAccessTokenFromCode = async (code) => {
  try {
    const results = await apiClient.generateAccessToken(
      dsConfig.clientId,
      dsConfig.clientSecret,
      code
    );
    
    console.log('DocuSign API Response:', results); // Log the entire response

    if (results && results.body && results.body.access_token) {
      return results.body.access_token;
    } else {
      throw new Error('Access token not found in DocuSign response');
    }
  } catch (error) {
    console.error('Error getting access token:', error);
    throw error;
  }
};

module.exports = {
  getOAuthLoginUrl,
  getAccessTokenFromCode,
};