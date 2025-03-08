const UserRepository = require('../repositories/UserRepository');
const Room = require('../models/Room.js');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { updateOne } = require('../models/Settlement.js');
const { request } = require('express');
exports.login = async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await UserRepository.findByUsername(username);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Tài khoản hoặc mật khẩu không đúng' });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, username: user.username, role: user.role, roomId: user.roomId } });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server khi đăng nhập' });
  }
};

exports.register = async (req, res) => {
  const { username, password, role, stk, bank, roomId } = req.body;
  try {
    const existingUser = await UserRepository.findByUsername(username);
    if (existingUser) return res.status(400).json({ message: 'Tài khoản đã tồn tại' });
    const user = await UserRepository.create(username, password, role, stk, bank, roomId);
    res.status(201).json({ message: 'Đăng ký thành công', user: { id: user._id, username: user.username, role: user.role } });
  } catch (err) {
    console.log(err)
    res.status(500).json({ message: 'Lỗi khi đăng ký' });
  }
};

exports.joinRoom = async (req, res) => {
  const { roomId } = req.body;
  try {
    const room = await Room.findOne({ roomId });
    if (!room) return res.status(404).json({ message: 'Phòng không tồn tại' });
    const userInfo = await UserRepository.findById(req.user.id)
    !(room.members.includes(userInfo.username)) && room.members.push(userInfo.username)
    await room.save();
    await UserRepository.update(req.user.id, null, null, null, null, room._id);
    res.json({ message: 'Đã tham gia phòng thành công', room });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi tham gia phòng' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await UserRepository.findById(req.user.id);
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi lấy thông tin người dùng' });
  }
};
exports.createRoom = async (req, res) => {
  const { name } = req.body; // Tên phòng do người dùng nhập
  try {
    // Tạo roomId ngẫu nhiên (có thể tùy chỉnh cách tạo)
    const roomId = `room-${Math.random().toString(36).substr(2, 9)}`;
    const room = new Room({
      roomId,
      name,
      createdAt: new Date(),
      members: [req.user.username],
    });
    await room.save();

    // Tự động thêm người tạo vào phòng
    await UserRepository.update(req.user.id, null, null, null, null, room._id);

    res.status(201).json({ message: 'Tạo phòng thành công', room });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi tạo phòng', error: err.message });
  }
};
exports.updateUser = async (req, res) => {
  const { username, password, stk, bank } = req.body;
  try {
    const updatedUser = await UserRepository.update(req.user.id, username, password, stk, bank);
    res.json({user: {...updatedUser.toObject(), password:"encrypted"}});
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi cập nhật thông tin người dùng', error: err.message });
  }
};
exports.getUser = async (req, res) => {
  const { username } = req.params;
  try {
    const user = await UserRepository.findByUsername(username);
    if (!user) return res.status(404).json({ message: 'Người dùng không tồn tại' });

    res.json({
      user: {
        _id: user._id,
        username: user.username,
        bank: user.stk,
        stk: user.bank,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi lấy thông tin phòng', error: err.message });
  }
};

exports.getRoomInfo = async (req, res) => {
  const { roomId } = req.params;
  try {
    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: 'Phòng không tồn tại' });

    // Lấy danh sách thành viên trong phòng
    const members = await UserRepository.findAllUsersInRoom(roomId);
    res.json({
      room: {
        _id: room.roomId,
        name: room.name,
        members: members.map((u) => u.username),
        createdAt: room.createdAt,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi lấy thông tin phòng', error: err.message });
  }
};
exports.getRoomMe = async (req, res) => {
  const user = await UserRepository.findById(req.user.id);
  const roomId = user.roomId;
  console.log(roomId);
  try {
    console.log(roomId);
    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: 'Phòng không tồn tại' });

    res.json({
      ...room,
      members: room.members.filter((m) => m!== user.username),
    });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi lấy thông tin phòng', error: err.message });
  }
};
exports.leaveRoom = async (req, res) => {
  try {
    const user = await UserRepository.findById(req.user.id);
    if (!user.roomId) {
      return res.status(400).json({ message: 'Bạn chưa tham gia phòng nào' });
    }

    // Cập nhật roomId của user thành null
    const room = await Room.findById(user.roomId);
    room.members = room.members.filter(item => item != user.username);
    await room.save();
    await UserRepository.update(req.user.id, null, null, null, null, null);
    res.json({ message: 'Rời phòng thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi rời phòng', error: err.message });
  }
};