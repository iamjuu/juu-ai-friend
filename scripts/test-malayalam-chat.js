const fs = require('fs');
const path = require('path');

for (const line of fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf8').split(/\r?\n/)) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match && process.env[match[1].trim()] === undefined) {
    process.env[match[1].trim()] = match[2].trim();
  }
}

const model = (process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite').replace(/^models\//, '');
const apiKey = process.env.GEMINI_API_KEY;

async function main() {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in .env');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: 'You are Juu Pennu, a warm Malayalam companion. Reply in Malayalam script only, 2-4 short sentences. Never claim to be human or a therapist.',
            },
          ],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Juu Pennu, I am very sad today. Comfort me in Malayalam.' }],
          },
        ],
      }),
    }
  );
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || response.statusText);
  }
  const text = (data.candidates?.[0]?.content?.parts || [])
    .map((part) => part.text || '')
    .join('')
    .trim();
  if (!text) {
    throw new Error('Empty Gemini response');
  }
  console.log(text);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
