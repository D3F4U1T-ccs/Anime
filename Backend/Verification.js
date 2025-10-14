
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const User = require('./models/User');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Генерация 6-значного кода
function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Отправка кода на email и сохранение кода в базе
async function sendCodeToEmail(email) {
    const user = await User.findOne({ email });
    if (!user) throw new Error('User not found');
    const code = generateCode();
    user.verificationCode = code;
    user.v = 0;
    await user.save();
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Код подтверждения регистрации',
        html: `<h2>Ваш код подтверждения: <b>${code}</b></h2>`
    };
    return transporter.sendMail(mailOptions);
}

// Проверка кода
async function checkVerificationCode(email, code) {
    const user = await User.findOne({ email });
    if (!user) return false;
    if (user.verificationCode === code) {
        user.v = 1;
        user.verificationCode = undefined;
        await user.save();
        return true;
    }
    return false;
}

module.exports = { sendCodeToEmail, checkVerificationCode };