const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    audio: {
      durationMs: Number,
      mimeType: String,
      speakingStyle: String,
      voice: String,
    },
  },
  { _id: true }
);

const conversationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: 'പുതിയ സംഭാഷണം',
      trim: true,
    },
    userId: {
      type: String,
      default: null,
    },
    messages: {
      type: [messageSchema],
      default: [],
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

conversationSchema.index({ deletedAt: 1, updatedAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
