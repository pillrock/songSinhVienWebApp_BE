const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

router.post('/login', authController.login);
router.post('/register', authMiddleware, adminMiddleware, authController.register);
router.post('/join-room', authMiddleware, authController.joinRoom);
router.put('/update', authMiddleware, authController.updateUser);
router.get('/me', authMiddleware, authController.getMe);
router.get('/users/:username', authMiddleware, authController.getUser);
router.get('/room/me', authMiddleware, authController.getRoomMe);
router.post('/create-room', authMiddleware, authController.createRoom); // Thêm route mới
router.get('/room/:roomId', authMiddleware, authController.getRoomInfo);
router.post('/leave-room', authMiddleware, authController.leaveRoom);
module.exports = router;