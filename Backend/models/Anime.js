const mongoose = require("mongoose");

const EpisodeSchema = new mongoose.Schema({
  number: { type: Number, required: true },
  url: { type: String, required: true },
});

const SeasonSchema = new mongoose.Schema({
  seasonNumber: { type: Number, required: false, default: 1 },

  episodes: [EpisodeSchema],
});

const AnimeSchema = new mongoose.Schema({
  nameRu: { type: String, required: true }, // 🇷🇺 На сайте
  nameEn: { type: String, required: true }, // 🇬🇧 В ссылке (slug)
  date: { type: String, required: true },
  rating: { type: Number, required: true },
  description: { type: String, required: true },
  thumbnail: { type: String, required: true },

  // 🎬 Массив сезонов, каждый со своими сериями
  seasons: [SeasonSchema],

  // 🎭 Жанры (массив строк)
  genres: [{ type: String }],

  types: [{ type: String }],

  slug: { type: String, required: true, unique: true },
}, { versionKey: false, timestamps: true }); // ← вот сюда


// 🧩 Генерация slug из английского имени
AnimeSchema.pre("validate", function (next) {
  // если slug уже есть — не трогаем
  if (this.slug) return next();

  if (this.nameEn) {
    this.slug = this.nameEn
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  }
  next();
});


module.exports = mongoose.model("Anime", AnimeSchema);
