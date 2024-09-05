// controllers/DocuSignController.js

const { getOAuthLoginUrl, getAccessTokenFromCode, generateCodeVerifier, generateCodeChallenge } = require('../config/docusign');

exports.loginToDocuSign = (req, res) => {
  const { listingId } = req.query;
  if (!listingId) {
    return res.status(400).json({ message: 'Listing ID is required' });
  }
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  
  req.session.listingId = listingId;
  req.session.codeVerifier = codeVerifier;
  
  const oauthUrl = getOAuthLoginUrl(codeChallenge);
  res.json({ url: oauthUrl });
};

exports.docusignCallback = async (req, res) => {
  console.log('DocuSign callback:', req.query);
  const { code } = req.query;
  const { codeVerifier, listingId } = req.session;
  
  if (!code || !codeVerifier) {
    return res.status(400).json({ message: 'Authorization code or code verifier is missing' });
  }
  
  try {
    const accessToken = await getAccessTokenFromCode(code, codeVerifier);
    req.session.docusignAccessToken = accessToken;
    req.session.isDocuSignAuthenticated = true;
    
    // Clear the codeVerifier and listingId from the session
    delete req.session.codeVerifier;
    delete req.session.listingId;
    
    res.redirect(`${process.env.FRONTEND_URL}/mylisting/${listingId}?docusignConnected=true`);
  } catch (error) {
    console.error('Error during DocuSign authentication:', error);
    res.status(500).json({
      message: 'Error during DocuSign authentication',
      error: error.message,
    });
  }
};

exports.checkDocuSignStatus = (req, res) => {
  const isConnected = req.session.isDocuSignAuthenticated || false;
  res.json({ connected: isConnected });
};