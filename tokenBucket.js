/**
 * TOKEN BUCKET RATE LIMITER
 * --------------------------
 * Each user has a "bucket" with:
 *   - capacity: max tokens the bucket can ever hold (max burst size)
 *   - tokens: current number of tokens available right now
 *   - lastRefillTimestamp: last time we calculated a refill
 *
 * Refill logic: tokens regenerate continuously over time, at a fixed
 * rate (REFILL_RATE tokens per second). Instead of running a timer in
 * the background, we calculate "how many tokens should have regenerated
 * since the last request" every time a new request comes in. This is
 * more efficient than constantly running background timers for every user.
 */

const BUCKET_CAPACITY = 10;     // max tokens (max burst size)
const REFILL_RATE = 10 / 60;    // tokens added per second (10 tokens per 60 sec)

// Maps userId -> { tokens, lastRefillTimestamp }
const buckets = new Map();

function tokenBucketRateLimiter(req, res, next) {
  const userId = req.ip;
  const now = Date.now();

  if (!buckets.has(userId)) {
    // New user starts with a full bucket
    buckets.set(userId, {
      tokens: BUCKET_CAPACITY,
      lastRefillTimestamp: now,
    });
  }

  const bucket = buckets.get(userId);

  // Step 1: Calculate how many tokens should have refilled since last check
  const secondsSinceLastRefill = (now - bucket.lastRefillTimestamp) / 1000;
  const tokensToAdd = secondsSinceLastRefill * REFILL_RATE;

  // Step 2: Add those tokens, but never exceed the bucket's capacity
  bucket.tokens = Math.min(BUCKET_CAPACITY, bucket.tokens + tokensToAdd);
  bucket.lastRefillTimestamp = now;

  // Step 3: Check if there's at least 1 token available
  if (bucket.tokens < 1) {
    const secondsUntilNextToken = (1 - bucket.tokens) / REFILL_RATE;
    res.set('Retry-After', Math.ceil(secondsUntilNextToken));
    return res.status(429).json({
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Try again in ${Math.ceil(secondsUntilNextToken)} seconds.`,
    });
  }

  // Step 4: Consume 1 token and let the request through
  bucket.tokens -= 1;
  next();
}

module.exports = tokenBucketRateLimiter;