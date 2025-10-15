// Backend server for registration and login
const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Anime = require("./models/Anime");
const { sendCodeToEmail, checkVerificationCode } = require("./Verification");
const verifyAdmin = require("./middleware/verifyAdmin");
const User = require("./models/User");

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
setInterval(deleteUnverifiedUsers, 10 * 60 * 1000);

// Подключение к MongoDB
mongoose.connect(
  process.env.MONGO_URI ||
  "mongodb+srv://kira:d16438569089080@cluster0.dcm6akl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
);

// 🔹 Функция для создания slug
const slugify = (text) => {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
};

// 🔹 Только админ может добавлять аниме
app.post("/api/anime/add", verifyAdmin, async (req, res) => {
  try {
    const {
      nameRu,
      nameEn,
      date,
      rating,
      description,
      thumbnail,
      genres,
      seasons,
      episodes,
    } = req.body;


    if (!nameRu || !nameEn)
      return res.status(400).json({ message: "Поля nameRu и nameEn обязательны" });

    const slug = slugify(nameEn);

    const existing = await Anime.findOne({ slug });
    if (existing)
      return res.status(400).json({ message: "Аниме с таким английским названием уже существует" });

    const newAnime = new Anime({
      nameRu,
      nameEn,
      slug,
      date,
      rating,
      description,
      thumbnail,
      genres: genres || [],
      seasons: seasons || [],
    });
 


    await newAnime.save();
    res.status(201).json({ message: "Аниме успешно добавлено!" });
  } catch (err) {
    console.error("Ошибка при добавлении аниме:", err);
    res.status(500).json({ message: "Ошибка при добавлении аниме" });
  }
});

// 🔹 Проверка, админ ли пользователь
app.get("/api/check-admin", verifyAdmin, (req, res) => {
  res.json({ message: "Вы админ" });
});

// 🔹 Получить все аниме
app.get("/api/anime", async (req, res) => {
  try {
    const all = await Anime.find();
    res.json(all);
  } catch (err) {
    res.status(500).json({ message: "Ошибка при получении списка аниме" });
  }
});

// 🔹 Получить одно аниме по slug
app.get("/api/anime/:slug", async (req, res) => {
  try {
    const anime = await Anime.findOne({ slug: req.params.slug });
    if (!anime) return res.status(404).json({ message: "Аниме не найдено" });
    res.json(anime);
  } catch (err) {
    res.status(500).json({ message: "Ошибка при получении аниме" });
  }
});

// 🔹 Регистрация
app.post("/api/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ message: "All fields required" });

  try {
    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ message: "Email already registered" });

    const hash = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hash, v: 0 });
    await user.save();
    await sendCodeToEmail(email);
    res.status(201).json({ message: "Код подтверждения отправлен на почту" });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// 🔹 Проверка кода
app.post("/api/verify-code", async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code)
    return res.status(400).json({ message: "Email и код обязательны" });

  try {
    const ok = await checkVerificationCode(email, code);
    if (ok) {
      await User.updateOne({ email }, { v: 1 });
      res.json({ message: "Почта подтверждена!" });
    } else {
      res.status(400).json({ message: "Неверный код" });
    }
  } catch {
    res.status(500).json({ message: "Ошибка проверки кода" });
  }
});

// 🔹 Логин
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "All fields required" });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });
    if (user.v !== 1)
      return res.status(400).json({ message: "Email not verified" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, email: user.email, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: { name: user.name, email: user.email, isAdmin: user.isAdmin },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Server running on port", PORT));
