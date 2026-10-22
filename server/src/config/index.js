const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

function number(name, fallback) {
  const raw = process.env[name];
  const value = raw === undefined || raw === '' ? fallback : Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

const config = {
  env: process.env.NODE_ENV || 'development',
  port: number('PORT', 5050),
  host: process.env.HOST || '127.0.0.1',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://127.0.0.1:5173',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/juu_mowlee',
  maxAudioMb: number('MAX_AUDIO_MB', 10),
  chatHistoryLimit: number('CHAT_HISTORY_LIMIT', 8),
  requestTimeoutMs: number('REQUEST_TIMEOUT_MS', 180000),
  geminiUrl: (process.env.GEMINI_URL || 'https://generativelanguage.googleapis.com/v1beta').replace(
    /\/$/,
    ''
  ),
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: (process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite').replace(/^models\//, ''),
  geminiTtsModel: (process.env.GEMINI_TTS_MODEL || 'gemini-2.5-flash-preview-tts').replace(/^models\//, ''),
  geminiTtsFallbacks: (process.env.GEMINI_TTS_FALLBACKS || 'gemini-2.5-flash-preview-tts,gemini-3.8-flash-tts,gemini-3.8-flash-lite-tts')
    .split(',')
    .map((name) => name.trim().replace(/^models\//, ''))
    .filter(Boolean),
  pythonAiUrl: (process.env.PYTHON_AI_URL || 'http://127.0.0.1:8000').replace(/\/$/, ''),
};

module.exports = config;
