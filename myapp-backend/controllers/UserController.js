// controllers/UserController.js

const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { uploadFile } = require('../config/aws');

const upload = multer({ storage: multer.memoryStorage() });

exports.uploadPhoto = [
  upload.single('file'),
  async (req, res) => {
    const { id } = req.params;
    const { field } = req.body;

    // Check if the user is updating their own photo or if they're an admin
    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this user\'s photo' });
    }

    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: 'No file provided' });
      }

      const bucketName = process.env.AWS_BUCKET_NAME_PROFILE_PHOTOS;
      const photoUrl = await uploadFile(file, bucketName);

      const updatedUser = await User.findByIdAndUpdate(id, { [field]: photoUrl }, { new: true });
      res.status(200).json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: 'Error uploading photo', error: error.message });
    }
  },
];

exports.getAllUsers = async (req, res) => {
    // Only allow admin users to get all users
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view all users' });
    }
    try {
        const users = await User.find();
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).populate('listingPackages');
        if (!user) return res.status(404).json({ message: "User not found" });
        // Only allow users to view their own data or admin to view any user's data
        if (req.user.id !== req.params.id && req.user.role !== 'admin') {
          return res.status(403).json({ message: 'Not authorized to view this user\'s data' });
        }
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getUserWithListingPackages = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).populate('listingPackages');
        if (!user) return res.status(404).json({ message: "User not found" });
        // Only allow users to view their own data or admin to view any user's data
        if (req.user.id !== req.params.id && req.user.role !== 'admin') {
          return res.status(403).json({ message: 'Not authorized to view this user\'s data' });
        }
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getUserBuyerPackages = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).populate('buyerPackages');
        if (!user) return res.status(404).json({ message: "User not found" });
        // Only allow users to view their own data or admin to view any user's data
        if (req.user.id !== req.params.id && req.user.role !== 'admin') {
          return res.status(403).json({ message: 'Not authorized to view this user\'s data' });
        }
        res.status(200).json(user.buyerPackages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createUser = async (req, res) => {
    const { firstName, lastName, email, password, role } = req.body;
    try {
        const newUser = new User({
            firstName,
            lastName,
            email,
            password,
            role,
            // ... (rest of the user properties)
        });
        const savedUser = await newUser.save();
        res.status(201).json(savedUser);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.updateUser = async (req, res) => {
    const { firstName, lastName, email, role, ...otherDetails } = req.body;
    try {
        // Only allow users to update their own data or admin to update any user's data
        if (req.user.id !== req.params.id && req.user.role !== 'admin') {
          return res.status(403).json({ message: 'Not authorized to update this user\'s data' });
        }
        const updatedUser = await User.findByIdAndUpdate(req.params.id, {
            firstName,
            lastName,
            email,
            role,
            ...otherDetails
        }, { new: true });
        res.status(200).json(updatedUser);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        // Only allow admin to delete users
        if (req.user.role !== 'admin') {
          return res.status(403).json({ message: 'Not authorized to delete users' });
        }
        await User.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "User deleted" });
    } catch (error) {
        res.status(404).json({ message: "User not found" });
    }
};

exports.loginUser = async (req, res) => {
    const { email, password } = req.body;
    try {
      const user = await User.findOne({ email });
      if (user && await bcrypt.compare(password, user.password)) {
        const payload = {
          user: {
            id: user._id,
            email: user.email,
            role: user.role
          }
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({ 
          message: 'Login successful', 
          user: {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role
          },
          token 
        });
      } else {
        res.status(401).json({ message: 'Invalid credentials' });
      }
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
};