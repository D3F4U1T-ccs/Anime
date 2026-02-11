// models/Recommendation.js
const mongoose = require("mongoose");

const RecommendationSchema = new mongoose.Schema({
  animeId: { type: mongoose.Schema.Types.ObjectId, ref: "Anime", required: true },
}, { timestamps: true, versionKey: false });

// запрет дубликатов по animeId
RecommendationSchema.index({ animeId: 1 }, { unique: true });

module.exports = mongoose.model("Recommendation", RecommendationSchema);
