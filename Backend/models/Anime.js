const mongoose = require("mongoose");

const EpisodeSchema = new mongoose.Schema({
  number: { type: Number, required: true },
  url: { type: String, required: true },
  title: { type: String, default: "" }, // 🆕 название эпизода

  // 🎵 Опенинг
  openingStart: { type: String, default: "" },
  openingEnd: { type: String, default: "" },

  // 🎵 Эндинг
  endingStart: { type: String, default: "" },
  endingEnd: { type: String, default: "" },
});

const SeasonSchema = new mongoose.Schema({
  seasonNumber: { type: Number, required: false, default: 1 },
  episodes: [EpisodeSchema],
});

const AnimeSchema = new mongoose.Schema(
  {
    nameRu: { type: String, required: true }, // 🇷🇺 На сайте
    nameEn: { type: String, required: true }, // 🇬🇧 В ссылке (slug)
    rating: { type: Number, required: true },
    description: { type: String, required: true },
    thumbnail: { type: String, required: true },
    dates: [{ type: String, required: true }],

    // 🎬 Массив сезонов, каждый со своими сериями
    seasons: [SeasonSchema],

    // 🎭 Жанры и типы
    genres: [{ type: String }],
    types: [{ type: String }],

    slug: { type: String, required: true, unique: true },
  },
  { versionKey: false, timestamps: true }
);

// 🧩 Генерация slug из английского имени
AnimeSchema.pre("validate", function (next) {
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
