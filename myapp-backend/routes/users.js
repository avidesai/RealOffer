// routes/users.js

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const UserController = require('../controllers/UserController');

// Define all user-related routes here including login
router.get('/', UserController.getAllUsers);
router.get('/:id', UserController.getUserById);
router.get('/:id/listingPackages', UserController.getUserWithListingPackages);
router.post('/', UserController.createUser);
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User does not exist' });
    } else if (await bcrypt.compare(password, user.password)) {
      res.status(200).json({ message: 'Login successful', user });
    } else {
      return res.status(401).json({ message: 'Incorrect password, try again' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});
router.put('/:id', UserController.updateUser);
router.delete('/:id', UserController.deleteUser);

module.exports = router;
