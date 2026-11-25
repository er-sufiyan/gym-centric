const dns = require('dns');
const mongoose = require('mongoose');

let cached = global._gymcentricMongoCache;
if (!cached) {
  cached = global._gymcentricMongoCache = { conn: null, promise: null };
}

async function connectWithSrvFallback(uri) {
  try {
    return await mongoose.connect(uri);
  } catch (err) {
    if (String(err.message || '').includes('querySrv')) {
      console.warn('[MongoDB DNS] querySrv failed with local DNS, retrying via 8.8.8.8 / 1.1.1.1...');
      dns.setServers(['8.8.8.8', '1.1.1.1']);
      return await mongoose.connect(uri);
    }
    throw err;
  }
}

const connectDB = async () => {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/gymcentric';
    cached.promise = connectWithSrvFallback(uri)
      .then((m) => {
        console.log(`[MongoDB Connected]: ${m.connection.host}`);
        return m;
      })
      .catch((err) => {
        cached.promise = null;
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
};

module.exports = connectDB;
