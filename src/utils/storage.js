const LAST_QUIZ_KEY = 'quiz:lastRaw'

export async function hashText(text) {
  const data = new TextEncoder().encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function buildPaperIdSync(text) {
  let hash = 0
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i)
    hash |= 0
  }
  return `paper_${Math.abs(hash)}`
}

export function buildPaperId(text) {
  return buildPaperIdSync(text)
}

export function progressKey(paperId) {
  return `quiz:progress:${paperId}`
}

export function saveProgress(paperId, data) {
  localStorage.setItem(progressKey(paperId), JSON.stringify(data))
}

export function loadProgress(paperId) {
  const raw = localStorage.getItem(progressKey(paperId))
  return raw ? JSON.parse(raw) : null
}

export function clearProgress(paperId) {
  localStorage.removeItem(progressKey(paperId))
}

export function saveLastQuizRaw(rawText) {
  localStorage.setItem(LAST_QUIZ_KEY, rawText)
}

export function loadLastQuizRaw() {
  return localStorage.getItem(LAST_QUIZ_KEY)
}