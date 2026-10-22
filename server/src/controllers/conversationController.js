const Conversation = require('../models/Conversation');
const { asyncHandler } = require('../middleware/errorHandler');

const WELCOME = 'ഹായ് അജു. ഞാൻ നിന്റെ പെണ്ണ്. എന്തൊക്കെയുണ്ട് വിശേഷം?';

function notDeleted() {
  return { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] };
}

function publicConversation(doc) {
  const conversation = doc.toObject({ virtuals: false });
  delete conversation.deletedAt;
  return conversation;
}

const listConversations = asyncHandler(async (_req, res) => {
  const conversations = await Conversation.find(notDeleted())
    .sort({ updatedAt: -1 })
    .select('title userId createdAt updatedAt messages')
    .lean();

  res.json({
    conversations: conversations.map((item) => ({
      id: item._id,
      title: item.title,
      userId: item.userId,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      preview: item.messages?.filter((msg) => msg.role === 'user').at(-1)?.text || WELCOME,
      messageCount: item.messages?.length || 0,
    })),
  });
});

const createConversation = asyncHandler(async (req, res) => {
  const conversation = await Conversation.create({
    title: (req.body?.title || 'പുതിയ സംഭാഷണം').slice(0, 80),
    userId: req.body?.userId || null,
    messages: [
      {
        role: 'assistant',
        text: WELCOME,
        timestamp: new Date(),
      },
    ],
  });
  res.status(201).json({ conversation: publicConversation(conversation) });
});

const getConversation = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findOne({
    _id: req.params.id,
    ...notDeleted(),
  });
  if (!conversation) {
    return res.status(404).json({
      error: 'not_found',
      message: 'സംഭാഷണം കണ്ടെത്തിയില്ല.',
    });
  }
  res.json({ conversation: publicConversation(conversation) });
});

const deleteConversation = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findOneAndUpdate(
    { _id: req.params.id, ...notDeleted() },
    { deletedAt: new Date() },
    { new: true }
  );
  if (!conversation) {
    return res.status(404).json({
      error: 'not_found',
      message: 'സംഭാഷണം കണ്ടെത്തിയില്ല.',
    });
  }
  res.json({ ok: true, id: conversation.id });
});

module.exports = {
  listConversations,
  createConversation,
  getConversation,
  deleteConversation,
  WELCOME,
};
