const Payment = require('../models/Payment');
const Settlement = require('../models/Settlement');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');

class PaymentRepository {
    static async findAllPayments(roomId) {
        if (!roomId) throw new Error('roomId is required');
        return await Payment.find({ roomId });
      }


    static async createPayment(eventTime, itemCategory, note, amount, proof, payer, roomId, participants) {
      const payment = new Payment({ 
        eventTime, 
        itemCategory, 
        note, 
        amount, 
        proof, 
        payer, 
        roomId,
        participants: participants || [] // Nếu không có participants, để mảng rỗng
      });
      return await payment.save();
    }

  static async findAllUsers(roomId) {
    return await User.find({ roomId }, 'username');
  }

  static async findAllSettlements(roomId) {
    return await Settlement.find({ roomId });
  }

  static async findSettlementById(id) {
    return await Settlement.findById(id);
  }

  static async updateSettlement(settlement) {
    return await settlement.save();
  }

  static async deleteAllPayments(roomId) {
    return await Payment.deleteMany({ roomId });
  }

  static async getAllProofFiles(roomId) {
    const payments = await Payment.find({ roomId, proof: { $exists: true, $ne: null } }, 'proof');
    return payments.map(payment => payment.proof.replace('/uploads/', ''));
  }

  static async deleteProofFiles(fileNames) {
    const uploadsDir = path.join(__dirname, '../uploads');
    const deletedFiles = [];
    for (const filename of fileNames) {
      const filePath = path.join(uploadsDir, filename);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          deletedFiles.push(filename);
          console.log(`Deleted file: ${filePath}`);
        }
      } catch (err) {
        console.error(`Error deleting file ${filePath}:`, err.message);
      }
    }
    return deletedFiles;
  }
  // Thêm hàm tìm payment theo ID
  static async findPaymentById(id) {
    return await Payment.findById(id);
  }

  // Thêm hàm xóa payment
  static async deletePayment(id) {
    return await Payment.findByIdAndDelete(id);
  }
}

module.exports = PaymentRepository;