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
const Recommendation = require("./models/Recommendation");
const { sendCodeToEmail, checkVerificationCode } = require("./Verification");
const verifyAdmin = require("./middleware/verifyAdmin");
const User = require("./models/User");
// 🎬 Прокси для видео (решает CORS и временные ссылки)
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const stream = require("stream");


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
// === ПРОКСИ (только проксирование) ===
app.get("/proxy", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send("❌ Не указана ссылка (url)");

  try {
    console.log("🎥 Проксирую видео:", targetUrl);

    const response = await fetch(targetUrl, {
      headers: { Range: req.headers.range || "" },
    });

    if (!response.ok) {
      return res.status(response.status).send(`Ошибка загрузки: ${response.statusText}`);
    }

    // Переносим базовые заголовки, чтобы работало перематывание
    res.setHeader("Content-Type", response.headers.get("content-type") || "video/mp4");
    if (response.headers.get("content-length"))
      res.setHeader("Content-Length", response.headers.get("content-length"));
    if (response.headers.get("accept-ranges"))
      res.setHeader("Accept-Ranges", response.headers.get("accept-ranges"));
    if (response.status === 206) res.status(206);

    // Потоковая передача
    const passThrough = new stream.PassThrough();
    response.body.pipe(passThrough);
    passThrough.pipe(res);
  } catch (err) {
    console.error("Ошибка при проксировании видео:", err);
    res.status(500).send("Ошибка при проксировании видео");
  }
});

// ===== Recommendations (store animeId + populate) =====

// GET /api/recommendations?limit=8
// server.js — recommendations (use animeId + populate)
app.get("/api/recommendations", async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 8));
    // populate so front gets full anime with seasons/episodes
    const recs = await Recommendation.find().sort({ createdAt: -1 }).limit(limit).populate("animeId");
    const formatted = recs.map(r => ({ _id: r._id, anime: r.animeId }));
    return res.json(formatted);
  } catch (err) {
    console.error("Ошибка при получении рекомендаций:", err);
    return res.status(500).json({ message: "Ошибка сервера" });
  }
});

app.post("/api/recommendations", verifyAdmin, async (req, res) => {
  try {
    const { animeId } = req.body;
    if (!animeId || !mongoose.Types.ObjectId.isValid(animeId)) {
      return res.status(400).json({ message: "Неверный animeId" });
    }
    const anime = await Anime.findById(animeId);
    if (!anime) return res.status(404).json({ message: "Аниме с таким id не найдено" });

    const exists = await Recommendation.findOne({ animeId });
    if (exists) return res.status(400).json({ message: "Эта рекомендация уже добавлена" });

    const rec = new Recommendation({ animeId });
    await rec.save();
    await rec.populate("animeId");
    return res.status(201).json({ _id: rec._id, anime: rec.animeId });
  } catch (err) {
    console.error("POST /api/recommendations error:", err);
    return res.status(500).json({ message: "Ошибка сервера" });
  }
});

app.delete("/api/recommendations/:id", verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Неверный id" });
    const deleted = await Recommendation.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Рекомендация не найдена" });
    return res.json({ message: "Удалено" });
  } catch (err) {
    console.error("DELETE /api/recommendations/:id error:", err);
    return res.status(500).json({ message: "Ошибка сервера" });
  }
});

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


// PUT /api/anime/:id — обновление аниме
app.put('/api/anime/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Неверный id' });
    const update = req.body;
    // Приводим rating к числу и делаем минимальную валидацию
    if (update.rating !== undefined) update.rating = Number(update.rating) || 0;

    // Опционально: нормализовать slug как в add
    if (update.slug) update.slug = String(update.slug).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    const anime = await Anime.findById(id);
    if (!anime) return res.status(404).json({ message: 'Аниме не найдено' });

    // Записываем поля
    Object.assign(anime, update);
    await anime.save();
    res.json({ message: 'Сохранено', anime });
  } catch (err) {
    console.error('PUT /api/anime/:id error:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// DELETE /api/anime/:id — уже может быть в вашем server.js; если нет, вот простой вариант:
app.delete('/api/anime/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Неверный id' });
    const del = await Anime.findByIdAndDelete(id);
    if (!del) return res.status(404).json({ message: 'Не найдено' });
    res.json({ message: 'Удалено' });
  } catch (err) {
    console.error('DELETE /api/anime/:id error:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});



// 🔹 Добавление аниме (только админ)
app.post("/api/anime/add", verifyAdmin, async (req, res) => {
  try {
    console.log("📩 Получено тело запроса:", JSON.stringify(req.body, null, 2));
    const {
      nameRu,
      nameEn,
      slug: providedSlug,
      dates,
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
        seasonNumber: Number(season.seasonNumber) || i + 1,
        episodes: Array.isArray(season.episodes)
          ? season.episodes.map((ep, j) => ({
            number: Number(ep.number) || j + 1,
            url: ep.url?.trim() || "",
            title: ep.title?.trim() || "",
            openingStart: ep.openingStart?.trim() || "",
            openingEnd: ep.openingEnd?.trim() || "",
            endingStart: ep.endingStart?.trim() || "",
            endingEnd: ep.endingEnd?.trim() || "",
          }))
          : [],
      }))
      : [];



    const newAnime = new Anime({
      nameRu: nameRu.trim(),
      nameEn: nameEn.trim(),
      slug: finalSlug,
      dates: Array.isArray(dates) ? dates.filter(Boolean) : [],
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

// 📺 Получить конкретный эпизод по slug, сезону и номеру серии
app.get("/api/anime/:slug/season-:seasonNumber/episode-:episodeNumber", async (req, res) => {
  try {
    const { slug, seasonNumber, episodeNumber } = req.params;

    // 1️⃣ Находим аниме по slug
    const anime = await Anime.findOne({ slug });
    if (!anime) return res.status(404).json({ message: "Аниме не найдено" });

    // 2️⃣ Находим нужный сезон
    const season = anime.seasons.find(
      (s) => s.seasonNumber === Number(seasonNumber)
    );
    if (!season) return res.status(404).json({ message: "Сезон не найден" });

    // 3️⃣ Находим нужный эпизод
    const episode = season.episodes.find(
      (e) => e.number === Number(episodeNumber)
    );
    if (!episode) return res.status(404).json({ message: "Эпизод не найден" });

    // 4️⃣ Отправляем всё в ответ
    res.json({ anime, season, episode });
  } catch (err) {
    console.error("Ошибка при получении эпизода:", err);
    res.status(500).json({ message: "Ошибка сервера" });
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
      return res.status(400).json({ message: "Этот email уже зарегистрирован попробуйте войти!" });
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
        return res.status(400).json({ message: "Этот email уже зарегистрирован попробуйте войти!" });
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
        { userId: user._id, email: user.email, isAdmin: user.isAdmin },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
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

app.post("/api/send-code", async (req, res) => {
  const { email, checkOnly } = req.body;
  if (!email) return res.status(400).json({ message: "Email обязателен" });

  const normalizedEmail = email.toLowerCase();
  const MAX_ATTEMPTS = 3;
  const LOCKOUT_PERIOD_MS = 48 * 60 * 60 * 1000; // 48 часов
  const now = Date.now();

  try {
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(404).json({ message: "Пользователь не найден" });
    if (user.v === 1) return res.status(400).json({ message: "Аккаунт уже верифицирован." });

    const attemptResetTime = user.attemptResetTime ? user.attemptResetTime.getTime() : 0;

    // 🟢 Если просто проверяем лимит
    if (checkOnly) {
      if (user.codeAttempts >= MAX_ATTEMPTS && now - attemptResetTime < LOCKOUT_PERIOD_MS) {
        const unlockTime = new Date(attemptResetTime + LOCKOUT_PERIOD_MS);
        return res.status(429).json({
          action: "LIMIT_EXCEEDED",
          message: "Превышен лимит проверки кода. Подождите немного.",
          unlocksAt: unlockTime.toISOString()
        });
      }
      return res.json({
        attemptsRemaining: Math.max(0, MAX_ATTEMPTS - user.codeAttempts)
      });
    }

    // 🟠 Если прошло 48 часов — сбрасываем попытки
    if (!user.attemptResetTime || now - attemptResetTime > LOCKOUT_PERIOD_MS) {
      user.codeAttempts = 0;
      user.attemptResetTime = new Date(now);
      await user.save();
    }

    // 🔴 Проверка лимита
    if (user.codeAttempts >= MAX_ATTEMPTS) {
      const unlockTime = new Date(attemptResetTime + LOCKOUT_PERIOD_MS);
      const hoursRemaining = Math.ceil((unlockTime - now) / (1000 * 60 * 60));
      return res.status(429).json({
        message: `Лимит (${MAX_ATTEMPTS}) превышен. Попробуйте через ${hoursRemaining} ч.`,
        action: "LIMIT_EXCEEDED",
        attemptsRemaining: 0,
        unlocksAt: unlockTime.toISOString()
      });
    }

    // 📨 Отправка кода
    user.codeAttempts = (user.codeAttempts || 0) + 1;
    user.attemptResetTime = new Date(now);
    await user.save();

    await sendCodeToEmail(normalizedEmail);

    res.json({
      message: "Новый код подтверждения отправлен на вашу почту.",
      attemptsRemaining: MAX_ATTEMPTS - user.codeAttempts
    });

  } catch (err) {
    console.error("Ошибка повторной отправки кода:", err);
    res.status(500).json({ message: "Ошибка сервера при отправке кода" });
  }
});

// GET /api/openings — возвращает список аниме с подсчитанными метриками и первичными OP/ED временами
app.get('/api/openings', async (req, res) => {
  try {
    // берём нужные поля (включая seasons для подсчётов)
    const items = await Anime.find({}, {
      nameRu: 1,
      nameEn: 1,
      slug: 1,
      thumbnail: 1,
      seasons: 1,
      rating: 1,
      dates: 1
    }).lean();

    const result = (items || []).map(i => {
      const seasons = Array.isArray(i.seasons) ? i.seasons : [];
      const seasonsCount = seasons.length;

      // подсчёт эпизодов — берём безопасно, если episodes — массив или объект
      const episodesCount = seasons.reduce((sum, s) => {
        if (!s) return sum;
        const eps = s.episodes;
        if (Array.isArray(eps)) return sum + eps.length;
        if (eps && typeof eps === 'object') return sum + Object.keys(eps).length;
        return sum;
      }, 0);

      // Найдём первые встретившиеся OP/ED времена (обычно в серии 1)
      let openingStart = null, openingEnd = null, endingStart = null, endingEnd = null;
      outer: for (const s of seasons) {
        if (!s || !s.episodes) continue;
        const eps = Array.isArray(s.episodes) ? s.episodes : Object.values(s.episodes || {});
        for (const ep of eps) {
          if (!openingStart && ep?.openingStart) openingStart = ep.openingStart;
          if (!openingEnd && ep?.openingEnd) openingEnd = ep.openingEnd;
          if (!endingStart && ep?.endingStart) endingStart = ep.endingStart;
          if (!endingEnd && ep?.endingEnd) endingEnd = ep.endingEnd;
          if (openingStart && openingEnd && endingStart && endingEnd) break outer;
        }
      }

      // rating и firstAirYear (если есть dates — берем первый год)
      const rating = (i.rating !== undefined && i.rating !== null) ? Number(i.rating) : null;
      let firstAirYear = null;
      if (Array.isArray(i.dates) && i.dates.length > 0) {
        try {
          const d = new Date(i.dates[0]);
          if (!isNaN(d.getTime())) firstAirYear = d.getFullYear();
        } catch { }
      }

      return {
        _id: i._id,
        nameRu: i.nameRu || '',
        nameEn: i.nameEn || '',
        slug: i.slug || '',
        thumbnail: i.thumbnail || '',
        seasonsCount,
        episodesCount,
        openingStart: openingStart ?? null,
        openingEnd: openingEnd ?? null,
        endingStart: endingStart ?? null,
        endingEnd: endingEnd ?? null,
        rating,
        firstAirYear
      };
    });

    return res.json(result);
  } catch (err) {
    console.error('GET /api/openings error:', err);
    return res.status(500).json({ message: 'Ошибка сервера' });
  }
});



// GET /api/openings/:identifier — возвращает anime, но без полей openingStart/openingEnd в эпизодах
app.get('/api/openings/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    if (!identifier) return res.status(400).json({ message: "Нет параметра identifier" });

    let anime = null;
    // пробуем ObjectId
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      anime = await Anime.findById(identifier).lean();
      if (anime) return res.json(sanitizeOpeningsAnime(anime));
    }

    // иначе — по slug (используем normalizeSlug)
    const normalized = normalizeSlug(identifier);
    anime = await Anime.findOne({ slug: normalized }).lean();
    if (!anime) return res.status(404).json({ message: "Аниме не найдено" });

    res.json(sanitizeOpeningsAnime(anime));
  } catch (err) {
    console.error('GET /api/openings/:identifier error:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Вспомогательная функция: клонируем объект и удаляем опенинг-поля из эпизодов
function sanitizeOpeningsAnime(animeObj) {
  try {
    // глубокая копия (lean() уже даёт plain object, но клонирую, чтобы безопасно менять)
    const out = JSON.parse(JSON.stringify(animeObj));
    if (Array.isArray(out.seasons)) {
      out.seasons.forEach(season => {
        if (Array.isArray(season.episodes)) {
          season.episodes.forEach(ep => {
            // удаляем поля, связанные с опенингом (если они есть)
            delete ep.openingStart;
            delete ep.openingEnd;
            // при желании можно удалить любые другие поля, например ending*
          });
        }
      });
    }
    return out;
  } catch (err) {
    console.error('sanitizeOpeningsAnime error:', err);
    return animeObj;
  }
}
// GET /api/openings — список аниме с информацией об опенингах и эндингах
app.get("/api/openings", async (req, res) => {
  try {
    const items = await Anime.find(
      {},
      {
        nameRu: 1,
        nameEn: 1,
        slug: 1,
        thumbnail: 1,
        seasons: 1,
        rating: 1,
        dates: 1,
      }
    );

    // Подсчитываем информацию для каждой записи
    const formatted = items.map((anime) => {
      const seasons = Array.isArray(anime.seasons) ? anime.seasons : [];
      const seasonsCount = seasons.length;
      const episodesCount = seasons.reduce(
        (acc, s) => acc + (s.episodes?.length || 0),
        0
      );

      // Ищем первый опенинг и эндинг
      let openingStart = null;
      let openingEnd = null;
      let endingStart = null;
      let endingEnd = null;

      for (const s of seasons) {
        for (const e of s.episodes || []) {
          if (e.openingStart && !openingStart) openingStart = e.openingStart;
          if (e.openingEnd && !openingEnd) openingEnd = e.openingEnd;
          if (e.endingStart && !endingStart) endingStart = e.endingStart;
          if (e.endingEnd && !endingEnd) endingEnd = e.endingEnd;
        }
      }

      // Год первой даты (если есть)
      const firstAirYear =
        Array.isArray(anime.dates) && anime.dates.length > 0
          ? new Date(anime.dates[0]).getFullYear()
          : null;

      return {
        _id: anime._id,
        nameRu: anime.nameRu,
        nameEn: anime.nameEn,
        slug: anime.slug,
        thumbnail: anime.thumbnail,
        seasonsCount,
        episodesCount,
        openingStart,
        openingEnd,
        endingStart,
        endingEnd,
        rating: anime.rating ?? null,
        firstAirYear,
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error("Ошибка при получении /api/openings:", err);
    res.status(500).json({ message: "Ошибка при получении списка опенингов" });
  }
});


// GET /api/openings/:slug/season-:seasonNumber/episode-:episodeNumber
app.get("/api/openings/:slug/season-:seasonNumber/episode-:episodeNumber", async (req, res) => {
  try {
    const { slug, seasonNumber, episodeNumber } = req.params;

    const anime = await Anime.findOne({ slug });
    if (!anime) return res.status(404).json({ message: "Аниме не найдено" });

    const season = (anime.seasons || []).find(s => s.seasonNumber === Number(seasonNumber));
    if (!season) return res.status(404).json({ message: "Сезон не найден" });

    const episode = (season.episodes || []).find(e => e.number === Number(episodeNumber));
    if (!episode) return res.status(404).json({ message: "Эпизод не найден" });

    // клонируем и удаляем опенинг-поля (чтобы на OpeningEpisode не было опенинг-меток)
    const episodeCopy = JSON.parse(JSON.stringify(episode));
    delete episodeCopy.openingStart;
    delete episodeCopy.openingEnd;
    // при желании: delete episodeCopy.endingStart; delete episodeCopy.endingEnd;

    // сюда можно вернуть и небольшой объект anime (без лишних полей) и season
    const animeCopy = sanitizeOpeningsAnime ? sanitizeOpeningsAnime(anime) : JSON.parse(JSON.stringify(anime));

    return res.json({ anime: animeCopy, season: { ...season, episodes: undefined }, episode: episodeCopy });
  } catch (err) {
    console.error("GET /api/openings episode error:", err);
    res.status(500).json({ message: "Ошибка сервера" });
  }
});

// 🔹 Логин
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Все поля обязательны" });

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(400).json({ message: "Неверные данные" });

    // 💡 Проверяем пароль
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Неверные данные" });

    // 💡 Проверяем верификацию
    if (user.v !== 1) {
      console.log('После проверки v =', user.v);
      return res.status(403).json({
        message: "Email не подтвержден. Требуется верификация.",
        action: "VERIFY_REQUIRED"
      });
    }

    // 💡 Если всё ок — выдаём токен
    const token = jwt.sign(
      { userId: user._id, email: user.email, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
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