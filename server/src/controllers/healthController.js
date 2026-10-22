const { asyncHandler } = require('../middleware/errorHandler');
const { checkLlm } = require('../services/llm');
const { checkSpeech } = require('../services/speech');
const { checkPythonAi } = require('../services/pythonAi');
const config = require('../config');
const mongoose = require('mongoose');

const health = asyncHandler(async (_req, res) => {
  const mongoOk = mongoose.connection.readyState === 1;
  res.json({
    ok: mongoOk,
    service: 'juu-mowlee-server',
    mongodb: mongoOk ? 'connected' : 'disconnected',
    time: new Date().toISOString(),
  });
});

const aiStatus = asyncHandler(async (_req, res) => {
  const [llm, speech, python] = await Promise.all([checkLlm(), checkSpeech(), checkPythonAi()]);
  const mongoOk = mongoose.connection.readyState === 1;
  const pythonReady = Boolean(python.ok && (python.stt_ready || python.stt?.ready));
  res.json({
    ok: Boolean(llm.ok && llm.ready && mongoOk),
    mongodb: mongoOk,
    llm,
    speech,
    python: {
      ...python,
      ok: pythonReady,
    },
    config: {
      provider: 'gemini',
      model: config.geminiModel,
      ttsModel: config.geminiTtsModel,
      pythonAiUrl: config.pythonAiUrl,
    },
  });
});

module.exports = { health, aiStatus };
