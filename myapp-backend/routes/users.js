// routes/users.js

const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const authMiddleware = require('../middleware/auth'); // Import auth middleware

// Define all user-related routes here including login
router.get('/', UserController.getAllUsers);
router.get('/verify-token', authMiddleware, UserController.verifyToken); // Add this route before the :id route
router.get('/:id', UserController.getUserById);
router.get('/:id/listingPackages', UserController.getUserWithListingPackages);
router.post('/', UserController.createUser);
router.post('/login', UserController.loginUser);
router.post('/logout', authMiddleware, UserController.logout); // Add logout route
router.post('/check-email', UserController.checkEmailExists); // New route for checking email
router.put('/:id', UserController.updateUser);
router.put('/:id/upload-photo', UserController.uploadPhoto);
router.delete('/:id', UserController.deleteUser);

// Email verification and password reset routes
router.get('/verify-email/:token', UserController.verifyEmail);
router.post('/request-password-reset', UserController.requestPasswordReset);
router.post('/reset-password', UserController.resetPassword);
router.post('/resend-verification', UserController.resendEmailVerification);

module.exports = router;
