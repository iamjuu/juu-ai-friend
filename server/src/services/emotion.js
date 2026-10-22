const STYLE_PROMPTS = {
  caring: 'Speak gently and clearly at a calm pace. Natural Malayalam. No extra drama.',
  calm: 'Speak softly and evenly. Clear, close, and unhurried.',
  happy: 'Speak with a light, clean smile in the voice. Natural pace. Not cartoonish.',
  excited: 'Speak with a light, clean smile in the voice. Natural pace. Not cartoonish.',
  sympathetic: 'Speak kindly and steadily, a little slower. No heavy sighs.',
  friendly: 'Speak warm, close, and natural, like a quiet Malayalam chat.',
  reassuring: 'Speak steady, kind, and protective. Clear and calm.',
  neutral: 'Speak clearly and naturally, with a little warmth.',
};

const STYLE_HINTS = [
  {
    style: 'caring',
    patterns: [/വിഷമ/i, /ദുഃഖ/i, /കരഞ്ഞ/i, /തനിച്ച്/i, /ഒറ്റയ്ക്ക്/i, /sad/i, /lonely/i, /hurt/i],
  },
  {
    style: 'sympathetic',
    patterns: [/ദേഷ്യ/i, /ക്ഷീണം/i, /തളർ/i, /വേദന/i, /സുഖമില്ല/i, /angry/i, /tired/i, /stress/i],
  },
  {
    style: 'reassuring',
    patterns: [/ഭയ/i, /പേടി/i, /ടെൻഷൻ/i, /afraid/i, /scared/i, /worry/i],
  },
  {
    style: 'happy',
    patterns: [/സന്തോഷ/i, /ഹാപ്പി/i, /നന്ദി/i, /happy/i, /thanks/i, /great news/i],
  },
];

function detectSpeakingStyle(text, preferred = 'friendly') {
  const source = text || '';
  for (const hint of STYLE_HINTS) {
    if (hint.patterns.some((pattern) => pattern.test(source))) {
      return hint.style === 'excited' ? 'happy' : hint.style;
    }
  }
  return STYLE_PROMPTS[preferred] ? preferred : 'friendly';
}

function descriptionForStyle(style, voice = 'Anjali') {
  const key = STYLE_PROMPTS[style] ? style : 'friendly';
  const prompt = STYLE_PROMPTS[key];
  if (voice && voice !== 'Anjali') {
    return `${voice}: ${prompt}`;
  }
  return prompt;
}

module.exports = {
  STYLE_PROMPTS,
  detectSpeakingStyle,
  descriptionForStyle,
};
