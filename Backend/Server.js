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
  // Если мидлвар verifyAdmin отработал без ошибок, 
  // значит, пользователь является админом.
  res.json({ message: "Вы админ" });
});
// server.js

// 🔹 Регистрация
app.post("/api/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: "Все поля обязательны" });
  }

  // Приводим email к нижнему регистру для универсальности
  const normalizedEmail = email.toLowerCase();

  try {
    // Проверяем, занят ли email (уже без учета регистра)
    const existingEmail = await User.findOne({ email: normalizedEmail });
    if (existingEmail) {
      return res.status(400).json({ message: "Этот email уже зарегистрирован" });
    }

    // <<< ИЗМЕНЕНИЕ ЗДЕСЬ: Проверка имени без учета регистра
    // Мы используем регулярное выражение с флагом 'i' (insensitive)
    const existingName = await User.findOne({
      name: { $regex: new RegExp("^" + name + "$", "i") }
    });

    if (existingName) {
      return res.status(400).json({ message: "Это имя пользователя уже занято" });
    }

    const hash = await bcrypt.hash(password, 10);
    // Сохраняем email в нижнем регистре
    const user = new User({ name, email: normalizedEmail, password: hash, v: 0 });
    await user.save();
    await sendCodeToEmail(normalizedEmail);
    res.status(201).json({ message: "Код подтверждения отправлен на почту" });

  } catch (err) {
    console.error("Ошибка регистрации:", err);
    // Эта проверка остаётся как запасной вариант на случай гонки запросов
    if (err.code === 11000) {
      if (err.keyPattern.name) {
        return res.status(400).json({ message: "Это имя пользователя уже занято" });
      }
      if (err.keyPattern.email) {
        return res.status(400).json({ message: "Этот email уже зарегистрирован" });
      }
    }
    res.status(500).json({ message: "Ошибка на стороне сервера при регистрации" });
  }
});
// Server.js

// server.js (РОУТ /api/verify-code)

// 🔹 Проверка кода
app.post("/api/verify-code", async (req, res) => {
  const { email, code } = req.body;

  const normalizedEmail = email.toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) { // Дополнительная проверка на всякий случай
    return res.status(400).json({ message: "Пользователь не найден" });
  }

  try {
    const result = await checkVerificationCode(normalizedEmail, code);

    if (result.ok) {
      const token = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      return res.json({
        ok: true,
        message: result.message || "Почта успешно подтверждена!",
        token,
        user: { name: user.name, email: user.email, isAdmin: user.isAdmin },
      });
    } else {
      // --- 💡 Обработка неверного кода и счетчик попыток (ОСТАВЛЕНО БЕЗ ИЗМЕНЕНИЙ) ---

      // Если код неверен (и не просрочен, что уже отработано в Verification.js)
      if (result.message === "Неверный код.") {

        // Уменьшаем попытки и проверяем на блокировку
        user.codeAttempts = (user.codeAttempts || 0) + 1;

        if (user.codeAttempts >= MAX_ATTEMPTS) {
          const LOCKOUT_PERIOD_MS = 48 * 60 * 60 * 1000;
          user.attemptResetTime = new Date(Date.now()); // Обновляем таймер блокировки

          const unlockTime = new Date(Date.now() + LOCKOUT_PERIOD_MS);
          const hoursRemaining = Math.ceil(LOCKOUT_PERIOD_MS / (1000 * 60 * 60));

          await user.save();

          return res.status(429).json({
            message: `Превышен лимит проверки кода (${MAX_ATTEMPTS}). Попробуйте через ${hoursRemaining} ч.`,
            action: "LIMIT_EXCEEDED",
            attemptsRemaining: 0,
            unlocksAt: unlockTime.toISOString()
          });
        } else {
          await user.save();
        }

        // Добавляем информацию о оставшихся попытках в ответ
        return res.status(400).json({
          message: result.message || "Неверный код",
          attemptsRemaining: MAX_ATTEMPTS - user.codeAttempts
        });
      }

      // Для прочих ошибок (например, "Срок действия кода истек")
      return res.status(400).json({ message: result.message || "Неверный код" });
    }
  } catch (err) {
    console.error("Ошибка проверки кода:", err);
    res.status(500).json({ message: "Ошибка проверки кода" });
  }
});
// ... Server.js (часть с роутами)

// 🔹 Повторная отправка кода
app.post("/api/send-code", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Email обязателен" });
  }
  const normalizedEmail = email.toLowerCase();

  const MAX_ATTEMPTS = 3;
  const LOCKOUT_PERIOD_MS = 48 * 60 * 60 * 1000; // 48 часов в миллисекундах

  try {
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    if (user.v === 1) {
      return res.status(400).json({ message: "Аккаунт уже верифицирован. Попробуйте войти." });
    }

    const now = Date.now();
    const attemptResetTime = user.attemptResetTime.getTime();

    // 1. Проверяем, нужно ли сбросить счетчик (если прошло 48 часов)
    if (now - attemptResetTime > LOCKOUT_PERIOD_MS) {
      user.codeAttempts = 0;
      user.attemptResetTime = new Date(now);
      await user.save();
    }

    // 2. Проверяем лимит после сброса
    if (user.codeAttempts >= MAX_ATTEMPTS) {
      const unlockTime = new Date(attemptResetTime + LOCKOUT_PERIOD_MS);
      const msRemaining = unlockTime.getTime() - now;
      const hoursRemaining = Math.ceil(msRemaining / (1000 * 60 * 60));

      return res.status(429).json({ // 429 Too Many Requests
        message: `Лимит отправки кода (${MAX_ATTEMPTS}) превышен. Попробуйте через ${hoursRemaining} ч.`,
        action: "LIMIT_EXCEEDED",
        attemptsRemaining: 0,
        // Возвращаем время разблокировки, чтобы фронтенд мог это показать
        unlocksAt: unlockTime.toISOString()
      });
    }

    // 3. Увеличиваем счетчик и обновляем attemptResetTime (это важно!)
    user.codeAttempts = (user.codeAttempts || 0) + 1;
    user.attemptResetTime = new Date(now);
    await user.save();

    // Вызов функции, которая отправит код и обновит codeExpiresAt
    await sendCodeToEmail(normalizedEmail);

    res.json({
      message: "Новый код подтверждения отправлен на вашу почту. Он действует 30 минут.",
      attemptsRemaining: MAX_ATTEMPTS - user.codeAttempts // Оставшиеся попытки
    });
  } catch (err) {
    console.error("Ошибка повторной отправки кода:", err);
    res.status(500).json({ message: "Ошибка сервера при отправке кода" });
  }
});
// ...
// Server.js

// 🔹 Логин
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Все поля обязательны" });

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(400).json({ message: "Неверные данные" });

    // 💡 1. ПРОВЕРКА ПАРОЛЯ
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Неверные данные" });

    // 💡 2. ПРОВЕРКА ВЕРИФИКАЦИИ (только если пароль верный)
    if (user.v !== 1) console.log('После проверки v =', user.v);

    return res.status(403).json({
      message: "Email не подтвержден. Требуется верификация.",
      action: "VERIFY_REQUIRED"
    });

    // 💡 3. ГЕНЕРАЦИЯ ТОКЕНА (только если пароль верный И верификация пройдена)
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
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
