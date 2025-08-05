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
    const { firstName, lastName, email, password, role, agentLicenseNumber, hasAgent, invitationToken } = req.body;
    
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
            phone: '',
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

exports.updateUser = async (req, res) => {
    const { firstName, lastName, email, role, ...otherDetails } = req.body;
    try {
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
        
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
        
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
            isPremium: user.isPremium,
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
      message: user ? 'User found' : 'User not found'
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
        isPremium: user.isPremium
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
    
    // Generate password reset token
    const passwordResetToken = emailService.generatePasswordResetToken();
    const passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    
    user.passwordResetToken = passwordResetToken;
    user.passwordResetExpires = passwordResetExpires;
    await user.save();
    
    // Send password reset email
    try {
      await emailService.sendPasswordReset(user.email, passwordResetToken, user.firstName);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      return res.status(500).json({ 
        message: 'Failed to send password reset email. Please try again later.' 
      });
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
    
    // Send new verification email
    try {
      await emailService.sendEmailVerification(user.email, emailVerificationToken, user.firstName);
    } catch (emailError) {
      console.error('Failed to send email verification:', emailError);
      return res.status(500).json({ 
        message: 'Failed to send verification email. Please try again later.' 
      });
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
        const { email, firstName, lastName, listingId, propertyAddress, inviterName } = req.body;
        
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
            return res.status(409).json({ 
                message: 'A user with this email address already exists' 
            });
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
        
        // Send invitation email
        const emailResult = await emailService.sendTeamMemberInvitation(
            email,
            firstName || 'Team Member',
            lastName || '',
            inviterName,
            propertyAddress,
            publicUrlToken,
            listingId
        );

        if (emailResult.success) {
            res.status(200).json({ 
                message: 'Team member invitation sent successfully',
                email: email
            });
        } else {
            res.status(500).json({ 
                message: 'Failed to send invitation email',
                error: emailResult.error 
            });
        }
    } catch (error) {
        console.error('Error sending team member invitation:', error);
        res.status(500).json({ message: error.message });
    }
};