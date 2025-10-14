// Backend server for registration and login
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Anime = require('./models/Anime');
const { sendCodeToEmail, checkVerificationCode } = require('./Verification');
const verifyAdmin = require("./middleware/verifyAdmin");
const User = require("./models/User"); // ✅ только здесь один раз

const app = express();
app.use(express.json());
app.use(cors());

// 🧹 Авто-удаление неверифицированных аккаунтов
async function deleteUnverifiedUsers() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  try {
    const result = await User.deleteMany({
      v: 0,
      createdAt: { $lt: oneHourAgo },
    });
    if (result.deletedCount > 0) {
      console.log(`🗑️ Удалено ${result.deletedCount} неверифицированных пользователей`);
    }
  } catch (err) {
    console.error("Ошибка при удалении неверифицированных:", err);
  }
}
// Проверять каждые 10 минут
setInterval(deleteUnverifiedUsers, 10 * 60 * 1000);

// Подключение к MongoDB
mongoose.connect(
  process.env.MONGO_URI ||
  'mongodb+srv://kira:d16438569089080@cluster0.dcm6akl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'
);

// Только админ может добавлять аниме
app.post("/api/anime/add", verifyAdmin, async (req, res) => {
  const { name, date, rating, description, thumbnail, episodes } = req.body;
  try {
    const newAnime = new Anime({ name, date, rating, description, thumbnail, episodes });
    await newAnime.save();
    res.status(201).json({ message: "Аниме успешно добавлено!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Ошибка при добавлении аниме" });
  }
});

// Проверка, админ ли пользователь
app.get("/api/check-admin", verifyAdmin, (req, res) => {
  res.json({ message: "Вы админ" });
});

// Получить все аниме
app.get('/api/anime', async (req, res) => {
  try {
    const animeList = await Anime.find();
    res.json(animeList);
  } catch {
    res.status(500).json({ message: 'Ошибка при получении списка аниме' });
  }
});

// Регистрация
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

// Проверка кода
app.post('/api/verify-code', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code)
    return res.status(400).json({ message: 'Email и код обязательны' });

  try {
    const ok = await checkVerificationCode(email, code);
    if (ok) {
      await User.updateOne({ email }, { v: 1 });
      res.json({ message: 'Почта подтверждена!' });
    } else {
      res.status(400).json({ message: 'Неверный код' });
    }
  } catch {
    res.status(500).json({ message: 'Ошибка проверки кода' });
  }
});

// Логин
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: 'All fields required' });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    if (user.v !== 1) return res.status(400).json({ message: 'Email not verified' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user._id, email: user.email, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { name: user.name, email: user.email, isAdmin: user.isAdmin },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log('Server running on port', PORT));
