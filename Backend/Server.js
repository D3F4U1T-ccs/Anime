// Backend server for registration and login
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); // ← ОСТАВЛЯЕМ ТОЛЬКО ЭТУ

const { sendCodeToEmail, checkVerificationCode } = require('./Verification');

const app = express();
app.use(express.json());
app.use(cors());

// Connect to MongoDB
mongoose.connect(
    process.env.MONGO_URI ||
    'mongodb+srv://kira:d16438569089080@cluster0.dcm6akl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'
);

const User = require('./models/User');

// Registration route
app.post('/api/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
        return res.status(400).json({ message: 'All fields required' });
    try {
        const existing = await User.findOne({ email });
        if (existing)
            return res.status(400).json({ message: 'Email already registered' });
        const hash = await bcrypt.hash(password, 10);
        const user = new User({ name, email, password: hash, v: 0 });
        await user.save();
        await sendCodeToEmail(email);
        res.status(201).json({ message: 'Код подтверждения отправлен на почту' });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Повторная отправка кода
app.post('/api/send-code', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });
    try {
        await sendCodeToEmail(email);
        res.json({ message: 'Код отправлен на почту' });
    } catch (err) {
        res.status(500).json({ message: 'Ошибка отправки кода' });
    }
});

// Проверка кода
app.post('/api/verify-code', async (req, res) => {
    const { email, code } = req.body;
    if (!email || !code)
        return res.status(400).json({ message: 'Email и код обязательны' });
    try {
        const ok = await checkVerificationCode(email, code);
        if (ok) {
            // ✅ обновляем статус верификации пользователя
            await User.updateOne({ email }, { v: 1 });
            res.json({ message: 'Почта подтверждена!' });
        } else {
            res.status(400).json({ message: 'Неверный код' });
        }


    } catch (err) {
        res.status(500).json({ message: 'Ошибка проверки кода' });
    }
});

// Подтверждение email
app.get('/api/verify/:token', async (req, res) => {
    const { token } = req.params;
    const ok = await verifyUser(token);
    if (ok) {
        res.send('<h2>Почта успешно подтверждена! Теперь вы можете войти.</h2>');
    } else {
        res.status(400).send('<h2>Ошибка подтверждения. Ссылка недействительна или истекла.</h2>');
    }
});

// Login route
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ message: 'All fields required' });

    try {
        const user = await User.findOne({ email });
        if (!user)
            return res.status(400).json({ message: 'Invalid credentials' });

        if (user.v !== 1)
            return res.status(400).json({ message: 'Email not verified' });

        const match = await bcrypt.compare(password, user.password);
        if (!match)
            return res.status(400).json({ message: 'Invalid credentials' });

        const token = jwt.sign(
            { id: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: { name: user.name, email: user.email },
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log('Server running on port', PORT));
