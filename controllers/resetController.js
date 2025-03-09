// controllers/resetController.js
const PaymentRepository = require('../repositories/PaymentRepository');
const SettlementRepository = require('../repositories/SettlementRepository');

exports.resetDataByRoom = async (req, res) => {
  try {
    const payments = await PaymentRepository.findAllPayments(req.user.roomId);
    const users = await PaymentRepository.findAllUsers(req.user.roomId);
    const allUsernames = users.map(u => u.username);

    // Nhóm payments theo payer và month
    const groupedByPayer = payments.reduce((acc, payment) => {
      const key = `${payment.payer}-${new Date().toISOString().slice(0, 7)}`;
      if (!acc[key]) {
        acc[key] = {
          payer: payment.payer,
          month: new Date().toISOString().slice(0, 7),
          payments: [],
        };
      }
      acc[key].payments.push(payment);
      return acc;
    }, {});

    const currentMonth = new Date().toISOString().slice(0, 7);
    for (const key in groupedByPayer) {
      const { payer, payments } = groupedByPayer[key];

      // Tính tổng số tiền của tất cả payments
      const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);

      // Tính amountOwed cho mỗi user dựa trên từng payment
      const participantDebts = allUsernames.reduce((acc, username) => {
        acc[username] = { amountOwed: 0, paid: username === payer };
        return acc;
      }, {});

      // Duyệt qua từng payment để tính amountOwed
      for (const payment of payments) {
        const participants = payment.participants.length > 0 
          ? payment.participants 
          : allUsernames.filter(u => u !== payment.payer); // Thanh toán chung
        const totalParticipants = participants.length;
        const amountPerPerson = payment.amount / (totalParticipants + 1); // +1 vì tính cả payer

        // Cộng dồn amountOwed cho các participants
        participants.forEach(username => {
          if (username !== payer) {
            participantDebts[username].amountOwed += amountPerPerson;
          }
        });
      }

      // Tạo participantDetails cho settlement
      const participantDetails = allUsernames.map(username => ({
        username,
        paid: participantDebts[username].paid,
        proof: null,
        amountOwed: participantDebts[username].amountOwed,
      }));

      // Tính amountPerPerson trung bình (chỉ để hiển thị, không dùng để tính nợ)
      const totalParticipants = participantDetails.filter(p => p.amountOwed > 0).length;
      const amountPerPerson = totalParticipants > 0 ? totalAmount / (totalParticipants + 1) : 0;

      await SettlementRepository.create(
        currentMonth,
        payer,
        totalAmount,
        amountPerPerson, // Đây là giá trị trung bình, không ảnh hưởng đến amountOwed
        participantDetails,
        req.user.roomId
      );
    }

    // Xóa tất cả payments sau khi tạo settlements
    // await PaymentRepository.deleteAllPayments(req.user.roomId);
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
    const allUsernames = users.map(u => u.username);

    // Nhóm payments theo payer
    const groupedByPayer = payments.reduce((acc, payment) => {
      const key = `${payment.payer}-${new Date().toISOString().slice(0, 7)}`;
      if (!acc[key]) {
        acc[key] = {
          payer: payment.payer,
          month: new Date().toISOString().slice(0, 7),
          payments: [],
        };
      }
      acc[key].payments.push(payment);
      return acc;
    }, {});

    const currentMonth = new Date().toISOString().slice(0, 7);
    for (const key in groupedByPayer) {
      const { payer, payments } = groupedByPayer[key];
      const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);

      const participantDebts = allUsernames.reduce((acc, username) => {
        acc[username] = { amountOwed: 0, paid: username === payer };
        return acc;
      }, {});

      for (const payment of payments) {
        const participants = payment.participants.length > 0 
          ? payment.participants 
          : allUsernames.filter(u => u !== payment.payer);
        const totalParticipants = participants.length;
        const amountPerPerson = payment.amount / (totalParticipants + 1);

        participants.forEach(username => {
          if (username !== payer) {
            participantDebts[username].amountOwed += amountPerPerson;
          }
        });
      }

      const participantDetails = allUsernames.map(username => ({
        username,
        paid: participantDebts[username].paid,
        proof: null,
        amountOwed: participantDebts[username].amountOwed,
      }));

      const totalParticipants = participantDetails.filter(p => p.amountOwed > 0).length;
      const amountPerPerson = totalParticipants > 0 ? totalAmount / (totalParticipants + 1) : 0;

      await SettlementRepository.create(
        currentMonth,
        payer,
        totalAmount,
        amountPerPerson,
        participantDetails,
        roomId
      );
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