// routes/docusign.js

const express = require('express');
const router = express.Router();
const DocuSignController = require('../controllers/DocuSignController');
const { getOAuthLoginUrl, getAccessTokenFromCode } = require('../config/docusign');
const authMiddleware = require('../middleware/auth');

// Session middleware (express-session already configured in server.js)

// OAuth Login route
router.get('/login', (req, res) => {
  const oauthUrl = getOAuthLoginUrl();
  res.redirect(oauthUrl);
});

// OAuth Callback route
router.get('/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ message: 'Authorization code is missing' });
  }

  try {
    const accessToken = await getAccessTokenFromCode(code);
    req.session.docusignAccessToken = accessToken;
    req.session.isDocuSignAuthenticated = true;

    // Redirect back to the frontend, indicating that the user is now authenticated with DocuSign
    res.redirect(`${process.env.FRONTEND_URL}/dashboard?docusignConnected=true`);
  } catch (error) {
    console.error('Error during DocuSign authentication:', error);
    res.status(500).json({ message: 'Error during DocuSign authentication', error: error.message });
  }
});

// Middleware to check if user is authenticated with DocuSign
router.use((req, res, next) => {
  if (!req.session.isDocuSignAuthenticated) {
    return res.status(401).json({ message: 'You must log in to DocuSign first' });
  }
  next();
});

// Protect all DocuSign routes with authMiddleware
router.use(authMiddleware);

// Create a signing session
router.post('/create-signing-session', DocuSignController.createSigningSession);

// Handle DocuSign webhook
router.post('/webhook', DocuSignController.handleDocuSignWebhook);

// Get signing status
router.get('/status/:offerId', DocuSignController.getSigningStatus);

module.exports = router;
