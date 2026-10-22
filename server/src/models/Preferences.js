const mongoose = require('mongoose');

const preferencesSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      default: 'local',
      unique: true,
    },
    preferredVoice: {
      type: String,
      default: 'Anjali',
    },
    preferredSpeakingStyle: {
      type: String,
      default: 'friendly',
    },
    audioAutoplay: {
      type: Boolean,
      default: true,
    },
    responseLength: {
      type: String,
      enum: ['short', 'medium', 'detailed'],
      default: 'short',
    },
    preferredLanguage: {
      type: String,
      default: 'ml',
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system',
    },
    showChat: {
      type: Boolean,
      default: true,
    },
    showHistory: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Preferences', preferencesSchema);
