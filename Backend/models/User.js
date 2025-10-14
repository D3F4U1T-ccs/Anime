const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: false }, // 🟢 новое поле
  v: { type: Number, default: 0 },
  verificationCode: { type: String },
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
