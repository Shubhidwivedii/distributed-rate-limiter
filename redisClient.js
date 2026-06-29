require('dotenv').config(); // loads variables from .env into process.env
const { createClient } = require('redis');

const client = createClient({
  url: process.env.REDIS_URL,
});

client.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

// Connect immediately when this file is loaded
(async () => {
  await client.connect();
  console.log('Connected to Redis successfully!');
})();

module.exports = client;
