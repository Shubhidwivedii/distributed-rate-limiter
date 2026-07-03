const express = require('express');
const path = require('path');
const slidingWindowRateLimiter = require('./rateLimiter');

const app = express();
app.set('trust proxy', true); // get real visitor IP behind Render's proxy

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/data', slidingWindowRateLimiter, (req, res) => {
  res.json({
    message: 'Here is your data!',
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});