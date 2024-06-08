// routes/users.js

const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');

router.get('/', UserController.getAllUsers);
router.get('/:id', UserController.getUserById);
router.post('/', UserController.createUser);
router.post('/login', UserController.loginUser); // Added login route
router.put('/:id', UserController.updateUser);
router.delete('/:id', UserController.deleteUser);

module.exports = router;

