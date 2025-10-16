// server.js
// 📦 Backend server for registration and login
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

// 🔹 Подключение к MongoDB
mongoose
  .connect(
    process.env.MONGO_URI ||
    "mongodb+srv://kira:d16438569089080@cluster0.dcm6akl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",
    { useNewUrlParser: true, useUnifiedTopology: true }
  )
  .then(() => console.log("🔗 MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// 🔹 Нормализация slug
const normalizeSlug = (text) => {
  if (!text) return "";
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
};

// 🔹 Добавление аниме (только админ)
app.post("/api/anime/add", verifyAdmin, async (req, res) => {
  try {
    const {
      nameRu,
      nameEn,
      slug: providedSlug,
      date,
      rating,
      description,
      thumbnail,
      genres,
      types,
      seasons,
    } = req.body;

    if (!nameRu || !nameEn)
      return res.status(400).json({ message: "Поля nameRu и nameEn обязательны" });

    const finalSlug = normalizeSlug(providedSlug || nameEn);
    if (!finalSlug)
      return res.status(400).json({ message: "Не удалось сгенерировать slug" });

    const existing = await Anime.findOne({ slug: finalSlug });
    if (existing)
      return res.status(400).json({ message: "Аниме с таким slug уже существует" });

    const safeGenres = Array.isArray(genres)
      ? genres.map((g) => String(g).trim()).filter(Boolean)
      : [];

    const safeTypes = Array.isArray(types)
      ? types.map((t) => String(t).trim()).filter(Boolean)
      : [];

    const formattedSeasons = Array.isArray(seasons)
      ? seasons.map((season, i) => ({
        seasonNumber: Number(season.seasonNumber) || Number(season.number) || i + 1,
        episodes: Array.isArray(season.episodes)
          ? season.episodes.map((ep, j) => ({
            number: Number(ep.number) || j + 1,
            url: ep.url?.trim() || "",
          }))
          : [],
      }))
      : [];

    const newAnime = new Anime({
      nameRu: nameRu.trim(),
      nameEn: nameEn.trim(),
      slug: finalSlug,
      date: date || "",
      rating: Number(rating) || 0,
      description: description || "",
      thumbnail: thumbnail || "",
      genres: safeGenres,
      types: safeTypes,
      seasons: formattedSeasons,
    });


    await newAnime.save();
    console.log(`✅ Добавлено аниме: ${nameRu} (slug: ${finalSlug})`);
    res.status(201).json({ message: "Аниме успешно добавлено!", anime: newAnime });
  } catch (err) {
    console.error("Ошибка при добавлении аниме:", err);
    if (err?.name === "ValidationError")
      return res.status(400).json({ message: err.message, errors: err.errors });
    res.status(500).json({ message: "Ошибка при добавлении аниме" });
  }
});

// 🔹 Получить все аниме
app.get("/api/anime", async (req, res) => {
  try {
    const all = await Anime.find();
    res.json(all);
  } catch (err) {
    console.error("Ошибка при получении списка аниме:", err);
    res.status(500).json({ message: "Ошибка при получении списка аниме" });
  }
});

// 🔹 Получить одно аниме по id или slug
app.get("/api/anime/:identifier", async (req, res) => {
  try {
    const { identifier } = req.params;
    if (!identifier) return res.status(400).json({ message: "Нет параметра identifier" });

    console.log(`🔍 Поиск аниме: ${identifier}`);
    let anime = null;

    // если это ObjectId
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      anime = await Anime.findById(identifier);
      if (anime) {
        console.log("✅ Найдено по _id");
        return res.json(anime);
      }
    }

    // иначе — ищем по slug (нормализуем)
    const normalized = normalizeSlug(identifier);
    anime = await Anime.findOne({ slug: normalized });
    if (!anime) {
      console.warn(`❌ Не найдено аниме со slug: ${normalized}`);
      return res.status(404).json({ message: "Аниме не найдено" });
    }

    console.log(`✅ Найдено по slug: ${normalized}`);
    res.json(anime);
  } catch (err) {
    console.error("Ошибка при получении аниме:", err);
    res.status(500).json({ message: "Ошибка при получении аниме" });
  }
});

// 🔹 Проверка, админ ли пользователь
app.get("/api/check-admin", verifyAdmin, (req, res) => {
  res.json({ message: "Вы админ" });
});

// 🔹 Регистрация
app.post("/api/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ message: "Все поля обязательны" });

  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email уже зарегистрирован" });

    const hash = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hash, v: 0 });
    await user.save();
    await sendCodeToEmail(email);
    res.status(201).json({ message: "Код подтверждения отправлен на почту" });
  } catch (err) {
    console.error("Ошибка регистрации:", err);
    res.status(500).json({ message: "Ошибка сервера" });
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
  } catch (err) {
    console.error("Ошибка проверки кода:", err);
    res.status(500).json({ message: "Ошибка проверки кода" });
  }
});

// 🔹 Логин
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Все поля обязательны" });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Неверные данные" });
    if (user.v !== 1)
      return res.status(400).json({ message: "Email не подтвержден" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Неверные данные" });

    const token = jwt.sign(
      { id: user._id, email: user.email, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Вход выполнен",
      token,
      user: { name: user.name, email: user.email, isAdmin: user.isAdmin },
    });
  } catch (err) {
    console.error("Ошибка логина:", err);
    res.status(500).json({ message: "Ошибка сервера" });
  }
});

// 🚀 Запуск
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
