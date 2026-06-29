/**
 * SLIDING WINDOW RATE LIMITER — REDIS VERSION
 * ---------------------------------------------
 * Same logic as before (remove old timestamps, count what's left,
 * block if over limit) — but now the timestamp list for each user
 * is stored in Redis instead of a local JS Map. This means multiple
 * servers, all connected to the same Redis instance, will correctly
 * share the same rate-limit state for any given user.
 *
 * Redis data structure used: a "sorted set" (zset). Think of it as
 * a set of items where each item also has a numeric "score" attached,
 * and Redis keeps them sorted by that score automatically. We use the
 * timestamp itself as both the member AND the score — this lets us
 * easily ask Redis "remove everything with a score below X" (i.e.
 * remove timestamps older than our window), which is a single,
 * fast, built-in Redis command instead of a manual loop.
 */

const redisClient = require('./redisClient');

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 10;

async function slidingWindowRateLimiter(req, res, next) {
  const userId = req.ip;
  const key = `rate-limit:${userId}`; // unique Redis key per user
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  try {
    // Step 1: Remove timestamps older than our window
    // ZREMRANGEBYSCORE removes all members with score between
    // 0 and windowStart (i.e., anything older than 60 seconds ago)
    await redisClient.zRemRangeByScore(key, 0, windowStart);

    // Step 2: Count how many timestamps remain (requests in current window)
    const requestCount = await redisClient.zCard(key);

    if (requestCount >= MAX_REQUESTS) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
      });
    }

    // Step 3: Add this request's timestamp to the sorted set
    // We use `now` as both the score and a unique member value
    // (adding randomness avoids collisions if two requests hit the
    // exact same millisecond)
    await redisClient.zAdd(key, {
      score: now,
      value: `${now}-${Math.random()}`,
    });

    // Step 4: Set an expiry on the key so Redis auto-cleans inactive users
    // (otherwise old keys for users who stopped making requests would
    // sit in Redis forever, wasting memory)
    await redisClient.expire(key, Math.ceil(WINDOW_MS / 1000));

    next();
  } catch (err) {
    console.error('Rate limiter error:', err);
    // If Redis itself fails, decide: fail open (allow request) or
    // fail closed (block request). Here we fail open so a Redis
    // outage doesn't take down your whole API — but this is a real
    // design decision worth mentioning in an interview.
    next();
  }
}

module.exports = slidingWindowRateLimiter;