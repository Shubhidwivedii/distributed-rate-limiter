# Distributed Rate Limiter

A production-style rate limiting middleware for Express APIs, implementing
two algorithms (sliding window and token bucket), backed by Redis for
correct distributed state across multiple server instances.

## Live Demo

https://distributed-rate-limiter-8fcq.onrender.com

> Note: Hosted on Render free tier — may take 30-60 seconds to wake up
> if inactive. Once awake, the demo is fully interactive.

## Why I built this

While building API projects, I realized there was no protection against
a user spamming requests. This led me to implement rate limiting myself
— not just use an existing npm package — to understand the underlying
algorithms used by real systems like Twitter's API.

## Algorithms implemented

### Sliding Window
Tracks exact timestamps of each request in a rolling time window using
a queue (deque) data structure. More precise than fixed window limiting
— avoids the boundary burst problem where a fixed-window limiter could
allow nearly double the intended request count at window edges.

### Token Bucket
Each user has a bucket of tokens that refill at a steady rate. Allows
short bursts of traffic while still enforcing an average rate over time.
The refill is calculated lazily on each request (no background timers)
using elapsed time since the last request.

## Why Redis (distributed state)

In-memory storage (like a JS Map) only works correctly on a single
server. Multiple instances behind a load balancer each track their own
separate counts, letting users bypass limits by hitting different servers.

Redis as shared state means all instances check the same source of
truth. Verified by running two server instances simultaneously (ports
3000 and 3001) and confirming the combined request count — not each
port's individual count — correctly triggered the rate limit.

## Load test results

Tested with autocannon (20 concurrent connections, 10 seconds):
- 319 total requests fired
- 20 allowed (2xx)
- 279 correctly blocked with 429 (87% rejection rate under load)

## Tech stack

- Node.js + Express
- Redis (Redis Cloud free tier)
- Deployed on Render

## Running locally

```bash
npm install
```

Create a `.env` file:
```
REDIS_URL=your_redis_connection_string
```

```bash
node server.js
```

Visit `http://localhost:3000` for the interactive demo.

## API