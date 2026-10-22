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

let prefsCache = { value: null, at: 0 };

async function getOrCreate() {
  if (prefsCache.value && Date.now() - prefsCache.at < 20000) {
    return prefsCache.value;
  }
  const preferences = await Preferences.findOneAndUpdate(
    { userId: 'local' },
    {},
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  prefsCache = { value: preferences, at: Date.now() };
  return preferences;
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
  prefsCache = { value: preferences, at: Date.now() };
  res.json({ preferences });
});

module.exports = { getPreferences, updatePreferences, getOrCreate };
