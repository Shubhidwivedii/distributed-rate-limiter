# Distributed Rate Limiter

A rate limiting middleware for Express APIs, implementing two different
algorithms (sliding window and token bucket), backed by Redis for
distributed state across multiple server instances.

## Why I built this

While building API projects, I realized there was no protection against
a user spamming requests. This led me to implement rate limiting myself
— not just use an existing npm package — to actually understand the
underlying algorithms used by real systems like Twitter's API.

## Algorithms implemented

### Sliding Window
Tracks exact timestamps of each request in a rolling time window.
More precise than fixed window limiting — avoids the "burst at window
boundary" problem where a fixed-window limiter could allow nearly double
the intended request count if requests cluster around the window reset.

### Token Bucket
Each user has a bucket of tokens that refill at a steady rate. Allows
short bursts of traffic (using saved-up tokens) while still enforcing
an average rate limit over time. Useful when occasional bursts are
acceptable but sustained high traffic isn't.

## Why Redis (distributed state)

Running the rate limiter with in-memory storage (like a JS Map) only
works correctly on a single server. If multiple instances of the API
run behind a load balancer, each instance would track its own separate
counts — letting a user effectively multiply their limit by hitting
different servers.

Using Redis as shared state means all server instances check the same
source of truth. I verified this by running two separate instances of
the server locally (ports 3000 and 3001), both connected to the same
Redis instance, and confirmed that the combined request count across
both ports — not just each port individually — correctly triggered the
rate limit.

## Tech stack

- Node.js + Express
- Redis (Redis Cloud free tier)
- Deployed on Render

## Running locally

\`\`\`bash
npm install
# Create a .env file with:
# REDIS_URL=your_redis_connection_string
node server.js
\`\`\`

## API

\`\`\`
GET /api/data
\`\`\`
Returns sample data if under the rate limit, or a 429 error with a
retry message if the limit is exceeded.
