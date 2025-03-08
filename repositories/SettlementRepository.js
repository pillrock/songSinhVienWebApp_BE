const Settlement = require('../models/Settlement');

class SettlementRepository {
  static async create(month, payer, totalAmount, amountPerPerson, participants, roomId) {
    const settlement = new Settlement({ month, payer, totalAmount, amountPerPerson, participants, roomId });
    return await settlement.save();
  }
}

module.exports = SettlementRepository;