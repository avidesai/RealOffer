// routes/users.js

const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const authMiddleware = require('../middleware/auth'); // Import auth middleware

// Define all user-related routes here including login
router.get('/', UserController.getAllUsers);
router.get('/search', authMiddleware, UserController.searchUsers); // Add search route
router.get('/verify-token', authMiddleware, UserController.verifyToken); // Add this route before the :id route
router.post('/invite-team-member', authMiddleware, UserController.sendTeamMemberInvitation); // Add invitation route
router.post('/invite-listing-agent', authMiddleware, UserController.sendListingAgentInvitation); // Add listing agent invitation route
router.get('/:id', UserController.getUserById);
router.get('/:id/listingPackages', UserController.getUserWithListingPackages);
router.post('/', UserController.createUser);
router.post('/minimal', UserController.createMinimalUser); // Add minimal registration route (no auth required)
router.post('/complete-profile', authMiddleware, UserController.completeMinimalProfile); // Add complete profile route
router.post('/set-password', UserController.setPasswordForMinimalUser); // Add set password route (no auth required)
router.post('/login', UserController.loginUser);
router.post('/check-email', UserController.checkEmailExists);
router.post('/request-password-reset', UserController.requestPasswordReset);
router.post('/reset-password', UserController.resetPassword);
router.post('/:id/upload-photo', UserController.uploadPhoto);
router.post('/resend-verification', UserController.resendEmailVerification);

module.exports = router;
