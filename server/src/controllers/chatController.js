const Conversation = require('../models/Conversation');
const { asyncHandler } = require('../middleware/errorHandler');
const { chatWithLlm } = require('../services/llm');
const { synthesizeSpeech } = require('../services/speech');
const { detectSpeakingStyle, descriptionForStyle } = require('../services/emotion');
const { WELCOME } = require('./conversationController');
const { getOrCreate } = require('./preferencesController');

function titleFromText(text) {
  const compact = (text || '').replace(/\s+/g, ' ').trim();
  if (!compact) return 'പുതിയ സംഭാഷണം';
  return compact.length > 36 ? `${compact.slice(0, 36)}…` : compact;
}

async function loadPreferences() {
  return getOrCreate();
}

const chat = asyncHandler(async (req, res) => {
  const text = (req.body?.text || '').trim();
  if (!text) {
    return res.status(400).json({
      error: 'invalid_request',
      message: 'സന്ദേശം ശൂന്യമാണ്.',
    });
  }
  if (text.length > 4000) {
    return res.status(400).json({
      error: 'invalid_request',
      message: 'സന്ദേശം വളരെ നീളമുള്ളതാണ്.',
    });
  }

  const speak = Boolean(req.body?.speak);
  const preferences = await loadPreferences();
  let conversation = null;

  if (req.body?.conversationId) {
    conversation = await Conversation.findOne({
      _id: req.body.conversationId,
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    });
    if (!conversation) {
      return res.status(404).json({
        error: 'not_found',
        message: 'സംഭാഷണം കണ്ടെത്തിയില്ല.',
      });
    }
  } else {
    conversation = await Conversation.create({
      title: titleFromText(text),
      messages: [
        {
          role: 'assistant',
          text: WELCOME,
          timestamp: new Date(),
        },
      ],
    });
  }

  const history = conversation.messages.map((msg) => ({
    role: msg.role,
    text: msg.text,
  }));

  const abort = new AbortController();
  const cancelIfClientGone = () => {
    if (!res.writableEnded) abort.abort();
  };
  req.on('aborted', cancelIfClientGone);
  res.on('close', cancelIfClientGone);

  const mood = detectSpeakingStyle(text, preferences.preferredSpeakingStyle || 'friendly');
  const reply = await chatWithLlm({
    history,
    userText: text,
    responseLength: req.body?.responseLength || preferences.responseLength,
    speakingStyle: mood,
    signal: abort.signal,
  });

  const speakingStyle = detectSpeakingStyle(`${text}\n${reply}`, mood);
  const voice = req.body?.voice || preferences.preferredVoice;
  console.log('[Juu]', text);
  console.log('[Juu Pennu]', reply);

  conversation.messages.push({ role: 'user', text, timestamp: new Date() });
  conversation.messages.push({
    role: 'assistant',
    text: reply,
    timestamp: new Date(),
    audio: speak ? { speakingStyle, voice } : undefined,
  });
  if (conversation.messages.filter((msg) => msg.role === 'user').length === 1) {
    conversation.title = titleFromText(text);
  }

  const payload = {
    conversationId: conversation.id,
    conversation,
    userMessage: text,
    assistantMessage: reply,
    speakingStyle,
    voice,
  };

  const saveJob = conversation.save();
  if (speak) {
    try {
      const audio = await synthesizeSpeech({
        text: reply,
        voice,
        speakingStyle,
        description: descriptionForStyle(speakingStyle, voice),
        signal: abort.signal,
      });
      payload.audioBase64 = audio.audioBase64;
      payload.audioMimeType = audio.mimeType;
      payload.ttsBackend = audio.backend;
      payload.expressive = audio.expressive;
    } catch (err) {
      payload.ttsError = err.publicMessage || 'ശബ്ദം ഉണ്ടാക്കാൻ കഴിഞ്ഞില്ല.';
    }
  }
  await saveJob;

  res.json(payload);
});

module.exports = { chat };
