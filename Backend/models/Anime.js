const mongoose = require("mongoose");

const EpisodeSchema = new mongoose.Schema({
  number: { type: Number, required: true },
  url: { type: String, required: true },
});

const SeasonSchema = new mongoose.Schema({
  seasonNumber: { type: Number, required: true },
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

  slug: { type: String, required: true, unique: true },
});

// 🧩 Генерация slug из английского имени
AnimeSchema.pre("validate", function (next) {
  if (!this.slug && this.nameEn) {
    this.slug = this.nameEn
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  }
  next();
});

module.exports = mongoose.model("Anime", AnimeSchema);
