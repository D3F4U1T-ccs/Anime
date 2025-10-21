// models/Recommendation.js
const mongoose = require("mongoose");

const RecommendationSchema = new mongoose.Schema({
  animeId: { type: mongoose.Schema.Types.ObjectId, ref: "Anime", required: true },
}, { timestamps: true, versionKey: false });

module.exports = mongoose.model("Recommendation", RecommendationSchema);
