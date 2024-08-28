// controllers/UserController.js

const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { uploadFile } = require('../config/aws');
const { validationResult } = require('express-validator');
const sanitizeHtml = require('sanitize-html');
const nodemailer = require('nodemailer');

const upload = multer({ storage: multer.memoryStorage() });

const transporter = nodemailer.createTransport({
  // Configure your email service here
});

exports.uploadPhoto = [
  upload.single('file'),
  async (req, res) => {
    const { id } = req.params;
    const { field } = req.body;

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
      console.error('Error uploading photo:', error);
      res.status(500).json({ message: 'Error uploading photo', error: error.message });
    }
  },
];

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching all users:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password').populate('listingPackages');
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getUserWithListingPackages = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password').populate('listingPackages');
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching user with listing packages:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getUserBuyerPackages = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password').populate('buyerPackages');
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user.buyerPackages);
  } catch (error) {
    console.error('Error fetching user buyer packages:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { firstName, lastName, email, password, role } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({
      firstName: sanitizeHtml(firstName),
      lastName: sanitizeHtml(lastName),
      email: sanitizeHtml(email.toLowerCase()),
      password: hashedPassword,
      role: sanitizeHtml(role),
      profilePhotoUrl: 'https://realoffer-bucket.s3.us-east-2.amazonaws.com/avatar.svg',
      isActive: false,
      emailConfirmed: false,
      // ... other fields ...
    });

    await user.save();

    const verificationToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: user.email,
      subject: 'Verify your email',
      html: `Please click this link to verify your email: <a href="${verificationUrl}">${verificationUrl}</a>`
    });

    res.status(201).json({ message: 'User created. Please check your email to verify your account.' });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateUser = async (req, res) => {
  const { firstName, lastName, email, role, ...otherDetails } = req.body;
  try {
    const updatedUser = await User.findByIdAndUpdate(req.params.id, {
      firstName: sanitizeHtml(firstName),
      lastName: sanitizeHtml(lastName),
      email: sanitizeHtml(email.toLowerCase()),
      role: sanitizeHtml(role),
      ...otherDetails
    }, { new: true, runValidators: true }).select('-password');
    
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(400).json({ message: 'Error updating user', error: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.loginUser = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (!user.emailConfirmed) {
      return res.status(400).json({ message: 'Please verify your email before logging in' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const payload = {
      user: {
        id: user.id,
        role: user.role
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '1h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
      }
    );

    user.lastLogin = new Date();
    await user.save();
  } catch (error) {
    console.error('Error logging in user:', error);
    next(error);
  }
};

exports.verifyEmail = async (req, res) => {
  const { token } = req.query;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.emailConfirmed = true;
    await user.save();

    res.status(200).json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Error verifying email:', error);
    res.status(400).json({ message: 'Invalid or expired token' });
  }
};