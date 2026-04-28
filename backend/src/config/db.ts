import mongoose from 'mongoose';

// ─── connectDB ────────────────────────────────────────────────────────────────
// Establishes a connection to MongoDB Atlas.
// Called once at server startup — Mongoose then manages the connection pool
// automatically (no need to reconnect on every request).
const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    // Fail fast — if the URI is missing the app cannot work at all
    throw new Error('MONGODB_URI environment variable is not set');
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    // Exit so a process manager (PM2 / Docker) can restart cleanly
    process.exit(1);
  }
};

export default connectDB;
