// routes/users.js

const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const authMiddleware = require('../middleware/auth');

// Public routes
router.post('/', UserController.createUser);
router.post('/login', UserController.loginUser);

// Protected routes
router.use(authMiddleware);
router.get('/', UserController.getAllUsers);
router.get('/:id', UserController.getUserById);
router.get('/:id/listingPackages', UserController.getUserWithListingPackages);
router.get('/:id/buyerPackages', UserController.getUserBuyerPackages);
router.put('/:id', UserController.updateUser);
router.put('/:id/upload-photo', UserController.uploadPhoto);
router.delete('/:id', UserController.deleteUser);

module.exports = router;