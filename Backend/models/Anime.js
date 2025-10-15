const mongoose = require("mongoose");

const AnimeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  date: { type: String, required: true },
  rating: { type: Number, required: true },
  description: { type: String, required: true },
  thumbnail: { type: String, required: true },
  episodes: [
    {
      number: Number,
      url: String,
    },
  ],
  slug: { type: String, required: true, unique: true },
});

// 👇 Добавляем автоматическую генерацию slug перед сохранением
AnimeSchema.pre("validate", function (next) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-") // заменяет пробелы и символы на "-"
      .replace(/(^-|-$)+/g, ""); // убирает дефисы в начале/конце
  }
  next();
});

module.exports = mongoose.model("Anime", AnimeSchema);
