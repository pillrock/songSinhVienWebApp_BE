const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const resetRoutes = require('./routes/resetRoutes');
const cron = require('node-cron'); // Thêm node-cron
const resetController = require('./controllers/resetController'); // Import resetController

dotenv.config();
const app = express();

const corsOptions = {
  origin: [
    'http://localhost:3000', // Frontend trên máy tính
    'https://ssv-mocha.vercel.app' // Thay your-ngrok-url bằng URL thực tế từ Ngrok
  ],
  credentials: true // Cho phép gửi cookie/token nếu cần
};
app.use(cors(corsOptions));

app.use(express.json());

// Cấu hình các routes
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reset', resetRoutes);

// Kết nối MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Lập lịch tự động reset dữ liệu vào ngày cuối cùng của mỗi tháng, lúc 23:59
cron.schedule('59 23 28-31 * *', async () => {
  console.log('Running monthly reset at the end of the month...');
  try {
    await resetController.autoResetData();
    console.log('Monthly reset completed successfully');
  } catch (err) {
    console.error('Error in monthly reset:', err.message);
  }
}, {
  timezone: 'Asia/Ho_Chi_Minh'
});

// Khởi động server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));