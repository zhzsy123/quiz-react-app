import { normalizeWrongbookEntry } from '../indexedDb/compositePersistence'
import { loadMetaValue, saveMetaValue } from '../indexedDb/metaStore'

function wrongBookMasteredKey(profileId, subject) {
  return `wrongbook-mastered:${profileId}:${subject}`
}

function wrongBookEntriesKey(profileId, subject) {
  return `wrongbook-entries:${profileId}:${subject}`
}

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value))
}

export async function loadMasteredWrongMap(profileId, subject) {
  return loadMetaValue(wrongBookMasteredKey(profileId, subject), {})
}

export async function markWrongQuestionMastered(profileId, subject, questionKey, masteredAt = Date.now()) {
  const current = await loadMasteredWrongMap(profileId, subject)
  const next = {
    ...current,
    [questionKey]: masteredAt,
  }
  await saveMetaValue(wrongBookMasteredKey(profileId, subject), next)
  return next
}

async function loadWrongBookEntryMap(profileId, subject) {
  return loadMetaValue(wrongBookEntriesKey(profileId, subject), {})
}

async function saveWrongBookEntryMap(profileId, subject, value) {
  await saveMetaValue(wrongBookEntriesKey(profileId, subject), value)
  return value
}

export async function loadWrongBookEntries(profileId, subject) {
  const map = await loadWrongBookEntryMap(profileId, subject)
  return Object.values(map).sort((a, b) => (b.lastWrongAt || 0) - (a.lastWrongAt || 0))
}

export async function upsertWrongBookEntries(profileId, subject, entries) {
  const current = await loadWrongBookEntryMap(profileId, subject)
  const next = { ...current }

  ;(entries || []).forEach((entry) => {
    const cloned = normalizeWrongbookEntry(cloneValue(entry))
    if (!cloned?.questionKey) return
    const existing = next[cloned.questionKey]
    const wrongTimes = (existing?.wrongTimes || 0) + (cloned.wrongTimes || 1)
    const addedAt = existing?.addedAt || cloned.addedAt || Date.now()
    const lastWrongAt = cloned.lastWrongAt || Date.now()

    next[cloned.questionKey] = {
      ...(existing || {}),
      ...cloned,
      subject: cloned.subject || subject,
      wrongTimes,
      addedAt,
      lastWrongAt,
    }
  })

  const saved = await saveWrongBookEntryMap(profileId, subject, next)
  return Object.values(saved).sort((a, b) => (b.lastWrongAt || 0) - (a.lastWrongAt || 0))
}

export async function removeWrongBookEntry(profileId, subject, questionKey) {
  const current = await loadWrongBookEntryMap(profileId, subject)
  const next = { ...current }
  delete next[questionKey]
  const saved = await saveWrongBookEntryMap(profileId, subject, next)
  return Object.values(saved).sort((a, b) => (b.lastWrongAt || 0) - (a.lastWrongAt || 0))
}

export async function removeWrongBookEntries(profileId, subject, questionKeys = []) {
  const current = await loadWrongBookEntryMap(profileId, subject)
  const next = { ...current }
  questionKeys.forEach((questionKey) => {
    delete next[questionKey]
  })
  const saved = await saveWrongBookEntryMap(profileId, subject, next)
  return Object.values(saved).sort((a, b) => (b.lastWrongAt || 0) - (a.lastWrongAt || 0))
}
