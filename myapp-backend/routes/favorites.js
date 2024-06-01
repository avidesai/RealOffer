const express = require('express');
const router = express.Router();
const FavoritesController = require('../controllers/FavoritesController');

router.get('/', FavoritesController.getAllFavorites);
router.post('/', FavoritesController.addFavorite);
router.delete('/:id', FavoritesController.deleteFavorite);

module.exports = router;