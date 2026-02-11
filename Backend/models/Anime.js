const mongoose = require("mongoose");

const EpisodeSchema = new mongoose.Schema({
  number: { type: Number, required: true },
  url: { type: String, required: true },
  title: { type: String, default: "" },

  // Опенинг
  openingStart: { type: String, default: "" },
  openingEnd: { type: String, default: "" },

  // Эндинг
  endingStart: { type: String, default: "" },
  endingEnd: { type: String, default: "" },
});

const SeasonSchema = new mongoose.Schema({
  seasonNumber: { type: Number, required: false, default: 1 },
  episodes: [EpisodeSchema],
});

// Movie subdocument (опционально внутри Anime)
const MovieSchema = new mongoose.Schema({
  name: { type: String, default: "" }, // название фильма (необязательно)
  url: { type: String, default: "" },  // ссылка на видео (необязательно)
}, { _id: false });

const AnimeSchema = new mongoose.Schema(
  {
    nameRu: { type: String, required: true },
    nameEn: { type: String, required: true },
    rating: { type: Number, required: true },
    description: { type: String, required: true },
    thumbnail: { type: String, required: true },
    dates: [{ type: String, required: true }],

    // Сезоны и эпизоды
    seasons: [SeasonSchema],

    // Опциональный массив фильмов (movies)
    movies: [MovieSchema],

    // Жанры и типы
    genres: [{ type: String }],
    types: [{ type: String }],

    slug: { type: String, required: true, unique: true },
  },
  { versionKey: false, timestamps: true }
);

// Генерация slug из nameEn если slug не задан
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
