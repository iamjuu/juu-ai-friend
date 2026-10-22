export const APP_NAME = 'Juu Pennu'
export const TAGLINE = "Juu's Malayalam AI girlfriend"
export const WELCOME = 'ഹായ് അജു. ഞാൻ നിന്റെ പെണ്ണ്. എന്തൊക്കെയുണ്ട് വിശേഷം?'
export const WAKE_GREETING = WELCOME

export const VOICE_STATES = {
  idle: { label: 'Ready', mal: 'തയ്യാർ' },
  waiting: { label: 'Say Juu Pennu', mal: 'പേര് വിളിക്കൂ' },
  listening: { label: 'Listening', mal: 'കേൾക്കുന്നു' },
  transcribing: { label: 'Transcribing', mal: 'എഴുതുന്നു' },
  thinking: { label: 'Thinking', mal: 'ആലോചിക്കുന്നു' },
  generating_speech: { label: 'Generating voice', mal: 'Generating voice' },
  speaking: { label: 'Speaking', mal: 'സംസാരിക്കുന്നു' },
  error: { label: 'Error', mal: 'പിശക്' },
}

export const SPEAKING_STYLES = [
  { id: 'friendly', label: 'Friendly & playful' },
  { id: 'caring', label: 'Caring & empathetic' },
  { id: 'calm', label: 'Calm & soothing' },
  { id: 'happy', label: 'Happy & cheerful' },
  { id: 'excited', label: 'Excited' },
  { id: 'sympathetic', label: 'Sympathetic' },
  { id: 'reassuring', label: 'Reassuring' },
  { id: 'neutral', label: 'Neutral fallback' },
]

export const VOICES = [
  { id: 'Anjali', label: 'Anjali (recommended)' },
  { id: 'Harish', label: 'Harish' },
  { id: 'Anju', label: 'Anju' },
]
