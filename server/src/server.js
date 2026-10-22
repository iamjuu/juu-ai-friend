const mongoose = require('mongoose');
const app = require('./app');
const config = require('./config');

async function start() {
  try {
    await mongoose.connect(config.mongodbUri);
    console.log(`MongoDB connected: ${config.mongodbUri}`);
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  }

  const server = app.listen(config.port, config.host, () => {
    console.log(`Juu Pennu API listening on http://${config.host}:${config.port}`);
  });

  server.requestTimeout = config.requestTimeoutMs;
  server.headersTimeout = config.requestTimeoutMs + 5000;

  const shutdown = async () => {
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start();
