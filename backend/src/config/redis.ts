import Redis from 'ioredis';

// Ensure the REDIS_URL exists in your .env
const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  console.warn('⚠️ REDIS_URL not found. Caching will fail if executed.');
}

// Initialize ioredis instance connecting to Upstash
// Upstash uses redis/rediss URLs directly
const redis = new Redis(redisUrl || '', {
  // If connection fails, don't block the whole app from starting up.
  // In a robust app, you might want to handle this gracefully.
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    // Retry connection every 3 seconds up to 3 times
    if (times > 3) {
      console.error('❌ Redis connection failed repeatedly.');
      return null;
    }
    return Math.min(times * 1000, 3000);
  },
});

redis.on('connect', () => {
  console.log('✅ Connected to Upstash Redis');
});

redis.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
});

export default redis;
