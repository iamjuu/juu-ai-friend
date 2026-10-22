const STYLE_PROMPTS = {
  caring:
    "Anjali's voice is gentle, caring, and conversational. She speaks slowly with warmth, natural pauses, and a close, very clear recording with no background noise.",
  calm:
    "Anjali speaks in a calm, soothing tone at a slow, steady pace. Her voice is soft, close, and captured in very clear audio with no background noise.",
  happy:
    "Anjali speaks with a happy, cheerful, slightly high-pitched voice at a natural pace. The recording is very clear, close, and expressive.",
  excited:
    "Anjali speaks with an excited, energetic tone, a slightly faster pace, and bright expressiveness. The recording is very clear and close with no background noise.",
  sympathetic:
    "Anjali speaks in a sympathetic, warm tone with a slower pace and gentle pauses. The recording is very clear, close, and free of background noise.",
  friendly:
    "Anjali speaks in a friendly, playful, conversational tone with a moderate pace and natural pitch. The recording is of very high quality, close, and clear.",
  reassuring:
    "Anjali speaks in a reassuring, steady, and kind tone at a moderate-to-slow pace. Her voice is close, very clear, and without background noise.",
  neutral:
    "Anjali speaks with a high pitch at a normal pace in a clear, close-sounding environment. Her neutral tone is captured with excellent audio quality.",
};

const STYLE_HINTS = [
  {
    style: 'caring',
    patterns: [
      /വിഷമ/i,
      /ദുഃഖ/i,
      /കരഞ്ഞ/i,
      /തനിച്ച്/i,
      /ഒറ്റയ്ക്ക്/i,
      /മിസ്/i,
      /സ്നേഹ/i,
      /sad/i,
      /depress/i,
      /lonely/i,
      /hurt/i,
      /miss you/i,
      /broken/i,
    ],
  },
  {
    style: 'sympathetic',
    patterns: [
      /ദേഷ്യ/i,
      /ബുദ്ധിമുട്ട്/i,
      /ക്ഷീണം/i,
      /തളർ/i,
      /വേദന/i,
      /പനി/i,
      /സുഖമില്ല/i,
      /angry/i,
      /frustrat/i,
      /tired/i,
      /stress/i,
      /pain/i,
    ],
  },
  {
    style: 'reassuring',
    patterns: [/ഭയ/i, /പേടി/i, /ആശങ്ക/i, /ടെൻഷൻ/i, /afraid/i, /scared/i, /anxious/i, /worry/i, /panic/i],
  },
  {
    style: 'excited',
    patterns: [/ആവേശ/i, /കിടു/i, /പൊളി/i, /സൂപ്പർ/i, /wow/i, /excited/i, /amazing/i, /yay/i],
  },
  {
    style: 'happy',
    patterns: [
      /സന്തോഷ/i,
      /ഹാപ്പി/i,
      /ചിരി/i,
      /നന്ദി/i,
      /ഇഷ്ടം/i,
      /happy/i,
      /joy/i,
      /love/i,
      /thanks/i,
      /great news/i,
    ],
  },
];

function detectSpeakingStyle(text, preferred = 'friendly') {
  const source = text || '';
  for (const hint of STYLE_HINTS) {
    if (hint.patterns.some((pattern) => pattern.test(source))) {
      return hint.style;
    }
  }
  return STYLE_PROMPTS[preferred] ? preferred : 'friendly';
}

function descriptionForStyle(style, voice = 'Anjali') {
  const key = STYLE_PROMPTS[style] ? style : 'friendly';
  const prompt = STYLE_PROMPTS[key];
  if (voice && voice !== 'Anjali') {
    return prompt.replace(/Anjali/g, voice);
  }
  return prompt;
}

module.exports = {
  STYLE_PROMPTS,
  detectSpeakingStyle,
  descriptionForStyle,
};
