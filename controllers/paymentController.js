const PaymentRepository = require('../repositories/PaymentRepository.js');
const Payment = require("../models/Payment.js");
const UserRepository = require('../repositories/UserRepository.js');
const Room = require('../models/Room.js');
const path = require("path")
const fs = require("fs"); 
exports.getPayments = async (req, res) => {
  try {
    const payments = await PaymentRepository.findAllPayments(req.user.roomId);
    const users = await PaymentRepository.findAllUsers(req.user.roomId);
    const settlements = await PaymentRepository.findAllSettlements(req.user.roomId);

    res.json({
      payments,
      users: users.map((u) => u.username),
      settlements,
    });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi lấy danh sách thanh toán', error: err.message });
  }
};

exports.addPayment = async (req, res) => {
  const { eventTime, itemCategory, note, amount, participants } = req.body;
  const proof = req.file ? `/uploads/${req.file.filename}` : null;
  const payer = req.user.username;
  const room = await Room.findById(req.user.roomId);
  try {
    if (!req.user.roomId) {
      return res.status(400).json({ message: 'Bạn chưa tham gia phòng nào' });
    }

    // Nếu không có participants hoặc participants là "all", thì để mảng rỗng (sẽ xử lý ở reset logic)
    let participantList = [];

    if (participants == 'all') {
      participantList = room.members.filter((n) =>n != req.user.username);
    }
    if (participants && participants !== 'all') {
      participantList = Array.isArray(participants) ? participants : JSON.parse(participants);
    }

    const payment = await PaymentRepository.createPayment(
      eventTime,
      itemCategory,
      note,
      amount,
      proof,
      payer,
      req.user.roomId,
      participantList
    );
    res.status(201).json(payment);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi thêm khoản thanh toán', error: err.message });
  }
};

exports.paySettlement = async (req, res) => {
  const { id } = req.params;
  const proof = req.file ? `/uploads/${req.file.filename}` : null;
  const username = req.user.username; // Đã sử dụng username từ token, giữ nguyên

  try {
    const settlement = await PaymentRepository.findSettlementById(id);
    if (!settlement) {
      return res.status(404).json({ message: 'Không tìm thấy khoản thanh toán' });
    }

    // Kiểm tra xem người dùng có phải là payer không, nếu là payer thì không cho phép xác nhận
    if (settlement.payer === username) {
      return res.status(403).json({ message: 'Bạn không thể xác nhận thanh toán cho chính mình' });
    }

    const participant = settlement.participants.find((p) => p.username === username);
    if (!participant) {
      return res.status(403).json({ message: 'Bạn không phải là người tham gia khoản thanh toán này' });
    }

    if (participant.paid) {
      return res.status(400).json({ message: 'Bạn đã thanh toán rồi' });
    }

    participant.paid = true;
    participant.proof = proof;
    await PaymentRepository.updateSettlement(settlement);

    res.json({ message: 'Xác nhận thanh toán thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi xác nhận thanh toán', error: err.message });
  }
};

exports.getPaymentsByRoom = async (req, res) => {
  try {
    const payments = await Payment.find({ roomId: req.user.roomId });
    res.json({ payments });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi lấy danh sách thanh toán' });
  }
};

exports.deletePayment = async (req, res) => {
  const { id } = req.params;
  const username = req.user.username;

  try {
    const payment = await PaymentRepository.findPaymentById(id);
    if (!payment) {
      return res.status(404).json({ message: 'Không tìm thấy khoản thanh toán' });
    }

    // Kiểm tra quyền: chỉ payer mới được xóa
    if (payment.payer !== username) {
      return res.status(403).json({ message: 'Bạn chỉ có thể xóa khoản thanh toán của chính mình' });
    }

    // Xóa file proof nếu tồn tại
    if (payment.proof) {
      const filename = payment.proof.replace('/uploads/', '');
      const filePath = path.join(__dirname, '../uploads', filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await PaymentRepository.deletePayment(id);
    res.json({ message: 'Xóa khoản thanh toán thành công' });
  } catch (err) {
    console.log(err);
    // res.status(500).json({ message: 'Lỗi khi xóa khoản thanh toán', error: err.message });
  }
};