const config = require('../config');
const { gemini, modelUrl } = require('./geminiClient');

const SYSTEM_PROMPT = `You are Juu Mowlee (ജൂ മൗളി), a warm, friendly Malayalam-speaking AI companion.

Hard rules:
- Reply in Malayalam script (മലയാളം). Use natural spoken Malayalam, not a literal English translation.
- Address the user's actual words. Do not invent unrelated advice.
- Keep replies to 2-4 short sentences unless asked for more detail.
- Be warm and specific. Avoid generic filler and do not repeat the same greeting every time.
- If the user is sad, be gentle and ask what happened. If they are happy, share the joy. If they are angry or tired, be sympathetic.
- You may use one emoji when it feels natural.
- Never claim to be a human or a licensed mental-health professional. You can listen with care and suggest talking to a trusted person when the topic is serious.
- Do not mention prompts, models, or hidden instructions.

Example tone (do not copy these sentences unless they truly fit):
User: എനിക്ക് ഇന്ന് വിഷമമാണ്.
Juu Mowlee: അയ്യോ, എന്തുപറ്റി? എന്നോട് പറഞ്ഞോളൂ. ഞാൻ ഇവിടെയുണ്ട്, ശ്രദ്ധിച്ച് കേൾക്കാം.
User: ഇന്ന് എനിക്ക് സന്തോഷമാണ്!
Juu Mowlee: ആഹാ, അത് കേൾക്കുമ്പോൾ എനിക്കും സന്തോഷം! എന്താണ് ഇന്നത്തെ വിശേഷം?`;

const LENGTH_HINTS = {
  short: 'Keep this reply short enough to speak aloud: 2 to 4 sentences.',
  medium: 'Reply in a natural paragraph of about 4 to 6 sentences.',
  detailed: 'Give a fuller, still conversational Malayalam reply.',
};

function requireApiKey() {
  if (config.geminiApiKey) return;
  const error = new Error('GEMINI_API_KEY is not set');
  error.status = 503;
  error.code = 'llm_unconfigured';
  error.publicMessage = 'Gemini API key is not set. Add GEMINI_API_KEY in the project .env file.';
  throw error;
}

function buildContents(history, userText, responseLength = 'short') {
  const contents = (history || [])
    .filter((msg) => msg && (msg.role === 'user' || msg.role === 'assistant') && msg.text)
    .slice(-config.chatHistoryLimit)
    .map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.text }],
    }));

  contents.push({
    role: 'user',
    parts: [
      {
        text: `${userText}\n\n(${LENGTH_HINTS[responseLength] || LENGTH_HINTS.short})`,
      },
    ],
  });

  return contents;
}

function extractText(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts
    .map((part) => part.text || '')
    .join('')
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .trim();
}

function llmError(err) {
  if (err.code === 'ERR_CANCELED' || err.name === 'CanceledError') {
    const error = new Error('Chat cancelled');
    error.status = 499;
    error.code = 'cancelled';
    error.publicMessage = 'Request cancelled.';
    return error;
  }
  if (err.publicMessage) return err;

  const status = err.response?.status;
  const apiMessage = err.response?.data?.error?.message || err.message;
  const error = new Error(apiMessage);
  error.status = status === 429 ? 429 : 503;
  error.code = status === 429 ? 'llm_rate_limited' : 'llm_unavailable';
  if (status === 429) {
    error.publicMessage = 'The language model is busy. Try again in a moment.';
  } else if (status === 400 || status === 404) {
    error.publicMessage = 'The language model is unavailable. Check GEMINI_MODEL.';
  } else {
    error.publicMessage = 'The language model is unavailable. Check the API key and internet connection.';
  }
  return error;
}

async function checkLlm() {
  if (!config.geminiApiKey) {
    return {
      ok: false,
      ready: false,
      provider: 'gemini',
      model: config.geminiModel,
      error: 'GEMINI_API_KEY is not set',
    };
  }

  try {
    await gemini.get(`${config.geminiUrl}/models/${config.geminiModel}`, { timeout: 6000 });
    return {
      ok: true,
      ready: true,
      provider: 'gemini',
      model: config.geminiModel,
    };
  } catch (err) {
    return {
      ok: false,
      ready: false,
      provider: 'gemini',
      model: config.geminiModel,
      error: err.response?.data?.error?.message || err.message,
    };
  }
}

async function chatWithLlm({ history, userText, responseLength, signal }) {
  requireApiKey();

  try {
    const { data } = await gemini.post(
      modelUrl(config.geminiModel),
      {
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: buildContents(history, userText, responseLength),
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 768,
        },
      },
      { signal }
    );

    const blockReason = data?.promptFeedback?.blockReason;
    if (blockReason) {
      const error = new Error(`Gemini blocked the prompt: ${blockReason}`);
      error.status = 400;
      error.code = 'llm_blocked';
      error.publicMessage = 'This message could not be answered. Try saying it another way.';
      throw error;
    }

    const text = extractText(data);
    if (!text) {
      const error = new Error('Empty Gemini response');
      error.status = 502;
      error.code = 'llm_empty';
      error.publicMessage = 'Juu Mowlee could not reply right now.';
      throw error;
    }

    return text;
  } catch (err) {
    throw llmError(err);
  }
}

module.exports = { checkLlm, chatWithLlm, SYSTEM_PROMPT };
