// controllers/UserController.js

const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { uploadFile } = require('../config/aws');
const emailService = require('../utils/emailService');
const crypto = require('crypto'); // Added for team member invitation

const upload = multer({ storage: multer.memoryStorage() });

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

      const bucketName = process.env.AWS_BUCKET_NAME_PROFILE_PHOTOS; // Adjust this for different buckets if needed
      const photoUrl = await uploadFile(file, bucketName);

      const updatedUser = await User.findByIdAndUpdate(id, { [field]: photoUrl }, { new: true });
      res.status(200).json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: 'Error uploading photo', error: error.message });
    }
  },
];

exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find();
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.searchUsers = async (req, res) => {
    try {
        const { query } = req.query;
        
        if (!query || query.trim().length < 2) {
            return res.status(400).json({ message: 'Search query must be at least 2 characters long' });
        }

        const searchRegex = new RegExp(query.trim(), 'i');
        
        const users = await User.find({
            $or: [
                { firstName: searchRegex },
                { lastName: searchRegex },
                { email: searchRegex },
                { $expr: { $regexMatch: { input: { $concat: ['$firstName', ' ', '$lastName'] }, regex: searchRegex.source, options: 'i' } } }
            ],
            role: { $in: ['agent', 'admin', 'teamMember'] } // Return agents, admins, and team members
        })
        .select('firstName lastName email phone role agentLicenseNumber agencyName')
        .limit(10); // Limit results to prevent overwhelming the UI

        // If no users found, add an invite option
        if (users.length === 0) {
            // Check if the query looks like an email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const isEmail = emailRegex.test(query.trim());
            
            if (isEmail) {
                // Add invite option for email
                users.push({
                    _id: 'invite_' + Date.now(),
                    firstName: '',
                    lastName: query.trim(),
                    email: query.trim(),
                    isInvite: true,
                    inviteEmail: query.trim()
                });
            } else {
                // For name searches, try to extract potential email
                const potentialEmail = query.trim().toLowerCase().replace(/\s+/g, '.') + '@example.com';
                users.push({
                    _id: 'invite_' + Date.now(),
                    firstName: query.trim(),
                    lastName: '',
                    email: potentialEmail,
                    isInvite: true,
                    inviteEmail: potentialEmail
                });
            }
        }

        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).populate('listingPackages');
        if (!user) return res.status(404).json({ message: "User not found" });
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getUserWithListingPackages = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).populate('listingPackages');
        if (!user) return res.status(404).json({ message: "User not found" });
        res.status(200).json(user);
    } catch (error) {
        res.status500.json({ message: error.message });
    }
};

exports.createUser = async (req, res) => {
    const { firstName, lastName, email, password, role, agentLicenseNumber, hasAgent, invitationToken, phone } = req.body;
    
    try {
        // Validate required fields
        if (!firstName || !lastName || !email || !password || !role) {
            return res.status(400).json({ 
                message: 'Missing required fields: firstName, lastName, email, password, and role are required' 
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                message: 'Invalid email format' 
            });
        }

        // Validate password strength
        if (password.length < 6) {
            return res.status(400).json({ 
                message: 'Password must be at least 6 characters long' 
            });
        }

        // Validate role
        if (!['agent', 'buyer', 'seller', 'admin', 'teamMember'].includes(role)) {
            return res.status(400).json({ 
                message: 'Invalid role. Must be one of: agent, buyer, seller, admin, teamMember' 
            });
        }

        // Validate agent license number if role is agent
        if (role === 'agent' && (!agentLicenseNumber || agentLicenseNumber.trim() === '')) {
            return res.status(400).json({ 
                message: 'License number is required for real estate agents' 
            });
        }

        // Validate hasAgent field for buyers
        if (role === 'buyer' && hasAgent === undefined) {
            return res.status(400).json({ 
                message: 'Please indicate whether you have an agent or not' 
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(409).json({ 
                message: 'A user with this email address already exists' 
            });
        }

        // Set up trial period for new users (3 months)
        const trialStartDate = new Date();
        const trialEndDate = new Date(trialStartDate);
        trialEndDate.setMonth(trialEndDate.getMonth() + 3);

        const newUser = new User({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.toLowerCase().trim(),
            password,
            role,
            agentLicenseNumber: agentLicenseNumber ? agentLicenseNumber.trim() : '',
            hasAgent: role === 'buyer' ? hasAgent : null, // Only set hasAgent for buyers
            profilePhotoUrl: '',
            isActive: true, // Set to true so users can log in immediately
            emailConfirmed: true, // Set to true so users can log in immediately
            lastLogin: null,
            twoFactorAuthenticationEnabled: false,
            notificationSettings: '',
            phone: phone ? phone.trim() : '',
            brokeragePhoneNumber: '',
            addressLine1: '',
            addressLine2: '',
            homepage: '',
            brokerageLicenseNumber: '',
            agencyName: '',
            agencyWebsite: '',
            agencyImage: '',
            agencyAddressLine1: '',
            agencyAddressLine2: '',
            linkedIn: '',
            twitter: '',
            facebook: '',
            bio: '',
            isVerifiedAgent: false,
            receiveMarketingMaterials: false,
            isPremium: false,
            premiumPlan: '',
            // Set up trial period
            trialStartDate: trialStartDate,
            trialEndDate: trialEndDate,
            isOnTrial: true,
            templates: [],
            contacts: [],
            listingPackages: []
        });
        
        const savedUser = await newUser.save();
        
        // Handle invitation token if present
        if (invitationToken) {
            try {
                // Here you would typically validate the invitation token
                // and add the user to the appropriate listing/team
                // For now, we'll just log that an invitation was used
                console.log(`User ${savedUser.email} signed up with invitation token: ${invitationToken}`);
                
                // TODO: Implement invitation validation and team member assignment
                // This would involve:
                // 1. Validating the invitation token
                // 2. Finding the associated listing
                // 3. Adding the user as a team member to that listing
                
            } catch (invitationError) {
                console.error('Error handling invitation:', invitationError);
                // Don't fail the signup if invitation handling fails
            }
        }
        
        // Send welcome email to agents
        if (savedUser.role === 'agent') {
            try {
                const agentName = `${savedUser.firstName} ${savedUser.lastName}`;
                await emailService.sendAgentWelcomeEmail(savedUser.email, agentName);
                console.log(`Welcome email sent to agent: ${savedUser.email}`);
            } catch (emailError) {
                console.error('Error sending welcome email to agent:', emailError);
                // Don't fail the signup if email sending fails
            }
        }
        
        // Return user data without password and ensure consistent ID field
        const userResponse = {
            _id: savedUser._id,
            id: savedUser._id, // Include both for compatibility
            firstName: savedUser.firstName,
            lastName: savedUser.lastName,
            email: savedUser.email,
            role: savedUser.role,
            hasAgent: savedUser.hasAgent,
            isPremium: savedUser.isPremium,
            isOnTrial: savedUser.isOnTrial,
            trialStartDate: savedUser.trialStartDate,
            trialEndDate: savedUser.trialEndDate,
            createdAt: savedUser.createdAt
        };
        
        res.status(201).json({
            message: 'User created successfully.',
            user: userResponse
        });
    } catch (error) {
        console.error('Error creating user:', error);
        
        // Handle specific database errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({ 
                message: 'Invalid data provided for user creation',
                details: Object.values(error.errors).map(err => err.message)
            });
        }
        
        if (error.code === 11000) {
            return res.status(409).json({ 
                message: 'A user with this email address already exists' 
            });
        }
        
        res.status(500).json({ 
            message: 'Internal server error while creating user',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
        });
    }
};

exports.createMinimalUser = async (req, res) => {
    const { firstName, lastName, email, phone } = req.body;
    
    try {
        // Validate required fields (phone is now optional)
        if (!firstName || !lastName || !email) {
            return res.status(400).json({ 
                message: 'Missing required fields: firstName, lastName, and email are required' 
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                message: 'Invalid email format' 
            });
        }

        // Validate phone number format only if provided
        if (phone && phone.trim()) {
            const phoneRegex = /^[+]?[1-9][\d]{0,15}$/;
            const cleanPhone = phone.replace(/[\s\-()]/g, '');
            if (!phoneRegex.test(cleanPhone)) {
                return res.status(400).json({ 
                    message: 'Please enter a valid phone number' 
                });
            }
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(409).json({ 
                message: 'A user with this email address already exists' 
            });
        }

        // Generate a temporary password for minimal registration
        const tempPassword = emailService.generateTemporaryPassword();
        
        // Create new user with minimal registration
        const user = new User({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.toLowerCase().trim(),
          phone: phone ? phone.trim() : '', // Make phone optional
          password: tempPassword, // Will be hashed by pre-save hook
          role: 'buyer',
          isMinimalRegistration: true,
          tempPassword: tempPassword,
          registrationSource: 'minimal',
          isActive: true,
          emailConfirmed: true,
          isOnTrial: true,
          trialStartDate: new Date(),
          trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days
        });

        const savedUser = await user.save();
        
        // Send welcome email with credentials (non-blocking)
        emailService.sendMinimalUserWelcome(
          savedUser.email,
          savedUser.firstName,
          tempPassword
        ).catch(error => {
          console.error('Failed to send minimal user welcome email:', error);
        });
        
        // Generate JWT token for immediate access
        const payload = {
            user: {
                id: savedUser._id,
                email: savedUser.email,
                firstName: savedUser.firstName,
                lastName: savedUser.lastName,
                role: savedUser.role
            }
        };
        
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '3h' });
        
        // Return user data without password and ensure consistent ID field
        const userResponse = {
            _id: savedUser._id,
            id: savedUser._id, // Include both for compatibility
            firstName: savedUser.firstName,
            lastName: savedUser.lastName,
            email: savedUser.email,
            role: savedUser.role,
            phone: savedUser.phone,
            isMinimalRegistration: savedUser.isMinimalRegistration,
            isPremium: savedUser.isPremium,
            isOnTrial: savedUser.isOnTrial,
            trialStartDate: savedUser.trialStartDate,
            trialEndDate: savedUser.trialEndDate,
            createdAt: savedUser.createdAt
        };
        
        res.status(201).json({
            message: 'Minimal user created successfully.',
            user: userResponse,
            token
        });
    } catch (error) {
        console.error('Error creating minimal user:', error);
        
        // Handle specific database errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({ 
                message: 'Invalid data provided for user creation',
                details: Object.values(error.errors).map(err => err.message)
            });
        }
        
        if (error.code === 11000) {
            return res.status(409).json({ 
                message: 'A user with this email address already exists' 
            });
        }
        
        res.status(500).json({ 
            message: 'Internal server error while creating user',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
        });
    }
};

exports.completeMinimalProfile = async (req, res) => {
    const { password, hasAgent } = req.body;
    const userId = req.user.id;
    
    try {
        // Find the user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ 
                message: 'User not found' 
            });
        }

        // Check if user is a minimal registration user
        if (!user.isMinimalRegistration) {
            return res.status(400).json({ 
                message: 'This user is not a minimal registration user' 
            });
        }

        // Validate password
        if (!password || password.length < 6) {
            return res.status(400).json({ 
                message: 'Password must be at least 6 characters long' 
            });
        }

        // Update user profile
        user.password = password;
        user.isMinimalRegistration = false;
        user.hasAgent = hasAgent;
        user.tempPassword = undefined; // Clear temporary password
        user.registrationSource = 'full'; // Update registration source

        await user.save();
        
        res.status(200).json({
            message: 'Profile completed successfully',
            user: {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                hasAgent: user.hasAgent,
                isMinimalRegistration: user.isMinimalRegistration
            }
        });
    } catch (error) {
        console.error('Error completing minimal profile:', error);
        res.status(500).json({ 
            message: 'Internal server error while completing profile',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
        });
    }
};

exports.updateUser = async (req, res) => {
    const { firstName, lastName, email, role, ...otherDetails } = req.body;
    try {
        // If email is being updated, check for uniqueness
        if (email) {
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ 
                    message: 'Invalid email format' 
                });
            }

            // Check if email already exists for a different user
            const existingUser = await User.findOne({ 
                email: email.toLowerCase(),
                _id: { $ne: req.params.id } // Exclude current user
            });
            
            if (existingUser) {
                return res.status(409).json({ 
                    message: 'An account with this email address already exists' 
                });
            }
        }

        const updatedUser = await User.findByIdAndUpdate(req.params.id, {
            firstName,
            lastName,
            email: email ? email.toLowerCase() : undefined,
            role,
            ...otherDetails
        }, { new: true });
        
        res.status(200).json(updatedUser);
    } catch (error) {
        console.error('Error updating user:', error);
        
        // Handle specific database errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({ 
                message: 'Invalid data provided for user update',
                details: Object.values(error.errors).map(err => err.message)
            });
        }
        
        if (error.code === 11000) {
            return res.status(409).json({ 
                message: 'An account with this email address already exists' 
            });
        }
        
        res.status(500).json({ 
            message: 'Internal server error while updating user',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
        });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "User deleted" });
    } catch (error) {
        res.status(404).json({ message: "User not found" });
    }
};

exports.loginUser = async (req, res) => {
    const { email, password } = req.body;
    
    try {
        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({ 
                message: 'Email and password are required' 
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                message: 'Invalid email format' 
            });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        
        if (!user) {
            return res.status(401).json({ 
                message: 'Invalid email or password' 
            });
        }

        // Check if user is a minimal registration user
        if (user.isMinimalRegistration) {
            // For minimal users, check if they're trying to use their temp password
            if (user.tempPassword && password === user.tempPassword) {
                // They're using the temp password, prompt them to set a real password
                return res.status(401).json({ 
                    message: 'Please set a password for your account',
                    requiresPasswordSetup: true,
                    email: user.email
                });
            }
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            return res.status(401).json({ 
                message: 'Invalid email or password' 
            });
        }

        // Email verification check removed for now
        // if (!user.emailConfirmed) {
        //     return res.status(401).json({ 
        //         message: 'Please verify your email address before logging in. Check your inbox for a verification link.',
        //         emailNotVerified: true
        //     });
        // }

        const payload = {
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role
            }
        };
        
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '3h' });
        
        // Update last login
        user.lastLogin = new Date();
        await user.save();
        
        // Return user data with consistent ID field
        const userResponse = {
            _id: user._id,
            id: user._id, // Include both for compatibility
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            isMinimalRegistration: user.isMinimalRegistration,
            isPremium: user.isPremium,
            isOnTrial: user.isOnTrial,
            trialStartDate: user.trialStartDate,
            trialEndDate: user.trialEndDate,
            lastLogin: user.lastLogin
        };
        
        res.status(200).json({ 
            message: 'Login successful', 
            user: userResponse,
            token 
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            message: 'Server error during login',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
        });
    }
};

  // In UserController.js
exports.checkEmailExists = async (req, res) => {
  const { email } = req.body;
  
  try {
    // Validate email parameter
    if (!email) {
      return res.status(400).json({ 
        message: 'Email parameter is required' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        message: 'Invalid email format' 
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    
    res.status(200).json({ 
      exists: !!user,
      message: user ? 'User found' : 'User not found',
      user: user ? {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isMinimalRegistration: user.isMinimalRegistration,
        isPremium: user.isPremium,
        isOnTrial: user.isOnTrial
      } : null
    });
  } catch (error) {
    console.error('Error checking email existence:', error);
    res.status(500).json({ 
      message: 'Server error while checking email',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
    });
  }
};

// Add verifyToken function
exports.verifyToken = async (req, res) => {
  try {
    // The auth middleware already verified the token
    // Just return success with the user data from the token
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json({ 
      valid: true, 
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isPremium: user.isPremium,
        isOnTrial: user.isOnTrial,
        trialStartDate: user.trialStartDate,
        trialEndDate: user.trialEndDate
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Add logout function to clear DocuSign tokens
exports.logout = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Clear DocuSign tokens and related data
    user.docusignAccessToken = undefined;
    user.docusignRefreshToken = undefined;
    user.docusignTokenExpiry = undefined;
    user.docusignAccountId = undefined;
    user.docusignUserId = undefined;
    
    await user.save();
    
    console.log('User logged out and DocuSign tokens cleared for user:', userId);
    
    res.status(200).json({ 
      message: 'Logout successful',
      docusignDisconnected: true
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      message: 'Server error during logout',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
    });
  }
};

// Delete user account and cancel Stripe subscription
exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Cancel Stripe subscription if user has one
    if (user.stripeSubscriptionId) {
      try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        await stripe.subscriptions.cancel(user.stripeSubscriptionId);
        console.log(`Stripe subscription ${user.stripeSubscriptionId} cancelled for user ${userId}`);
      } catch (stripeError) {
        console.error('Error cancelling Stripe subscription:', stripeError);
        // Continue with account deletion even if Stripe cancellation fails
      }
    }

    // Delete all buyer packages for this user
    const BuyerPackage = require('../models/BuyerPackage');
    await BuyerPackage.deleteMany({ user: userId });
    console.log(`Deleted buyer packages for user ${userId}`);

    // Delete all activities for this user
    const Activity = require('../models/Activity');
    await Activity.deleteMany({ user: userId });
    console.log(`Deleted activities for user ${userId}`);

    // Delete the user account
    await User.findByIdAndDelete(userId);
    console.log(`User account ${userId} deleted`);

    res.status(200).json({ 
      message: 'Account deleted successfully',
      subscriptionCancelled: !!user.stripeSubscriptionId
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ 
      message: 'Server error during account deletion',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
    });
  }
};

// Email verification endpoint
exports.verifyEmail = async (req, res) => {
  const { token } = req.params;
  
  try {
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ 
        message: 'Invalid or expired verification token' 
      });
    }
    
    // Update user to verified
    user.emailConfirmed = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    user.isActive = true;
    
    await user.save();
    
    res.status(200).json({ 
      message: 'Email verified successfully. You can now log in to your account.' 
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ 
      message: 'Server error during email verification',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
    });
  }
};

// Request password reset
exports.requestPasswordReset = async (req, res) => {
  const { email } = req.body;
  
  try {
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      // Don't reveal if user exists or not for security
      return res.status(200).json({ 
        message: 'If an account with this email exists, a password reset link has been sent.' 
      });
    }
    
    // Check if this is a minimal user who hasn't set a password yet
    if (user.isMinimalRegistration && !user.password) {
      return res.status(200).json({ 
        message: 'This account was created with minimal registration and doesn\'t have a password set yet. Please use the "Set Password" option on the login page instead.',
        isMinimalUser: true
      });
    }
    
    // Generate password reset token
    const passwordResetToken = emailService.generatePasswordResetToken();
    const passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    
    user.passwordResetToken = passwordResetToken;
    user.passwordResetExpires = passwordResetExpires;
    await user.save();
    
    // Send password reset email (non-blocking)
    try {
      await emailService.sendPasswordReset(user.email, passwordResetToken, user.firstName);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      // Don't block the user - they can still reset their password manually
      // The token is saved and valid, they just won't get the email
    }
    
    res.status(200).json({ 
      message: 'If an account with this email exists, a password reset link has been sent.' 
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ 
      message: 'Server error during password reset request',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
    });
  }
};

// Reset password with token
exports.resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  
  try {
    if (!token || !newPassword) {
      return res.status(400).json({ 
        message: 'Token and new password are required' 
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        message: 'Password must be at least 6 characters long' 
      });
    }
    
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ 
        message: 'Invalid or expired reset token' 
      });
    }
    
    // Update password and clear reset token
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    
    await user.save();
    
    res.status(200).json({ 
      message: 'Password reset successfully. You can now log in with your new password.' 
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ 
      message: 'Server error during password reset',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
    });
  }
};

// Resend email verification
exports.resendEmailVerification = async (req, res) => {
  const { email } = req.body;
  
  try {
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.emailConfirmed) {
      return res.status(400).json({ message: 'Email is already verified' });
    }
    
    // Generate new verification token
    const emailVerificationToken = emailService.generateEmailVerificationToken();
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    user.emailVerificationToken = emailVerificationToken;
    user.emailVerificationExpires = emailVerificationExpires;
    await user.save();
    
    // Send new verification email (non-blocking)
    try {
      await emailService.sendEmailVerification(user.email, emailVerificationToken, user.firstName);
    } catch (emailError) {
      console.error('Failed to send email verification:', emailError);
      // Don't block the user - the token is saved and valid
      // They can still verify manually or request a new one
    }
    
    res.status(200).json({ 
      message: 'Verification email sent successfully. Please check your inbox.' 
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ 
      message: 'Server error during email verification resend',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
    });
  }
};

exports.sendTeamMemberInvitation = async (req, res) => {
    try {
        const { email, firstName, lastName, listingId, propertyAddress, inviterName, message } = req.body;
        
        console.log('Team member invitation request:', {
            email,
            firstName,
            lastName,
            listingId,
            propertyAddress,
            inviterName,
            message
        });
        
        // Validate required fields
        if (!email || !listingId || !propertyAddress || !inviterName) {
            return res.status(400).json({ 
                message: 'Missing required fields: email, listingId, propertyAddress, and inviterName are required' 
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                message: 'Invalid email format' 
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            // For team member invitations, we can invite existing users
            // Just add them to the team instead of creating a new account
            console.log('Existing user found for team member invitation:', existingUser.email);
            
            // Add the existing user to the listing's team members
            const PropertyListing = require('../models/PropertyListing');
            const listing = await PropertyListing.findById(listingId);
            if (!listing) {
                return res.status(404).json({ 
                    message: 'Listing not found' 
                });
            }
            
            // Check if user is already a team member
            const currentTeamMemberIds = listing.teamMemberIds || [];
            if (currentTeamMemberIds.some(id => id.toString() === existingUser._id.toString())) {
                return res.status(409).json({ 
                    message: 'This user is already a team member for this listing' 
                });
            }
            
            // Add user to team members
            const updatedTeamMemberIds = [...currentTeamMemberIds, existingUser._id];
            await PropertyListing.findByIdAndUpdate(listingId, {
                teamMemberIds: updatedTeamMemberIds
            });
            
            // Send notification email to existing user (non-blocking)
            emailService.sendTeamMemberAddedNotification(
                existingUser.email,
                `${existingUser.firstName} ${existingUser.lastName}`,
                propertyAddress,
                inviterName
            ).catch(error => {
                console.error('Failed to send team member notification email:', error);
            });
            
            res.status(200).json({ 
                message: 'Existing user added to team successfully',
                email: email,
                userExists: true
            });
            return;
        }

        // Get the listing to access its publicUrl
        const PropertyListing = require('../models/PropertyListing');
        const listing = await PropertyListing.findById(listingId);
        if (!listing) {
            return res.status(404).json({ 
                message: 'Listing not found' 
            });
        }

        if (!listing.publicUrl) {
            return res.status(400).json({ 
                message: 'Listing does not have a public URL' 
            });
        }

        // Extract the token from the publicUrl
        const publicUrlToken = listing.publicUrl.split('/').pop();
        
        // Send invitation email (non-blocking)
        emailService.sendTeamMemberInvitation(
            email,
            firstName || 'Team Member',
            lastName || '',
            inviterName,
            propertyAddress,
            publicUrlToken,
            listingId,
            message || ''
        ).catch(error => {
            console.error('Failed to send team member invitation email:', error);
        });

        res.status(200).json({ 
            message: 'Team member invitation sent successfully',
            email: email
        });
    } catch (error) {
        console.error('Error sending team member invitation:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.sendListingAgentInvitation = async (req, res) => {
    try {
        const { email, firstName, lastName, listingId, propertyAddress, inviterName, message } = req.body;
        
        console.log('Listing agent invitation request:', {
            email,
            firstName,
            lastName,
            listingId,
            propertyAddress,
            inviterName,
            message
        });
        
        // Validate required fields
        if (!email || !listingId || !propertyAddress || !inviterName) {
            return res.status(400).json({ 
                message: 'Missing required fields: email, listingId, propertyAddress, and inviterName are required' 
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                message: 'Invalid email format' 
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            // For listing agent invitations, we can invite existing users
            // Just add them to the listing agents instead of creating a new account
            console.log('Existing user found for listing agent invitation:', existingUser.email);
            
            // Add the existing user to the listing's agents
            const PropertyListing = require('../models/PropertyListing');
            const listing = await PropertyListing.findById(listingId);
            if (!listing) {
                return res.status(404).json({ 
                    message: 'Listing not found' 
                });
            }
            
            // Check if user is already an agent
            const currentAgentIds = listing.agentIds || [];
            if (currentAgentIds.some(id => id.toString() === existingUser._id.toString())) {
                return res.status(409).json({ 
                    message: 'This user is already a listing agent for this listing' 
                });
            }
            
            // Check if we're at the maximum agent limit (2 agents)
            if (currentAgentIds.length >= 2) {
                return res.status(400).json({ 
                    message: 'Maximum of 2 listing agents allowed. Please remove an existing agent first.' 
                });
            }
            
            // Add user to agents
            const updatedAgentIds = [...currentAgentIds, existingUser._id];
            await PropertyListing.findByIdAndUpdate(listingId, {
                agentIds: updatedAgentIds
            });
            
            // Send notification email to existing user
            const emailResult = await emailService.sendListingAgentAddedNotification(
                existingUser.email,
                `${existingUser.firstName} ${existingUser.lastName}`,
                propertyAddress,
                inviterName
            );
            
            res.status(200).json({ 
                message: 'Existing user added as listing agent successfully',
                email: email,
                userExists: true
            });
            return;
        }

        // Get the listing to access its publicUrl
        const PropertyListing = require('../models/PropertyListing');
        const listing = await PropertyListing.findById(listingId);
        if (!listing) {
            return res.status(404).json({ 
                message: 'Listing not found' 
            });
        }

        if (!listing.publicUrl) {
            return res.status(400).json({ 
                message: 'Listing does not have a public URL' 
            });
        }

        // Extract the token from the publicUrl
        const publicUrlToken = listing.publicUrl.split('/').pop();
        
        // Send invitation email (non-blocking)
        emailService.sendListingAgentInvitation(
            email,
            firstName || 'Listing Agent',
            lastName || '',
            inviterName,
            propertyAddress,
            publicUrlToken,
            listingId,
            message || ''
        ).catch(error => {
            console.error('Failed to send listing agent invitation email:', error);
        });

        res.status(200).json({ 
            message: 'Listing agent invitation sent successfully',
            email: email
        });
    } catch (error) {
        console.error('Error sending listing agent invitation:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.setPasswordForMinimalUser = async (req, res) => {
    const { email, password } = req.body;
    
    try {
        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({ 
                message: 'Email and password are required' 
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                message: 'Invalid email format' 
            });
        }

        // Validate password strength
        if (password.length < 6) {
            return res.status(400).json({ 
                message: 'Password must be at least 6 characters long' 
            });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        
        if (!user) {
            return res.status(404).json({ 
                message: 'User not found' 
            });
        }

        // Check if user is a minimal registration user
        if (!user.isMinimalRegistration) {
            return res.status(400).json({ 
                message: 'This user is not a minimal registration user' 
            });
        }

        // Update user password and remove minimal registration status
        user.password = password;
        user.isMinimalRegistration = false;
        user.tempPassword = undefined; // Clear temporary password
        user.registrationSource = 'full'; // Update registration source

        await user.save();
        
        // Generate JWT token for immediate login
        const payload = {
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role
            }
        };
        
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '3h' });
        
        res.status(200).json({
            message: 'Password set successfully. You are now logged in.',
            user: {
                _id: user._id,
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                isMinimalRegistration: user.isMinimalRegistration,
                isPremium: user.isPremium,
                isOnTrial: user.isOnTrial,
                trialStartDate: user.trialStartDate,
                trialEndDate: user.trialEndDate
            },
            token
        });
    } catch (error) {
        console.error('Error setting password for minimal user:', error);
        res.status(500).json({ 
            message: 'Internal server error while setting password',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
        });
    }
};