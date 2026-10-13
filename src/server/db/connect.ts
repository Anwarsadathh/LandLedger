import mongoose from "mongoose";

/**
 * Cached Mongoose connection.
 *
 * Next.js (dev HMR and serverless) can evaluate this module many times, so we
 * memoize the connection on the Node global to avoid opening a new pool on
 * every request / reload.
 */

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  var _mongoose: MongooseCache | undefined;
}

const cache: MongooseCache = global._mongoose ?? { conn: null, promise: null };
global._mongoose = cache;

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  // Read at call time (not module load) so standalone scripts (e.g. the seed)
  // can load dotenv before the first connect. Next loads env before any module.
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error(
      "MONGODB_URI is not set. Copy .env.example to .env.local and paste your MongoDB Atlas connection string.",
    );
  }

  if (!cache.promise) {
    cache.promise = mongoose.connect(MONGODB_URI, {
      // dbName keeps us off the default "test" db even if the URI omits a path.
      dbName: process.env.MONGODB_DB ?? "property_platform",
      bufferCommands: false,
    });
  }

  try {
    cache.conn = await cache.promise;
  } catch (err) {
    cache.promise = null;
    throw err;
  }

  return cache.conn;
}
