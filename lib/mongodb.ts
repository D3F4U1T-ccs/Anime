import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGO_URI!;

if (!MONGODB_URI) {
  throw new Error("❌ MONGO_URI is not defined in .env file");
}

let isConnected = false;

export async function connectDB() {
  if (isConnected) return;

  const db = await mongoose.connect(MONGODB_URI);
  isConnected = !!db.connections[0].readyState;

  console.log("✅ MongoDB connected");
}
