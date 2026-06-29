const express = require('express');
const slidingWindowRateLimiter = require('./rateLimiter');

const app = express();
const PORT = 3001;

app.use(slidingWindowRateLimiter);

app.get('/api/data', (req, res) => {
  res.json({
    message: 'Here is your data!',
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (req, res) => {
  res.send('Rate limiter (Redis-backed) is running. Try GET /api/data');
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});