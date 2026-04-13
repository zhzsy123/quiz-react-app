const SYMBOL_ALIAS_MAP = new Map([
  ['Π', 'π'],
  ['PI', 'π'],
  ['pi', 'π'],
  ['project', 'π'],
  ['PROJECT', 'π'],
  ['Σ', 'σ'],
  ['SIGMA', 'σ'],
  ['sigma', 'σ'],
  ['select', 'σ'],
  ['SELECT', 'σ'],
  ['∞', '⋈'],
  ['JOIN', '⋈'],
  ['join', '⋈'],
  ['DIVIDE', '÷'],
  ['divide', '÷'],
  ['UNION', '∪'],
  ['union', '∪'],
  ['INTERSECT', '∩'],
  ['intersect', '∩'],
  ['OR', '∨'],
  ['or', '∨'],
  ['NOT', '¬'],
  ['not', '¬'],
  ['!=', '≠'],
  ['<>', '≠'],
])

function safeParseJson(text) {
  if (typeof text !== 'string') return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function normalizeSubquestionId(subquestion, fallbackIndex) {
  if (!subquestion) return String(fallbackIndex + 1)
  return String(subquestion.id ?? subquestion.subquestion_id ?? subquestion.key ?? fallbackIndex + 1)
}

function createEmptyResponseMap(subquestions = []) {
  return subquestions.reduce((map, subquestion, index) => {
    map[normalizeSubquestionId(subquestion, index)] = ''
    return map
  }, {})
}

function clampSelection(selection, text) {
  const safe = Number.isFinite(selection) ? selection : text.length
  return Math.max(0, Math.min(text.length, safe))
}

function buildSelectionPayload(text, selectionStartOffset, selectionEndOffset = selectionStartOffset) {
  return {
    text,
    selectionStartOffset,
    selectionEndOffset,
  }
}

function getBracketContext(value, cursor) {
  const openIndex = value.lastIndexOf('[', Math.max(0, cursor - 1))
  if (openIndex === -1) return null

  const closeIndex = value.indexOf(']', openIndex)
  if (closeIndex === -1 || cursor > closeIndex) return null

  return {
    openIndex,
    closeIndex,
    content: value.slice(openIndex + 1, closeIndex),
  }
}

export function normalizeSymbol(value = '') {
  const trimmed = String(value || '').trim()
  return SYMBOL_ALIAS_MAP.get(trimmed) || trimmed
}

export function normalizeRelationalAlgebraResponse(response, subquestions = []) {
  const emptyMap = createEmptyResponseMap(subquestions)

  if (response == null || response === '') return emptyMap

  if (typeof response === 'string') {
    const parsed = safeParseJson(response)
    if (!parsed) {
      if (subquestions.length === 1) {
        const key = normalizeSubquestionId(subquestions[0], 0)
        return { ...emptyMap, [key]: response }
      }
      return emptyMap
    }
    return normalizeRelationalAlgebraResponse(parsed, subquestions)
  }

  if (typeof response !== 'object') return emptyMap

  const rawResponses =
    response.responses && typeof response.responses === 'object'
      ? response.responses
      : response.answer && typeof response.answer === 'object'
        ? response.answer
        : response

  const normalized = { ...emptyMap }
  subquestions.forEach((subquestion, index) => {
    const key = normalizeSubquestionId(subquestion, index)
    const candidates = [
      rawResponses?.[key],
      rawResponses?.[String(index + 1)],
      rawResponses?.[subquestion?.id],
      response?.[key],
      response?.[String(index + 1)],
      response?.[subquestion?.id],
    ]
    const found = candidates.find((value) => typeof value === 'string' || typeof value === 'number')
    normalized[key] = found == null ? '' : String(found)
  })

  return normalized
}

export function serializeRelationalAlgebraResponse(itemId, subquestions = [], responseMap = {}) {
  const normalized = {}
  subquestions.forEach((subquestion, index) => {
    const key = normalizeSubquestionId(subquestion, index)
    normalized[key] = String(responseMap?.[key] || '').trim()
  })

  return JSON.stringify(
    {
      type: 'relational_algebra',
      question_id: itemId,
      responses: normalized,
    },
    null,
    2
  )
}

export function getRelationalAlgebraSubquestionKey(subquestion, index) {
  return normalizeSubquestionId(subquestion, index)
}

export function getRelationalAlgebraSchemaTokens(schemas = []) {
  const tokens = []
  const seen = new Set()

  schemas.forEach((schema) => {
    const relationName = String(schema?.name || '').trim()
    if (relationName && !seen.has(`relation:${relationName}`)) {
      seen.add(`relation:${relationName}`)
      tokens.push({
        kind: 'relation',
        value: relationName,
        label: relationName,
      })
    }

    ;(schema?.attributes || []).forEach((attribute) => {
      const attr = String(attribute || '').trim()
      if (!attr) return
      const cacheKey = `attribute:${relationName}:${attr}`
      if (seen.has(cacheKey)) return
      seen.add(cacheKey)
      tokens.push({
        kind: 'attribute',
        value: attr,
        label: attr,
        relation: relationName,
      })
    })
  })

  return tokens
}

export function buildRelationalAlgebraInsertion(symbol, options = {}) {
  const normalized = normalizeSymbol(symbol)
  const value = options.textValue || ''
  const cursor = clampSelection(options.selectionStart, value)
  const kind = options.kind || 'symbol'

  if (kind === 'attribute') {
    const bracketContext = getBracketContext(value, cursor)
    if (bracketContext) {
      const existing = bracketContext.content.trim()
      const needsComma = Boolean(existing) && !/[，,]\s*$/.test(value.slice(0, cursor))
      const prefix = needsComma ? '，' : ''
      const text = `${prefix}${normalized}`
      return buildSelectionPayload(text, text.length)
    }
  }

  if (normalized === 'π') {
    return buildSelectionPayload('π[]()', 2)
  }

  if (normalized === 'σ') {
    return buildSelectionPayload('σ[]()', 2)
  }

  if (options.wrapStyle === 'quotes' || normalized === "'") {
    return buildSelectionPayload("''", 1)
  }

  return buildSelectionPayload(normalized, normalized.length)
}

export function insertTextAtCursor(textarea, insertedText, options = {}) {
  if (!textarea) return null

  const value = textarea.value || ''
  const start = clampSelection(textarea.selectionStart, value)
  const end = clampSelection(textarea.selectionEnd, value)
  const insertion =
    typeof insertedText === 'string'
      ? buildSelectionPayload(insertedText, insertedText.length)
      : insertedText && typeof insertedText === 'object'
        ? insertedText
        : buildSelectionPayload('', 0)

  const nextValue = `${value.slice(0, start)}${insertion.text}${value.slice(end)}`
  const nextSelectionStart = start + clampSelection(insertion.selectionStartOffset, insertion.text)
  const nextSelectionEnd = start + clampSelection(insertion.selectionEndOffset, insertion.text)

  textarea.value = nextValue
  if (typeof textarea.setSelectionRange === 'function') {
    textarea.setSelectionRange(nextSelectionStart, nextSelectionEnd)
  }
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
  textarea.focus()

  return {
    value: nextValue,
    selectionStart: nextSelectionStart,
    selectionEnd: nextSelectionEnd,
  }
}
