const WAKE_PATTERNS = [
  /ജൂ\s*മ[ൗോൊ]ളി/,
  /ജുമ[ൗോൊ]ളി/,
  /മൗളി/,
  /മോളി/,
  /\bju+\s*mow+\s*l[eyi]*\b/,
  /\bju+\s*mau+\s*l[eyi]*\b/,
  /\bju+\s*mou+\s*l[eyi]*\b/,
  /\bjoo+\s*mow+\s*l[eyi]*\b/,
  /\bju+\s*penn?u\b/,
  /\bju+\s*more\b/,
  /\bju+\s*molly\b/,
  /\bju+\s*moli\b/,
  /\bj\s*u+\s*more\b/,
  /\bjuu?mow+\s*l[eyi]*\b/,
  /\bju\s*mowli\b/,
  /\bpennu\b/,
  /\bpenu\b/,
  /\bmowlee\b/,
  /\bmowli\b/,
  /\bzoom+o+r[eyi]?\b/,
  /\bzoom+or[eyi]?\b/,
  /\bzoomer\b/,
  /\bjumore\b/,
  /\bjoomore\b/,
]

const STRIP_PATTERNS = [
  /ജൂ\s*മ[ൗോൊ]ളി[,!.]*/g,
  /ജുമ[ൗോൊ]ളി[,!.]*/g,
  /\bju+\s*mow+\s*l[eyi]*[,!.]*/gi,
  /\bju+\s*mau+\s*l[eyi]*[,!.]*/gi,
  /\bju+\s*mou+\s*l[eyi]*[,!.]*/gi,
  /\bjoo+\s*mow+\s*l[eyi]*[,!.]*/gi,
  /\bju+\s*more[,!.]*/gi,
  /\bju+\s*molly[,!.]*/gi,
  /\bju+\s*moli[,!.]*/gi,
  /\bj\s*u+\s*more[,!.]*/gi,
  /\bjuu?mow+\s*l[eyi]*[,!.]*/gi,
  /\bju\s*mowli[,!.]*/gi,
  /\bzoom+o+r[eyi]?[,!.]*/gi,
  /\bzoom+or[eyi]?[,!.]*/gi,
  /\bzoomer[,!.]*/gi,
  /\bjumore[,!.]*/gi,
  /\bjoomore[,!.]*/gi,
]

function normalize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[“”"']/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function matchWakeWord(text) {
  const value = normalize(text)
  if (!value) return false
  if (WAKE_PATTERNS.some((pattern) => pattern.test(value))) return true
  if (value.includes('\u0d1c\u0d42') && value.includes('\u0d2e')) return true
  return /ju+\W{0,10}(mow|mau|mou|mol|more)/i.test(value)
}

export function stripWakeWord(text) {
  let value = normalize(text)
  STRIP_PATTERNS.forEach((pattern) => {
    value = value.replace(pattern, ' ')
  })
  return value.replace(/\s+/g, ' ').trim()
}

export function parseWakeSpeech(text) {
  if (!matchWakeWord(text)) return null
  const command = stripWakeWord(text)
  return { command }
}
