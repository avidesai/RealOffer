// controllers/DocuSignController.js

const { getOAuthLoginUrl, getAccessTokenFromCode } = require('../config/docusign');

exports.loginToDocuSign = (req, res) => {
  const oauthUrl = getOAuthLoginUrl();
  console.log('OAuth URL:', oauthUrl); // Add this line for debugging
  res.redirect(oauthUrl);
};

exports.docusignCallback = async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).json({ message: 'Authorization code is missing' });
  }

  try {
    const accessToken = await getAccessTokenFromCode(code);
    req.session.docusignAccessToken = accessToken;
    req.session.isDocuSignAuthenticated = true;
    
    // Redirect back to the frontend after authentication
    res.redirect(`${process.env.FRONTEND_URL}/mylisting/${req.session.listingId}?docusignConnected=true`);
  } catch (error) {
    console.error('Error during DocuSign authentication:', error);
    res.status(500).json({ message: 'Error during DocuSign authentication', error: error.message });
  }
};

exports.checkDocuSignStatus = (req, res) => {
  const isConnected = req.session.isDocuSignAuthenticated || false;
  res.json({ connected: isConnected });
};