const express = require('express');
const upload = require('../middleware/upload');
const { health, aiStatus } = require('../controllers/healthController');
const {
  listConversations,
  createConversation,
  getConversation,
  deleteConversation,
} = require('../controllers/conversationController');
const { chat } = require('../controllers/chatController');
const { transcribe, synthesize } = require('../controllers/speechController');
const { getPreferences, updatePreferences } = require('../controllers/preferencesController');

const router = express.Router();

router.get('/health', health);
router.get('/ai/status', aiStatus);

router.get('/conversations', listConversations);
router.post('/conversations', createConversation);
router.get('/conversations/:id', getConversation);
router.delete('/conversations/:id', deleteConversation);

router.post('/chat', chat);

router.post('/speech/transcribe', upload.single('audio'), transcribe);
router.post('/speech/synthesize', synthesize);

router.get('/preferences', getPreferences);
router.put('/preferences', updatePreferences);

module.exports = router;
