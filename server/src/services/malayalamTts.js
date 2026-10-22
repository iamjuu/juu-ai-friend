const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

const EDGE_VOICES = {
  Anjali: 'ml-IN-SobhanaNeural',
  Anju: 'ml-IN-SobhanaNeural',
  Harish: 'ml-IN-MidhunNeural',
};

const STYLE_SSML = {
  caring: { rate: '-18%', pitch: '-3Hz', volume: 'soft' },
  calm: { rate: '-20%', pitch: '-5Hz', volume: 'soft' },
  happy: { rate: '+16%', pitch: '+10Hz', volume: '+16%' },
  excited: { rate: '+22%', pitch: '+14Hz', volume: '+20%' },
  sympathetic: { rate: '-16%', pitch: '-7Hz', volume: 'soft' },
  friendly: { rate: '+10%', pitch: '+8Hz', volume: '+12%' },
  reassuring: { rate: '-8%', pitch: '+2Hz', volume: '+8%' },
  neutral: { rate: '+4%', pitch: '+3Hz', volume: 'medium' },
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
    .replace(/\s+/g, ' ')
    .trim();
}

function collectStream(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('close', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

function buildSsml(voiceName, spoken, speakingStyle) {
  const mood = STYLE_SSML[speakingStyle] || STYLE_SSML.friendly;
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="ml-IN"><voice name="${voiceName}"><prosody rate="${mood.rate}" pitch="${mood.pitch}" volume="${mood.volume}">${escapeXml(spoken)}</prosody></voice></speak>`;
}

async function runSsml(voiceName, ssml) {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3, {
    voiceLocale: 'ml-IN',
  });
  const { audioStream } = tts.rawToStream(ssml);
  const buffer = await collectStream(audioStream);
  tts.close();
  return buffer;
}

async function synthesizeMalayalam({ text, voice, speakingStyle }) {
  const spoken = speakableMalayalam(text);
  if (!spoken) {
    const error = new Error('Nothing to speak');
    error.status = 400;
    throw error;
  }

  const voiceName = EDGE_VOICES[voice] || EDGE_VOICES.Anjali;
  const buffer = await runSsml(voiceName, buildSsml(voiceName, spoken, speakingStyle));

  if (!buffer.length) {
    throw new Error('Empty Malayalam speech');
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
