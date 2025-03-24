const express = require('express');
const router = express.Router();
const { auth, isAdmin } = require('../middleware/auth');
const {
    createBlock,
    getAllBlocks,
    getBlockById,
    updateBlock,
    deleteBlock
} = require('../controllers/blockController');

// All routes require authentication
router.use(auth);

// Routes
router.route('/')
    .get(getAllBlocks)
    .post(isAdmin, createBlock);

router.route('/:id')
    .get(getBlockById)
    .put(isAdmin, updateBlock)
    .delete(isAdmin, deleteBlock);

module.exports = router; 