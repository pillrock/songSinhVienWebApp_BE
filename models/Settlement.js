// models/Settlement.js
const mongoose = require('mongoose');

const settlementSchema = new mongoose.Schema({
  month: { type: String, required: true },
  payer: { type: String, required: true },
  totalAmount: { type: Number, required: true },
  amountPerPerson: { type: Number, required: true },
  participants: [{
    username: String,
    paid: { type: Boolean, default: false },
    proof: String,
    amountOwed: { type: Number, default: 0 } // Thêm field để lưu số tiền nợ
  }],
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
});

module.exports = mongoose.model('Settlement', settlementSchema);