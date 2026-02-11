// models/User.js

const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    v: { type: Number, default: 0 }, // 0: неверифицирован, 1: верифицирован
    isAdmin: { type: Boolean, default: false },
    verificationCode: { type: String },
    
    // 💡 ИСПРАВЛЕНО: Для ограничения 3 попытки / 48 часов
    codeAttempts: { type: Number, default: 0 },
    // 💡 Время, когда счетчик попыток был изменен. Используется для 48-часового лимита.
    attemptResetTime: { type: Date, default: Date.now }, 
    codeExpiresAt: { type: Date },
}, { versionKey: false, timestamps: true });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);