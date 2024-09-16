// controllers/DocuSignController.js

const {
  getOAuthLoginUrl,
  getAccessTokenFromCode,
  generateCodeVerifier,
  generateCodeChallenge,
} = require('../config/docusign');

// Initiate DocuSign login
exports.loginToDocuSign = (req, res) => {
  const { listingId } = req.query;
  if (!listingId) {
    console.error('Listing ID is missing in request query.');
    return res.status(400).json({ message: 'Listing ID is required' });
  }

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  // Store codeVerifier in an HTTP-only, secure cookie
  res.cookie('codeVerifier', codeVerifier, {
    httpOnly: true,
    secure: true,
    sameSite: 'None',
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  // Include listingId in the state parameter
  const state = listingId;

  console.log('--- DocuSign Login Start ---');
  console.log('Code Verifier generated and stored in cookie:', codeVerifier);
  console.log('Listing ID included in state parameter:', state);

  const oauthUrl = getOAuthLoginUrl(codeChallenge, state);
  console.log('Redirecting user to DocuSign OAuth URL:', oauthUrl);

  // Redirect the user to DocuSign
  res.redirect(oauthUrl);
};

// Handle DocuSign OAuth callback
exports.docusignCallback = async (req, res) => {
  console.log('--- DocuSign Callback Start ---');
  console.log('DocuSign callback received:', req.query);
  console.log('Cookies received in callback:', req.cookies);

  const { code, state } = req.query;
  const codeVerifier = req.cookies.codeVerifier;
  const listingId = state; // Retrieve listingId from the state parameter

  console.log('Authorization code from query:', code);
  console.log('State (listingId) from query:', listingId);
  console.log('Code Verifier from cookie:', codeVerifier);

  if (!code) {
    console.error('Authorization code is missing in the callback query parameters.');
    return res.redirect(`${process.env.FRONTEND_URL}/mylisting/${listingId}?docusignError=true`);
  }

  if (!codeVerifier) {
    console.error('Code verifier is missing from cookies', { cookies: req.cookies });
    return res.redirect(`${process.env.FRONTEND_URL}/mylisting/${listingId}?docusignError=true`);
  }

  try {
    const accessToken = await getAccessTokenFromCode(code, codeVerifier);
    req.session.docusignAccessToken = accessToken;
    req.session.isDocuSignAuthenticated = true;

    // Clear the codeVerifier from the cookies
    res.clearCookie('codeVerifier', {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      domain: '.realoffer.io',
    });

    console.log('DocuSign Access Token obtained and stored in session.');
    console.log('Session Data after storing access token:', req.session);

    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.redirect(`${process.env.FRONTEND_URL}/mylisting/${listingId}?docusignError=true`);
      }
      console.log('Session after saving:', req.session);

      // Redirect to the frontend
      const redirectUrl = `${process.env.FRONTEND_URL}/mylisting/${listingId}?docusignConnected=true`;
      console.log('Redirecting user to:', redirectUrl);
      res.redirect(redirectUrl);
    });
  } catch (error) {
    console.error('Error during DocuSign authentication:', error);
    const redirectUrl = `${process.env.FRONTEND_URL}/mylisting/${listingId}?docusignError=true`;
    console.log('Redirecting user to error page:', redirectUrl);
    res.redirect(redirectUrl);
  }
};

// Check DocuSign connection status
exports.checkDocuSignStatus = (req, res) => {
  console.log('--- Check DocuSign Status ---');
  console.log('Session Data:', req.session);
  const isConnected = req.session.isDocuSignAuthenticated || false;
  res.json({ connected: isConnected });
};
