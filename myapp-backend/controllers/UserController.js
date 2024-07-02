const User = require('../models/User');
const bcrypt = require('bcryptjs');

exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find();
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });
        res.status(200).json(user);
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
            profilePhotoUrl: 'https://realoffer-bucket.s3.us-east-2.amazonaws.com/avatar.svg',
            isActive: false,
            emailConfirmed: false,
            lastLogin: null,
            twoFactorAuthenticationEnabled: false,
            notificationSettings: '',
            phone: '',
            addressLine1: '',
            addressLine2: '',
            homepage: '',
            agentLicenseNumber: '',
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
            listingPackages: [],
            buyerPackages: []
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
        const user = await User.findOne({ email });
        if (user && await bcrypt.compare(password, user.password)) {
            res.status(200).json({ message: 'Login successful', user });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};
