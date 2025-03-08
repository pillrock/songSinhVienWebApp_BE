const User = require('../models/User');
const bcrypt = require('bcryptjs');

class UserRepository {
  static async findByUsername(username) {
    return await User.findOne({ username });
  }

  static async findById(id) {
    return await User.findById(id).select('-password');
  }
  static async findAllUsersInRoom(roomId) {
    return await User.find({ roomId }, 'username');
  }
  static async create(username, password, role, stk = '', bank = '', roomId) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword, role: role || 'user', stk, bank, roomId });
    return await newUser.save();
  }

  static async update(id, username, password, stk, bank, roomId) {
    const user = await User.findById(id);
    if (!user) throw new Error('User not found');
    if (username) user.username = username;
    if (password) user.password = await bcrypt.hash(password, 10);
    if (stk !== undefined) user.stk = stk;
    if (bank !== undefined) user.bank = bank;
    if (roomId !== undefined) user.roomId = roomId;
    console.log(user.toObject())
    return await user.save();
  }
}

module.exports = UserRepository;