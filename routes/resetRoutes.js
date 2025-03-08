const express = require('express');
const router = express.Router();
const resetController = require('../controllers/resetController.js');
const authMiddleware = require('../middleware/authMiddleware.js');

// router.post('/reset', authMiddleware, resetController.resetData);
router.post('/reset', authMiddleware, resetController.resetDataByRoom);
module.exports = router;