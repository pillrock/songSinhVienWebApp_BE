// models/Payment.js
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  updateTime: { type: Date, default: Date.now },
  eventTime: { type: Date, required: true },
  itemCategory: { type: String, required: true },
  note: { type: String, default: '' },
  amount: { type: Number, required: true },
  proof: { type: String },
  payer: { type: String, required: true },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  participants: [{ type: String }], // Danh sách username của những người tham gia thanh toán
});

paymentSchema.index({ eventTime: 1 });
paymentSchema.index({ payer: 1 });
module.exports = mongoose.model('Payment', paymentSchema);