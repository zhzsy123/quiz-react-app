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

export function getRecentSignatures(signatureMap, typeKey) {
  return [...(signatureMap.get(typeKey) || [])].slice(-5)
}

export function hasDuplicateSignature(signatureMap, typeKey, signature) {
  if (!signature) return false
  return (signatureMap.get(typeKey) || []).includes(signature)
}

export function rememberSignature(signatureMap, typeKey, signature) {
  if (!signature) return
  const current = signatureMap.get(typeKey) || []
  signatureMap.set(typeKey, [...current, signature])
}
