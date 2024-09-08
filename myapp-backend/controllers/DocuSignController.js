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
  
  console.log('Session before save:', req.session);

  req.session.save((err) => {
    if (err) {
      console.error('Session save error:', err);
      return res.status(500).json({ message: 'Error saving session' });
    }
    console.log('Session after save:', req.session);
    const oauthUrl = getOAuthLoginUrl(codeChallenge);
    res.json({ url: oauthUrl });
  });
};

exports.docusignCallback = async (req, res) => {
  console.log('DocuSign callback received:', req.query);
  console.log('Session data in callback:', req.session);
  
  const { code } = req.query;
  const { codeVerifier, listingId } = req.session || {};

  if (!code) {
    return res.status(400).json({ message: 'Authorization code is missing' });
  }

  if (!codeVerifier) {
    console.error('Code verifier is missing from session', { sessionData: req.session });
    return res.status(400).json({ message: 'Code verifier is missing' });
  }

  try {
    const accessToken = await getAccessTokenFromCode(code, codeVerifier);
    req.session.docusignAccessToken = accessToken;
    req.session.isDocuSignAuthenticated = true;

    // Clear the codeVerifier from the session
    delete req.session.codeVerifier;

    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ message: 'Error saving session' });
      }
      // Redirect to the frontend
      res.redirect(`${process.env.FRONTEND_URL}/mylisting/${listingId}?docusignConnected=true`);
    });
  } catch (error) {
    console.error('Error during DocuSign authentication:', error);
    res.redirect(`${process.env.FRONTEND_URL}/mylisting/${listingId}?docusignError=true`);
  }
};

exports.checkDocuSignStatus = (req, res) => {
  const isConnected = req.session.isDocuSignAuthenticated || false;
  res.json({ connected: isConnected });
};