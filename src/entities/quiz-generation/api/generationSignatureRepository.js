import { loadMetaValue, saveMetaValue } from '../../../shared/storage/indexedDb/metaStore.js'

const SIGNATURE_STORE_LIMIT = 200

function generationSignatureKey(subjectKey = '', typeKey = '') {
  return `generation-signatures:${subjectKey}:${typeKey}`
}

function normalizeSignatureList(value) {
  if (!Array.isArray(value)) return []
  return value.map((item) => String(item || '').trim()).filter(Boolean)
}

function normalizeNearSignatureList(value) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => normalizeSignatureList(item))
    .filter((item) => item.length > 0)
    .slice(-SIGNATURE_STORE_LIMIT)
}

function normalizeSignatureIndex(value) {
  if (Array.isArray(value)) {
    return {
      exact: normalizeSignatureList(value).slice(-SIGNATURE_STORE_LIMIT),
      near: [],
    }
  }

  if (!value || typeof value !== 'object') {
    return { exact: [], near: [] }
  }

  return {
    exact: normalizeSignatureList(value.exact).slice(-SIGNATURE_STORE_LIMIT),
    near: normalizeNearSignatureList(value.near),
  }
}

export async function loadGenerationSignatureIndex(subjectKey = '', typeKey = '') {
  try {
    const raw = await loadMetaValue(generationSignatureKey(subjectKey, typeKey), { exact: [], near: [] })
    return normalizeSignatureIndex(raw)
  } catch {
    return { exact: [], near: [] }
  }
}

export async function loadGenerationSignatures(subjectKey = '', typeKey = '') {
  const index = await loadGenerationSignatureIndex(subjectKey, typeKey)
  return index.exact
}

export async function saveGenerationSignatureIndex(subjectKey = '', typeKey = '', indexValue = {}) {
  const normalized = normalizeSignatureIndex(indexValue)
  try {
    await saveMetaValue(generationSignatureKey(subjectKey, typeKey), normalized)
    return normalized
  } catch {
    return normalized
  }
}

export async function saveGenerationSignatures(subjectKey = '', typeKey = '', signatures = []) {
  return saveGenerationSignatureIndex(subjectKey, typeKey, {
    exact: signatures,
    near: [],
  })
}

export async function rememberGenerationSignature(subjectKey = '', typeKey = '', signature = '') {
  const nextSignature = String(signature || '').trim()
  if (!nextSignature) return []

  const current = await loadGenerationSignatures(subjectKey, typeKey)
  if (current.includes(nextSignature)) return current

  return saveGenerationSignatures(subjectKey, typeKey, [...current, nextSignature])
}

export async function rememberGenerationSignatureEntry(
  subjectKey = '',
  typeKey = '',
  { exactSignature = '', nearSignature = [] } = {}
) {
  const nextExact = String(exactSignature || '').trim()
  const normalizedNear = normalizeSignatureList(nearSignature)
  if (!nextExact && !normalizedNear.length) {
    return { exact: [], near: [] }
  }

  const current = await loadGenerationSignatureIndex(subjectKey, typeKey)
  const nextIndex = {
    exact: current.exact.includes(nextExact) ? current.exact : [...current.exact, nextExact].filter(Boolean),
    near: [...current.near],
  }

  if (
    normalizedNear.length &&
    !nextIndex.near.some(
      (stored) => stored.length === normalizedNear.length && stored.every((item, index) => item === normalizedNear[index])
    )
  ) {
    nextIndex.near.push(normalizedNear)
  }

  return saveGenerationSignatureIndex(subjectKey, typeKey, nextIndex)
}
