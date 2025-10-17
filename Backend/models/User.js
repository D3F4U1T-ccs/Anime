const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  v: { type: Number, default: 0 },
  isAdmin: { type: Boolean, default: false },
  verificationCode: { type: String },
}, {  versionKey: false, timestamps: true })

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
