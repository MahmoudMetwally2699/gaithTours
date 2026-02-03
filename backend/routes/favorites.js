const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Auth middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Get user's favorites
router.get('/', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('favorites');
    res.json({ favorites: user.favorites || [] });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ message: 'Error fetching favorites' });
  }
});

// Add hotel to favorites
router.post('/:hotelId', authenticate, async (req, res) => {
  try {
    const { hotelId } = req.params;
    const user = await User.findById(req.user._id);

    if (!user.favorites) {
      user.favorites = [];
    }

    // Check if already in favorites
    if (user.favorites.includes(hotelId)) {
      return res.json({
        message: 'Already in favorites',
        favorites: user.favorites,
        isFavorite: true
      });
    }

    user.favorites.push(hotelId);
    await user.save();

    res.json({
      message: 'Added to favorites',
      favorites: user.favorites,
      isFavorite: true
    });
  } catch (error) {
    console.error('Error adding to favorites:', error);
    res.status(500).json({ message: 'Error adding to favorites' });
  }
});

// Remove hotel from favorites
router.delete('/:hotelId', authenticate, async (req, res) => {
  try {
    const { hotelId } = req.params;
    const user = await User.findById(req.user._id);

    if (!user.favorites) {
      user.favorites = [];
    }

    const index = user.favorites.indexOf(hotelId);
    if (index > -1) {
      user.favorites.splice(index, 1);
      await user.save();
    }

    res.json({
      message: 'Removed from favorites',
      favorites: user.favorites,
      isFavorite: false
    });
  } catch (error) {
    console.error('Error removing from favorites:', error);
    res.status(500).json({ message: 'Error removing from favorites' });
  }
});

// Sync localStorage favorites on login
router.post('/sync', authenticate, async (req, res) => {
  try {
    const { localFavorites } = req.body; // Array of hotel IDs from localStorage

    if (!Array.isArray(localFavorites)) {
      return res.status(400).json({ message: 'localFavorites must be an array' });
    }

    const user = await User.findById(req.user._id);

    if (!user.favorites) {
      user.favorites = [];
    }

    // Merge: add local favorites that aren't already in server favorites
    const newFavorites = localFavorites.filter(id => !user.favorites.includes(id));
    user.favorites = [...user.favorites, ...newFavorites];

    await user.save();

    res.json({
      message: 'Favorites synced',
      favorites: user.favorites,
      added: newFavorites.length
    });
  } catch (error) {
    console.error('Error syncing favorites:', error);
    res.status(500).json({ message: 'Error syncing favorites' });
  }
});

// Check if a hotel is in favorites
router.get('/check/:hotelId', authenticate, async (req, res) => {
  try {
    const { hotelId } = req.params;
    const user = await User.findById(req.user._id).select('favorites');

    const isFavorite = user.favorites?.includes(hotelId) || false;

    res.json({ isFavorite });
  } catch (error) {
    console.error('Error checking favorite:', error);
    res.status(500).json({ message: 'Error checking favorite' });
  }
});

module.exports = router;
