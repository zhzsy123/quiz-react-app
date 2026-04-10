const SYMBOL_ALIAS_MAP = new Map([
  ['Π', 'π'],
  ['PI', 'π'],
  ['pi', 'π'],
  ['PROJECT', 'π'],
  ['project', 'π'],
  ['σ', 'σ'],
  ['SELECT', 'σ'],
  ['select', 'σ'],
  ['SIGMA', 'σ'],
  ['sigma', 'σ'],
  ['⋈', '⋈'],
  ['⨝', '⋈'],
  ['JOIN', '⋈'],
  ['join', '⋈'],
  ['∞', '⋈'],
  ['÷', '÷'],
  ['DIVIDE', '÷'],
  ['divide', '÷'],
  ['∪', '∪'],
  ['UNION', '∪'],
  ['union', '∪'],
  ['∩', '∩'],
  ['INTERSECT', '∩'],
  ['intersect', '∩'],
  ['¬', '¬'],
  ['NOT', '¬'],
  ['not', '¬'],
  ['∨', '∨'],
  ['OR', '∨'],
  ['or', '∨'],
  ['^', '^'],
  ['∧', '^'],
  ['AND', '^'],
  ['and', '^'],
  ['≥', '≥'],
  ['>=', '≥'],
  ['≤', '≤'],
  ['<=', '≤'],
  ['≠', '≠'],
  ['!=', '≠'],
  ['<>', '≠'],
  ['ρ', 'ρ'],
  ['RENAME', 'ρ'],
  ['rename', 'ρ'],
])

const WRAP_SYMBOLS = new Set(['π', 'σ', 'ρ'])

function safeParseJson(text) {
  if (typeof text !== 'string') return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export function normalizeSymbol(value = '') {
  const trimmed = String(value || '').trim()
  return SYMBOL_ALIAS_MAP.get(trimmed) || trimmed
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

export function insertTextAtCursor(textarea, insertedText, options = {}) {
  if (!textarea) return null

  const value = textarea.value || ''
  const start = typeof textarea.selectionStart === 'number' ? textarea.selectionStart : value.length
  const end = typeof textarea.selectionEnd === 'number' ? textarea.selectionEnd : value.length
  const insertion = String(insertedText || '')
  const nextValue = `${value.slice(0, start)}${insertion}${value.slice(end)}`
  const normalizedSymbol = normalizeSymbol(insertion.replace(/\[\]$|\(\)$|''$/g, ''))
  const cursorOffset =
    typeof options.cursorOffset === 'number'
      ? options.cursorOffset
      : WRAP_SYMBOLS.has(normalizedSymbol)
        ? insertion.length - 1
        : insertion.length
  const nextCursor = start + cursorOffset

  textarea.value = nextValue
  if (typeof textarea.setSelectionRange === 'function') {
    textarea.setSelectionRange(nextCursor, nextCursor)
  }
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
  textarea.focus()

  return {
    value: nextValue,
    cursor: nextCursor,
  }
}

export function buildRelationalAlgebraInsertion(symbol, { wrap = false, wrapStyle = 'parens' } = {}) {
  const normalized = normalizeSymbol(symbol)
  if (!normalized) return ''
  if (!wrap) return normalized
  if (wrapStyle === 'brackets') return `${normalized}[]`
  if (wrapStyle === 'quotes') return "''"
  return `${normalized}()`
}

export function isRelationalAlgebraWrapSymbol(symbol) {
  return WRAP_SYMBOLS.has(normalizeSymbol(symbol))
}
