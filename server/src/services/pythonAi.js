const axios = require('axios');
const FormData = require('form-data');
const config = require('../config');

async function checkPythonAi() {
  try {
    const { data } = await axios.get(`${config.pythonAiUrl}/health`, { timeout: 4000 });
    return {
      ok: Boolean(data) && data.status !== 'error',
      ...data,
    };
  } catch (err) {
    return {
      ok: false,
      status: 'offline',
      error: err.message,
    };
  }
}

function serviceError(err, fallbackCode, fallbackMessage) {
  if (err.publicMessage) throw err;
  const detail = err.response?.data?.detail || err.response?.data?.message;
  const error = new Error(err.message);
  error.status = err.response?.status === 422 ? 422 : 503;
  error.code = fallbackCode;
  error.publicMessage = typeof detail === 'string' ? detail : fallbackMessage;
  throw error;
}

async function transcribeAudio({ buffer, originalname, mimetype, signal }) {
  const form = new FormData();
  form.append('file', buffer, {
    filename: originalname || 'speech.webm',
    contentType: mimetype || 'audio/webm',
  });

  try {
    const { data } = await axios.post(`${config.pythonAiUrl}/transcribe`, form, {
      headers: form.getHeaders(),
      timeout: config.requestTimeoutMs,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      signal,
    });
    const text = (data?.text || '').trim();
    if (!text) {
      const error = new Error('Empty transcription');
      error.status = 422;
      error.code = 'empty_transcript';
      error.publicMessage = 'സംസാരം തിരിച്ചറിയാൻ കഴിഞ്ഞില്ല. വീണ്ടും ശ്രമിക്കാം.';
      throw error;
    }
    return {
      text,
      language: data.language || 'ml',
      duration: data.duration,
      backend: data.backend,
    };
  } catch (err) {
    if (err.publicMessage) throw err;
    serviceError(
      err,
      'stt_unavailable',
      'സ്പീച്ച് റിക്കഗ്നിഷൻ സേവനം ലഭ്യമല്ല. Python AI സേവനം ഓൺ ആണോ എന്ന് പരിശോധിക്കുക.'
    );
  }
}

async function synthesizeSpeech({ text, voice, speakingStyle, description, signal }) {
  try {
    const { data } = await axios.post(
      `${config.pythonAiUrl}/synthesize`,
      {
        text,
        voice: voice || 'Anjali',
        speaking_style: speakingStyle || 'friendly',
        description,
      },
      {
        timeout: config.requestTimeoutMs,
        signal,
      }
    );

    if (!data?.audio_base64) {
      const error = new Error('Empty TTS audio');
      error.status = 502;
      error.code = 'tts_empty';
      error.publicMessage = 'ശബ്ദം ഉണ്ടാക്കാൻ കഴിഞ്ഞില്ല.';
      throw error;
    }

    return {
      audioBase64: data.audio_base64,
      mimeType: data.mime_type || 'audio/wav',
      sampleRate: data.sample_rate,
      voice: data.voice,
      speakingStyle: data.speaking_style,
      backend: data.backend,
      expressive: Boolean(data.expressive),
    };
  } catch (err) {
    if (err.publicMessage) throw err;
    serviceError(
      err,
      'tts_unavailable',
      'വോയ്‌സ് ജനറേഷൻ സേവനം ലഭ്യമല്ല. Python AI സേവനം ഓൺ ആണോ എന്ന് പരിശോധിക്കുക.'
    );
  }
}

module.exports = { checkPythonAi, transcribeAudio, synthesizeSpeech };
