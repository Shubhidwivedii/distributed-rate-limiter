/**
 * SLIDING WINDOW RATE LIMITER — REDIS VERSION
 * ---------------------------------------------
 * Same logic as before (remove old timestamps, count what's left,
 * block if over limit) — but the timestamp list lives in Redis so
 * multiple server instances share the same state.
 */

const redisClient = require('./redisClient');

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 10;

async function slidingWindowRateLimiter(req, res, next) {
  const userId = req.ip;
  const key = `rate-limit:${userId}`;
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  try {
    // Step 1: Remove timestamps older than our window
    await redisClient.zRemRangeByScore(key, 0, windowStart);

    // Step 2: Count how many timestamps remain (requests in current window)
    const requestCount = await redisClient.zCard(key);

    if (requestCount >= MAX_REQUESTS) {
      res.set('X-RateLimit-Limit', MAX_REQUESTS);
      res.set('X-RateLimit-Remaining', 0);
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
      });
    }

    // Step 3: Add this request's timestamp to the sorted set
    await redisClient.zAdd(key, {
      score: now,
      value: `${now}-${Math.random()}`,
    });

    // Step 4: Auto-expire inactive users' keys
    await redisClient.expire(key, Math.ceil(WINDOW_MS / 1000));

    // Step 5: Tell the client how many requests they have left.
    // requestCount is the count BEFORE this request was added, so
    // we subtract (requestCount + 1) to account for this request.
    const remaining = MAX_REQUESTS - (requestCount + 1);
    res.set('X-RateLimit-Limit', MAX_REQUESTS);
    res.set('X-RateLimit-Remaining', remaining);

    next();
  } catch (err) {
    console.error('Rate limiter error:', err);
    next();
  }
}

module.exports = slidingWindowRateLimiter;