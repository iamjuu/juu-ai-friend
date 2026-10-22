const Preferences = require('../models/Preferences');
const { asyncHandler } = require('../middleware/errorHandler');

const ALLOWED = [
  'preferredVoice',
  'preferredSpeakingStyle',
  'audioAutoplay',
  'responseLength',
  'preferredLanguage',
  'theme',
  'showChat',
  'showHistory',
];

async function getOrCreate() {
  return Preferences.findOneAndUpdate(
    { userId: 'local' },
    {},
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

const getPreferences = asyncHandler(async (_req, res) => {
  const preferences = await getOrCreate();
  res.json({ preferences });
});

const updatePreferences = asyncHandler(async (req, res) => {
  const updates = {};
  for (const key of ALLOWED) {
    if (req.body?.[key] !== undefined) {
      updates[key] = req.body[key];
    }
  }
  const preferences = await Preferences.findOneAndUpdate(
    { userId: 'local' },
    updates,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  res.json({ preferences });
});

module.exports = { getPreferences, updatePreferences };
