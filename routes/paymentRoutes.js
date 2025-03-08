const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middleware/authMiddleware');
const uploadMiddleware = require('../middleware/uploadMiddleware');
const path = require('path');
const fs = require('fs');

// Các route hiện có
router.get('/', authMiddleware, paymentController.getPayments);
// router.get('/', authMiddleware, paymentController.getPaymentsByRoom);
router.post('/', authMiddleware, uploadMiddleware.single('proof'), paymentController.addPayment);
router.post('/:id/pay', authMiddleware, uploadMiddleware.single('proof'), paymentController.paySettlement);

// Route để lấy ảnh
router.get('/uploads/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, '../uploads', filename);

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ message: 'File not found' });
  }
});
router.delete('/:id', authMiddleware, paymentController.deletePayment);
module.exports = router;