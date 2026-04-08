import { generateId, openDb, requestToPromise, waitForTransaction } from './db'
import {
  buildCompositeAnswerSnapshotMap,
  buildCompositeQuestionSnapshotMap,
  decorateCompositeItems,
} from './compositePersistence'

export async function saveAttemptRecord(record) {
  const now = record.submittedAt || Date.now()
  const itemsSnapshot = decorateCompositeItems(record.itemsSnapshot || [])
  const entry = {
    id: generateId('attempt'),
    ...record,
    itemsSnapshot,
    compositeQuestionSnapshotMap: buildCompositeQuestionSnapshotMap(itemsSnapshot),
    compositeAnswerSnapshotMap: buildCompositeAnswerSnapshotMap(itemsSnapshot, record.answersSnapshot || {}),
    submittedAt: now,
    createdAt: now,
  }

  const db = await openDb()
  const tx = db.transaction('attempts', 'readwrite')
  tx.objectStore('attempts').put(entry)
  await waitForTransaction(tx, 'Save attempt failed')
  return entry
}

export async function listAttempts(profileId, subject) {
  const db = await openDb()
  const tx = db.transaction('attempts', 'readonly')
  const records = (await requestToPromise(tx.objectStore('attempts').getAll())) || []
  return records
    .filter((item) => item.profileId === profileId && (!subject || item.subject === subject))
    .sort((a, b) => b.submittedAt - a.submittedAt)
}

export async function updateAttemptRecord(attemptId, patch) {
  const db = await openDb()
  const tx = db.transaction('attempts', 'readwrite')
  const store = tx.objectStore('attempts')
  const existing = await requestToPromise(store.get(attemptId))
  if (!existing) return null

  const next = {
    ...existing,
    ...patch,
    updatedAt: Date.now(),
  }

  if (Array.isArray(next.itemsSnapshot)) {
    next.itemsSnapshot = decorateCompositeItems(next.itemsSnapshot)
    next.compositeQuestionSnapshotMap = buildCompositeQuestionSnapshotMap(next.itemsSnapshot)
    next.compositeAnswerSnapshotMap = buildCompositeAnswerSnapshotMap(
      next.itemsSnapshot,
      next.answersSnapshot || existing.answersSnapshot || {}
    )
  }

  if (typeof next.customTitle === 'string') {
    next.customTitle = next.customTitle.trim()
  }

  if (typeof next.notes === 'string') {
    next.notes = next.notes.trim()
  }

  if (!Array.isArray(next.tags)) {
    next.tags = existing.tags || []
  }

  store.put(next)
  await waitForTransaction(tx, 'Update attempt failed')
  return next
}

export async function deleteAttemptRecord(attemptId) {
  const db = await openDb()
  const tx = db.transaction('attempts', 'readwrite')
  tx.objectStore('attempts').delete(attemptId)
  await waitForTransaction(tx, 'Delete attempt failed')
}
