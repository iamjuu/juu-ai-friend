const { asyncHandler } = require('../middleware/errorHandler');
const { transcribeAudio, synthesizeSpeech } = require('../services/speech');
const { detectSpeakingStyle, descriptionForStyle } = require('../services/emotion');
const Preferences = require('../models/Preferences');

const transcribe = asyncHandler(async (req, res) => {
  if (!req.file?.buffer) {
    return res.status(400).json({
      error: 'invalid_request',
      message: 'ഓഡിയോ ഫയൽ ലഭിച്ചില്ല.',
    });
  }

  const abort = new AbortController();
  const cancelIfClientGone = () => {
    if (!res.writableEnded) abort.abort();
  };
  req.on('aborted', cancelIfClientGone);
  res.on('close', cancelIfClientGone);

  const result = await transcribeAudio({
    buffer: req.file.buffer,
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    signal: abort.signal,
  });

  console.log('[heard]', result.text);
  res.json(result);
});

const synthesize = asyncHandler(async (req, res) => {
  const text = (req.body?.text || '').trim();
  if (!text) {
    return res.status(400).json({
      error: 'invalid_request',
      message: 'വായിക്കാനുള്ള വാചകം ശൂന്യമാണ്.',
    });
  }

  const preferences = await Preferences.findOne({ userId: 'local' });
  const speakingStyle =
    req.body?.speakingStyle ||
    detectSpeakingStyle(text, preferences?.preferredSpeakingStyle || 'friendly');
  const voice = req.body?.voice || preferences?.preferredVoice || 'Anjali';

  const abort = new AbortController();
  const cancelIfClientGone = () => {
    if (!res.writableEnded) abort.abort();
  };
  req.on('aborted', cancelIfClientGone);
  res.on('close', cancelIfClientGone);

  const audio = await synthesizeSpeech({
    text,
    voice,
    speakingStyle,
    description: req.body?.description || descriptionForStyle(speakingStyle, voice),
    signal: abort.signal,
  });

  res.json(audio);
});

module.exports = { transcribe, synthesize };
