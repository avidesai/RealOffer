// controllers/DocuSignController.js

const { getOAuthLoginUrl, getAccessTokenFromCode } = require('../config/docusign');

exports.loginToDocuSign = (req, res) => {
  const { listingId } = req.query;
  if (!listingId) {
    return res.status(400).json({ message: 'Listing ID is required' });
  }

  // Save the listingId in the session
  req.session.listingId = listingId;

  const oauthUrl = getOAuthLoginUrl();
  res.redirect(oauthUrl);
};

exports.docusignCallback = async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).json({ message: 'Authorization code is missing' });
  }

  try {
    const accessToken = await getAccessTokenFromCode(code);
    if (!accessToken) {
      throw new Error('Failed to retrieve access token');
    }

    req.session.docusignAccessToken = accessToken;
    req.session.isDocuSignAuthenticated = true;

    // Retrieve the listingId from the session and redirect the user
    const listingId = req.session.listingId;
    if (!listingId) {
      throw new Error('Listing ID not found in session');
    }

    // Clear the listingId from the session
    req.session.listingId = null;

    // Redirect back to the listing page
    res.redirect(`${process.env.FRONTEND_URL}/mylisting/${listingId}?docusignConnected=true`);
  } catch (error) {
    console.error('Error during DocuSign authentication:', error);
    res.status(500).json({
      message: 'Error during DocuSign authentication',
      error: error.message,
      stack: error.stack
    });
  }
};

exports.checkDocuSignStatus = (req, res) => {
  const isConnected = req.session.isDocuSignAuthenticated || false;
  res.json({ connected: isConnected });
};
