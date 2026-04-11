function compactText(value) {
  return String(value ?? '').trim()
}

function normalizeSignatureText(value) {
  return compactText(value)
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildCharacterWindows(value, size = 6) {
  const compact = normalizeSignatureText(value).replace(/\s+/g, '')
  if (!compact) return []
  if (compact.length <= size) {
    return [compact]
  }

  const windows = new Set()
  for (let index = 0; index <= compact.length - size; index += 1) {
    windows.add(compact.slice(index, index + size))
  }
  return [...windows]
}

function toNearSignatureArray(value) {
  if (!Array.isArray(value)) return []
  return value.map((item) => normalizeSignatureText(item)).filter(Boolean)
}

function normalizeTypeBucket(bucket) {
  if (Array.isArray(bucket)) {
    return {
      exact: bucket.map((item) => normalizeSignatureText(item)).filter(Boolean),
      near: [],
    }
  }

  if (!bucket || typeof bucket !== 'object') {
    return { exact: [], near: [] }
  }

  return {
    exact: Array.isArray(bucket.exact)
      ? bucket.exact.map((item) => normalizeSignatureText(item)).filter(Boolean)
      : [],
    near: Array.isArray(bucket.near)
      ? bucket.near.map((items) => toNearSignatureArray(items)).filter((items) => items.length > 0)
      : [],
  }
}

function writeTypeBucket(signatureMap, typeKey, bucket) {
  signatureMap.set(typeKey, {
    exact: [...new Set(bucket.exact)],
    near: bucket.near.map((items) => [...new Set(items)]),
  })
}

function jaccardSimilarity(left = [], right = []) {
  const leftSet = new Set(left)
  const rightSet = new Set(right)
  const union = new Set([...leftSet, ...rightSet])
  if (!union.size) return 0

  let intersectionCount = 0
  leftSet.forEach((item) => {
    if (rightSet.has(item)) {
      intersectionCount += 1
    }
  })

  return intersectionCount / union.size
}

export function buildQuestionSignature(question) {
  if (!question || typeof question !== 'object') return ''

  const segments = [
    question.type,
    question.prompt,
    question.material,
    question.context,
    question.source_text,
    question.passage?.title,
    question.passage?.content,
    Array.isArray(question.options)
      ? question.options.map((option) => option?.text || option?.label || '').join(' | ')
      : '',
    Array.isArray(question.questions)
      ? question.questions.map((child) => `${child?.type || ''}:${child?.prompt || ''}`).join(' || ')
      : '',
  ]

  return normalizeSignatureText(segments.filter(Boolean).join(' || ')).slice(0, 320)
}

export function buildQuestionNearSignature(question) {
  const signature = typeof question === 'string' ? normalizeSignatureText(question) : buildQuestionSignature(question)
  return buildCharacterWindows(signature, 6).slice(0, 64)
}

export function getRecentSignatures(signatureMap, typeKey) {
  const bucket = normalizeTypeBucket(signatureMap.get(typeKey))
  return [...bucket.exact].slice(-5)
}

export function hasDuplicateSignature(signatureMap, typeKey, signature, nearSignature = []) {
  if (!signature) return false
  const bucket = normalizeTypeBucket(signatureMap.get(typeKey))
  if (bucket.exact.includes(signature)) {
    return true
  }

  const normalizedNear = toNearSignatureArray(nearSignature)
  if (!normalizedNear.length) {
    return false
  }

  return bucket.near.some((storedNear) => jaccardSimilarity(storedNear, normalizedNear) >= 0.5)
}

export function rememberSignature(signatureMap, typeKey, signature, nearSignature = []) {
  if (!signature) return
  const bucket = normalizeTypeBucket(signatureMap.get(typeKey))
  if (!bucket.exact.includes(signature)) {
    bucket.exact.push(signature)
  }

  const normalizedNear = toNearSignatureArray(nearSignature)
  if (
    normalizedNear.length &&
    !bucket.near.some((storedNear) => jaccardSimilarity(storedNear, normalizedNear) === 1)
  ) {
    bucket.near.push(normalizedNear)
  }

  writeTypeBucket(signatureMap, typeKey, bucket)
}
