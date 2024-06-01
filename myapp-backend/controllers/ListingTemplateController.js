const ListingTemplate = require('../models/ListingTemplate');

exports.getAllTemplates = async (req, res) => {
    try {
        const templates = await ListingTemplate.find({ templateOwnerId: req.user.id }); // Assuming user id from req.user
        res.status(200).json(templates);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getTemplateById = async (req, res) => {
    try {
        const template = await ListingTemplate.findById(req.params.id);
        if (!template) return res.status(404).json({ message: "Template not found" });
        res.status(200).json(template);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createTemplate = async (req, res) => {
    const newTemplate = new ListingTemplate({ ...req.body, templateOwnerId: req.user.id });
    try {
        const savedTemplate = await newTemplate.save();
        res.status(201).json(savedTemplate);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.updateTemplate = async (req, res) => {
    try {
        const updatedTemplate = await ListingTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json(updatedTemplate);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.deleteTemplate = async (req, res) => {
    try {
        await ListingTemplate.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Template deleted" });
    } catch (error) {
        res.status(404).json({ message: "Template not found" });
    }
};
