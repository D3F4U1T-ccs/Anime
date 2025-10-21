// models/Recommendation.js
const mongoose = require("mongoose");

const RecommendationSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true },
    nameRu: { type: String, required: true },
    thumbnail: { type: String, default: "" },
  },
);

module.exports = mongoose.model("Recommendation", RecommendationSchema);
