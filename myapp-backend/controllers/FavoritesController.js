const Favorites = require('../models/Favorites');

exports.getAllFavorites = async (req, res) => {
    try {
        const favorites = await Favorites.find({ userId: req.user.id }); // Assuming user id from req.user
        res.status(200).json(favorites);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.addFavorite = async (req, res) => {
    const favorite = new Favorites({ ...req.body, userId: req.user.id });
    try {
        const newFavorite = await favorite.save();
        res.status(201).json(newFavorite);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.deleteFavorite = async (req, res) => {
    try {
        const favorite = await Favorites.findByIdAndRemove(req.params.id);
        res.status(200).json({ message: 'Favorite removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
