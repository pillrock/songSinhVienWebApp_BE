// controllers/resetController.js
const PaymentRepository = require('../repositoriesPpaymentRepository');
const SettlementRepository = require('../repositories/SettlementRepository');

exports.resetDataByRoom = async (req, res) => {
  try {
    const payments = await PaymentRepository.findAllPayments(req.user.roomId);
    const users = await PaymentRepository.findAllUsers(req.user.roomId);
    const allUsernames = users.map(u => u.username);

    // Tạo settlement cho từng payment riêng lẻ
    const currentMonth = new Date().toISOString().slice(0, 7);
    for (const payment of payments) {
      // Nếu không có participants, mặc định là tất cả users trừ payer
      const participants = payment.participants.length > 0 
        ? payment.participants 
        : allUsernames.filter(u => u !== payment.payer);
      
      const totalParticipants = participants.length;
      const amountPerPerson = payment.amount / (totalParticipants + 1); // +1 vì tính cả payer

      // Tạo danh sách participants với trạng thái paid
      const participantDetails = allUsernames.map(username => ({
        username,
        // Người trả tiền hoặc không nằm trong participants thì đã "paid"
        paid: username === payment.payer || !participants.includes(username),
        proof: null,
        amountOwed: participants.includes(username) && username !== payment.payer 
          ? amountPerPerson 
          : 0
      }));

      await SettlementRepository.create(
        currentMonth,
        payment.payer,
        payment.amount,
        amountPerPerson,
        participantDetails,
        req.user.roomId
      );
    }

    // Xóa tất cả payments sau khi tạo settlements
    await PaymentRepository.deleteAllPayments(req.user.roomId);
    res.json({ message: 'Data reset and settlements created for room' });
  } catch (err) {
    res.status(500).json({ message: 'Error resetting data', error: err.message });
  }
};

// Hàm reset tự động
exports.autoResetData = async () => {
  const Room = require('../models/Room');
  const rooms = await Room.find();
  for (const room of rooms) {
    await exports.resetData({ user: { roomId: room._id } }, null);
  }
};

// Hàm reset cũ (giữ lại để tương thích nếu cần)
exports.resetData = async (req, res) => {
  const roomId = req?.user?.roomId;
  if (!roomId) throw new Error('roomId is required for auto reset');
  
  try {
    const payments = await PaymentRepository.findAllPayments(roomId);
    const users = await PaymentRepository.findAllUsers(roomId);
    const totalUsers = users.length;

    const groupedByPayer = payments.reduce((acc, payment) => {
      acc[payment.payer] = (acc[payment.payer] || 0) + payment.amount;
      return acc;
    }, {});

    const currentMonth = new Date().toISOString().slice(0, 7);
    for (const [payer, totalAmount] of Object.entries(groupedByPayer)) {
      const amountPerPerson = totalAmount / totalUsers;
      const participants = users.map(user => ({
        username: user.username,
        paid: user.username === payer,
        proof: null
      }));

      await SettlementRepository.create(currentMonth, payer, totalAmount, amountPerPerson, participants, roomId);
    }

    await PaymentRepository.deleteAllPayments(roomId);
    if (res) {
      res.json({ message: 'Data reset and settlements created' });
    }
  } catch (err) {
    if (res) {
      res.status(500).json({ message: 'Error resetting data', error: err.message });
    } else {
      console.error('Error in monthly reset:', err.message);
    }
  }
};