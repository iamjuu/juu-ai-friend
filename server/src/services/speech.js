const config = require('../config');
const { gemini, modelUrl } = require('./geminiClient');
const { synthesizeMalayalam } = require('./malayalamTts');

const VOICE_MAP = {
  Anjali: 'Kore',
  Anju: 'Aoede',
  Harish: 'Puck',
};

const STYLE_MAP = {
  caring: 'very gentle, close, slow, and full of warmth, like a friend who cares',
  calm: 'soft, soothing, and unhurried, with a calm smile in the voice',
  happy: 'bright, smiling, and cheerful, with a lively lift in pitch',
  excited: 'excited, delighted, and energetic, a little faster and sparkling',
  sympathetic: 'tender, aching with kindness, slower, with gentle pauses',
  friendly: 'warm, playful, and expressive, like a close Malayalam friend',
  reassuring: 'steady, kind, and protective, with a comforting closeness',
  neutral: 'clear, natural, and still a little warm',
};

function requireApiKey() {
  if (config.geminiApiKey) return;
  const error = new Error('GEMINI_API_KEY is not set');
  error.status = 503;
  error.code = 'speech_unconfigured';
  error.publicMessage = 'Add GEMINI_API_KEY in the project .env file.';
  throw error;
}

function speechError(err, fallbackCode, fallbackMessage) {
  if (err.code === 'ERR_CANCELED' || err.name === 'CanceledError') {
    const error = new Error('Speech request cancelled');
    error.status = 499;
    error.code = 'cancelled';
    error.publicMessage = 'Request cancelled.';
    throw error;
  }
  if (err.publicMessage) throw err;
  const error = new Error(err.response?.data?.error?.message || err.message);
  error.status = err.response?.status === 429 ? 429 : 503;
  error.code = fallbackCode;
  error.publicMessage = fallbackMessage;
  throw error;
}

function speakableText(text, maxChars = 280) {
  const compact = String(text || '').replace(/\s+/g, ' ').trim();
  if (compact.length <= maxChars) return compact;
  const pieces = compact.split(/(?<=[।.!?…\n])\s+/).filter(Boolean);
  let out = '';
  for (const piece of pieces) {
    const next = out ? `${out} ${piece}` : piece;
    if (out && next.length > maxChars) break;
    out = next;
    if (out.length >= 160 && pieces.indexOf(piece) >= 1) break;
  }
  return out || compact.slice(0, maxChars);
}

function parsePcmRate(mimeType) {
  const match = String(mimeType || '').match(/rate=(\d+)/i);
  return match ? Number(match[1]) : 24000;
}

function pcmToWavBase64(audioBase64, sampleRate = 24000) {
  const pcm = Buffer.from(audioBase64, 'base64');
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]).toString('base64');
}

function normalizeAudio(audio) {
  if (!audio?.audioBase64) return audio;
  const mime = audio.mimeType || 'audio/wav';
  if (/audio\/l16|pcm/i.test(mime) && !/wav/i.test(mime)) {
    return {
      audioBase64: pcmToWavBase64(audio.audioBase64, parsePcmRate(mime)),
      mimeType: 'audio/wav',
    };
  }
  return {
    audioBase64: audio.audioBase64,
    mimeType: mime.startsWith('audio/') ? mime : 'audio/wav',
  };
}

function extractInlineAudio(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const inline = parts.find((part) => part.inlineData?.data)?.inlineData;
  if (!inline?.data) return null;
  return {
    audioBase64: inline.data,
    mimeType: inline.mimeType || 'audio/wav',
  };
}

function extractText(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts
    .map((part) => part.text || '')
    .join('')
    .trim();
}

async function checkSpeech() {
  if (!config.geminiApiKey) {
    return {
      ok: false,
      ready: false,
      provider: 'gemini',
      stt_ready: false,
      tts_ready: false,
      error: 'GEMINI_API_KEY is not set',
    };
  }

  return {
    ok: true,
    ready: true,
    provider: 'gemini',
    stt_ready: true,
    tts_ready: true,
    model: config.geminiTtsModel,
  };
}

let fastSttSupported = true;

async function requestTranscript(buffer, mimetype, signal, fast = true) {
  const generationConfig = {
    temperature: 0,
    maxOutputTokens: 160,
  };
  if (fast) {
    generationConfig.thinkingConfig = { thinkingBudget: 0 };
    generationConfig.mediaResolution = 'MEDIA_RESOLUTION_LOW';
  }

  return gemini.post(
    modelUrl(config.geminiModel),
    {
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: mimetype || 'audio/webm',
                data: buffer.toString('base64'),
              },
            },
            {
              text: 'Transcribe only the spoken words. Malayalam speech must be Malayalam script. No quotes or extra text.',
            },
          ],
        },
      ],
      generationConfig,
    },
    {
      signal,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    }
  );
}

async function transcribeAudio({ buffer, mimetype, originalname, signal }) {
  try {
    const python = require('./pythonAi');
    const health = await python.checkPythonAi();
    if (health.ok && (health.stt_ready || health.stt?.ready)) {
      return await python.transcribeAudio({ buffer, originalname, mimetype, signal });
    }
  } catch (err) {
    if (err.code === 'empty_transcript') throw err;
    console.warn('Python STT unavailable, trying Gemini:', err.publicMessage || err.message);
  }

  requireApiKey();

  try {
    let data;
    try {
      ({ data } = await requestTranscript(buffer, mimetype, signal, fastSttSupported));
    } catch (err) {
      if (!fastSttSupported || err.response?.status !== 400) throw err;
      fastSttSupported = false;
      ({ data } = await requestTranscript(buffer, mimetype, signal, false));
    }

    const text = extractText(data);
    if (!text) {
      const error = new Error('Empty transcription');
      error.status = 422;
      error.code = 'empty_transcript';
      error.publicMessage = 'Could not understand the speech. Please try again.';
      throw error;
    }

    return {
      text,
      language: 'ml',
      backend: 'gemini',
    };
  } catch (err) {
    speechError(
      err,
      'stt_unavailable',
      'Speech recognition is unavailable. Check the Gemini API key and try again.'
    );
  }
}

async function requestTts(model, { text, geminiVoice, style, signal }) {
  const spoken = speakableText(text);
  const prompt = style
    ? `(Read only the Malayalam, with feeling: ${style}.)\n${spoken}`
    : spoken;
  const { data } = await gemini.post(
    modelUrl(model),
    {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          languageCode: 'ml-IN',
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: geminiVoice },
          },
        },
      },
    },
    { signal }
  );
  return extractInlineAudio(data);
}

const ttsCooldownUntil = new Map();

function isCoolingDown(model) {
  return (ttsCooldownUntil.get(model) || 0) > Date.now();
}

function markCooldown(model, err) {
  const message = err.response?.data?.error?.message || err.message || '';
  const hours = message.match(/retry in (\d+)h/i);
  const waitMs = hours ? Number(hours[1]) * 60 * 60 * 1000 : 15 * 60 * 1000;
  ttsCooldownUntil.set(model, Date.now() + Math.min(waitMs, 12 * 60 * 60 * 1000));
}

async function synthesizeSpeech({ text, voice, speakingStyle, signal }) {
  requireApiKey();

  const geminiVoice = VOICE_MAP[voice] || VOICE_MAP.Anjali;
  const style = STYLE_MAP[speakingStyle] || STYLE_MAP.friendly;
  try {
    return await synthesizeMalayalam({ text, voice, speakingStyle });
  } catch (err) {
    console.warn('Malayalam neural TTS failed:', err.message);
  }

  const models = [config.geminiTtsModel, ...(config.geminiTtsFallbacks || [])].filter(
    (model, index, list) => model && list.indexOf(model) === index && !isCoolingDown(model)
  );

  let lastError = null;
  for (const model of models) {
    try {
      const audio = normalizeAudio(await requestTts(model, { text, geminiVoice, style, signal }));
      if (!audio) {
        lastError = new Error('Empty TTS audio');
        continue;
      }
      return {
        audioBase64: audio.audioBase64,
        mimeType: audio.mimeType,
        voice: voice || 'Anjali',
        speakingStyle: speakingStyle || 'friendly',
        backend: `gemini:${model}`,
        expressive: true,
      };
    } catch (err) {
      lastError = err;
      if (err.response?.status === 429) markCooldown(model, err);
      console.warn(
        `TTS ${model} failed:`,
        err.response?.status || '',
        err.response?.data?.error?.message || err.message
      );
      const status = err.response?.status;
      const message = err.response?.data?.error?.message || err.message || '';
      const retryable =
        status === 429 ||
        status === 404 ||
        status === 400 ||
        /speech metadata is not supported/i.test(message);
      if (!retryable) break;
    }
  }

  if (!models.length || lastError?.response?.status === 429) {
    const error = new Error(lastError?.response?.data?.error?.message || lastError?.message || 'TTS quota exceeded');
    error.status = 429;
    error.code = 'tts_rate_limited';
    error.publicMessage = 'Voice is busy right now. The text reply is ready — try speech again in a moment.';
    throw error;
  }

  speechError(
    lastError || new Error('TTS failed'),
    'tts_unavailable',
    'Voice generation is unavailable. The text reply is still saved.'
  );
}

module.exports = { checkSpeech, transcribeAudio, synthesizeSpeech };
