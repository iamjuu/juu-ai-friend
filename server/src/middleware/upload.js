const multer = require('multer');
const config = require('../config');

const allowedMime = new Set([
  'audio/webm',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/ogg',
  'audio/flac',
  'audio/x-m4a',
  'video/webm',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.maxAudioMb * 1024 * 1024,
    files: 1,
  },
  fileFilter(_req, file, cb) {
    const mime = (file.mimetype || '').split(';')[0].trim().toLowerCase();
    if (allowedMime.has(mime) || mime.startsWith('audio/')) {
      cb(null, true);
      return;
    }
    const error = new Error('Unsupported audio type');
    error.status = 400;
    error.code = 'invalid_audio_type';
    error.publicMessage = 'പിന്തുണയ്ക്കുന്ന ഓഡിയോ ഫോർമാറ്റ് അല്ല.';
    cb(error);
  },
});

module.exports = upload;
