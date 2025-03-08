const express = require('express');
const authController = require("../controllers/authController.js");
const router = express.Router();

router.post('/join-room', authController.joinRoom);
module.exports = router;