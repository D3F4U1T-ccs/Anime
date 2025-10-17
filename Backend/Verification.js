// Verification.js

const nodemailer = require('nodemailer');
const User = require('./models/User'); // Предполагаем, что импорт правильный

const transporter = nodemailer.createTransport({
    // Используйте свои переменные окружения
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
    
    // УСТАНОВКА СРОКА ДЕЙСТВИЯ КОДА (30 минут, как в предыдущем примере)
    user.codeExpiresAt = new Date(Date.now() + 30 * 60 * 1000); 
    
    await user.save();
    
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Код подтверждения регистрации',
        html: `<h2>Ваш код подтверждения: <b>${code}</b>. Код действителен 30 минут.</h2>`
    };
    return transporter.sendMail(mailOptions);
}

// Проверка кода (ВОЗВРАЩАЕТ ОБЪЕКТ {ok: boolean, message: string})
async function checkVerificationCode(email, code) {
    const user = await User.findOne({ email });
    if (!user) return { ok: false, message: "Пользователь не найден." };
    
    // ПРОВЕРКА СРОКА ДЕЙСТВИЯ
    if (!user.verificationCode || user.codeExpiresAt < new Date()) {
        user.verificationCode = undefined;
        user.codeExpiresAt = undefined;
        await user.save();
        return { ok: false, message: "Срок действия кода истек. Запросите новый." };
    }

    if (user.verificationCode === code) {
        // Успех
        user.v = 1;
        user.verificationCode = undefined;
        user.codeExpiresAt = undefined;
        user.codeAttempts = 0; // СБРОС СЧЕТЧИКА ПОПЫТОК ПРИ УСПЕХЕ
        user.attemptResetTime = new Date(); // Обновление
        
        await user.save();
        return { ok: true, message: "Верификация успешна." };
    }
    
    return { ok: false, message: "Неверный код." };
}

module.exports = { sendCodeToEmail, checkVerificationCode };