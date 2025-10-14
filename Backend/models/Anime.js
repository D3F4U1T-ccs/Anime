const mongoose = require('mongoose');

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
});

module.exports = mongoose.model('Anime', AnimeSchema);
