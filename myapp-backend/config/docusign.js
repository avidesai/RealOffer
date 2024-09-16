// config/docusign.js

const docusign = require('docusign-esign');
const crypto = require('crypto');

const dsConfig = {
  clientId: process.env.DOCUSIGN_CLIENT_ID,
  redirectUri: process.env.DOCUSIGN_REDIRECT_URI,
  basePath: process.env.DOCUSIGN_BASE_PATH,
};

const apiClient = new docusign.ApiClient();
apiClient.setBasePath(dsConfig.basePath);

const generateCodeVerifier = () => {
  return crypto.randomBytes(32).toString('hex');
};

const generateCodeChallenge = (verifier) => {
  return crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

const getOAuthLoginUrl = (codeChallenge, state) => {
  const scopes = 'signature';
  const url = `${dsConfig.basePath}/oauth/auth?response_type=code&scope=${scopes}&client_id=${dsConfig.clientId}&redirect_uri=${encodeURIComponent(
    dsConfig.redirectUri
  )}&code_challenge=${codeChallenge}&code_challenge_method=S256&state=${state}`;
  console.log('Generated OAuth Login URL:', url);
  return url;
};

const getAccessTokenFromCode = async (code, codeVerifier) => {
  try {
    console.log('Attempting to get access token from DocuSign...');
    const results = await apiClient.generateAccessToken(
      dsConfig.clientId,
      code,
      dsConfig.redirectUri,
      codeVerifier
    );
    if (results && results.accessToken) {
      console.log('Access token successfully obtained from DocuSign.');
      return results.accessToken;
    } else {
      throw new Error('Access token not found in DocuSign response');
    }
  } catch (error) {
    console.error('Error getting access token from DocuSign:', error);
    throw error;
  }
};

module.exports = {
  getOAuthLoginUrl,
  getAccessTokenFromCode,
  generateCodeVerifier,
  generateCodeChallenge,
};
