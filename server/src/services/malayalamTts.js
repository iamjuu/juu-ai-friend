const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

const EDGE_VOICES = {
  Anjali: 'ml-IN-SobhanaNeural',
  Anju: 'ml-IN-SobhanaNeural',
  Harish: 'ml-IN-MidhunNeural',
};

const STYLE_PROSODY = {
  caring: { rate: 0.9, pitch: '+1Hz', volume: 100 },
  calm: { rate: 0.88, pitch: '+0Hz', volume: 100 },
  happy: { rate: 1.03, pitch: '+3Hz', volume: 100 },
  excited: { rate: 1.06, pitch: '+4Hz', volume: 100 },
  sympathetic: { rate: 0.89, pitch: '+0Hz', volume: 100 },
  friendly: { rate: 0.94, pitch: '+3Hz', volume: 100 },
  reassuring: { rate: 0.91, pitch: '+1Hz', volume: 100 },
  neutral: { rate: 0.95, pitch: '+1Hz', volume: 100 },
};

function escapeXml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function speakableMalayalam(text) {
  return String(text || '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '')
    .replace(/[❤️❤🥰😊😉😜🫂😍😘]/g, '')
    .replace(/[*_`#]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function collectStream(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => {
      const buffer = Buffer.concat(chunks);
      if (!buffer.length) {
        reject(new Error('Empty Malayalam speech'));
        return;
      }
      resolve(buffer);
    });
    stream.on('error', reject);
  });
}

async function runEdge(spoken, voiceName, mood, expressive) {
  const tts = new MsEdgeTTS();
  try {
    await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3, {
      voiceLocale: 'ml-IN',
    });
    const input = expressive
      ? `<mstts:express-as style="chat" styledegree="1.3">${escapeXml(spoken)}</mstts:express-as>`
      : escapeXml(spoken);
    const { audioStream } = tts.toStream(input, mood);
    return await collectStream(audioStream);
  } finally {
    tts.close();
  }
}

async function synthesizeMalayalam({ text, voice, speakingStyle }) {
  const spoken = speakableMalayalam(text);
  if (!spoken) {
    const error = new Error('Nothing to speak');
    error.status = 400;
    throw error;
  }

  const voiceName = EDGE_VOICES[voice] || EDGE_VOICES.Anjali;
  const mood = STYLE_PROSODY[speakingStyle] || STYLE_PROSODY.friendly;
  let buffer;
  try {
    buffer = await runEdge(spoken, voiceName, mood, true);
  } catch (err) {
    console.warn('Chat-style Malayalam voice failed, using natural neural voice:', err.message);
    buffer = await runEdge(spoken, voiceName, mood, false);
  }

  return {
    audioBase64: buffer.toString('base64'),
    mimeType: 'audio/mpeg',
    voice: voice || 'Anjali',
    speakingStyle: speakingStyle || 'friendly',
    backend: 'malayalam-neural',
    expressive: true,
  };
}

module.exports = { synthesizeMalayalam };
