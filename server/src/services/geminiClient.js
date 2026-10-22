const https = require('https');
const axios = require('axios');
const config = require('../config');

const agent = new https.Agent({
  keepAlive: true,
  maxSockets: 12,
  maxFreeSockets: 6,
});

const gemini = axios.create({
  httpsAgent: agent,
  timeout: config.requestTimeoutMs,
  headers: {
    'x-goog-api-key': config.geminiApiKey,
    'Content-Type': 'application/json',
  },
});

function modelUrl(model, method = 'generateContent') {
  return `${config.geminiUrl}/models/${model}:${method}`;
}

module.exports = { gemini, modelUrl };
