// routes/users.js

const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');

// Define all user-related routes here including login
router.get('/', UserController.getAllUsers);
router.get('/:id', UserController.getUserById);
router.get('/:id/listingPackages', UserController.getUserWithListingPackages);
router.get('/:id/buyerPackages', UserController.getUserBuyerPackages);
router.post('/', UserController.createUser);
router.post('/login', UserController.loginUser);
router.post('/check-email', UserController.checkEmailExists); // New route for checking email
router.put('/:id', UserController.updateUser);
router.put('/:id/upload-photo', UserController.uploadPhoto);
router.delete('/:id', UserController.deleteUser);

module.exports = router;
