function normalizeWhitespace(value = '') {
  return String(value)
    .normalize('NFKC')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeExpressionAliases(value = '') {
  let text = normalizeWhitespace(value)

  const aliasRules = [
    [/\bINNER\s+JOIN\b/gi, '⋈'],
    [/\bCROSS\s+JOIN\b/gi, '⋈'],
    [/\bJOIN\b/gi, '⋈'],
    [/∞/g, '⋈'],
    [/\bPROJECT\b/gi, 'Π'],
    [/\bPI\b/gi, 'Π'],
    [/螤/g, 'Π'],
    [/π/g, 'Π'],
    [/\bSIGMA\b/gi, 'σ'],
    [/\bSELECT\b/gi, 'σ'],
    [/蟽/g, 'σ'],
    [/\bRENAME\b/gi, 'ρ'],
    [/蟻/g, 'ρ'],
    [/\bUNION\b/gi, '∪'],
    [/\bINTERSECT\b/gi, '∩'],
    [/\bDIFFERENCE\b/gi, '-'],
    [/\bMINUS\b/gi, '-'],
    [/\bDIVIDE\b/gi, '÷'],
    [/\bOVER\b/gi, '÷'],
    [/梅/g, '÷'],
    [/>=/g, '≥'],
    [/<=/g, '≤'],
    [/!=/g, '≠'],
    [/\bNOT\b/gi, '¬'],
    [/\bOR\b/gi, '∨'],
    [/\^/g, '^'],
  ]

  for (const [pattern, replacement] of aliasRules) {
    text = text.replace(pattern, replacement)
  }

  return text
    .replace(/\s*([,\[\]\(\)\{\}])\s*/g, '$1')
    .replace(/\s*([=<>!≥≤≠]+)\s*/g, '$1')
    .replace(/\s*([⋈∪∩÷ρΠσ¬∨^-])\s*/g, '$1')
    .replace(/\s+(AND)\s+/gi, ' $1 ')
    .trim()
}

function normalizeText(value = '') {
  return normalizeWhitespace(value)
}

function normalizeSchemaList(schemas = []) {
  return schemas
    .map((schema) => {
      if (!schema || typeof schema !== 'object') return null
      const attributes = Array.isArray(schema.attributes)
        ? [...new Set(schema.attributes.map((attribute) => normalizeText(attribute)).filter(Boolean))]
        : []

      return {
        ...schema,
        name: normalizeText(schema.name || ''),
        attributes,
      }
    })
    .filter(Boolean)
}

function normalizeSubquestionList(subquestions = []) {
  return subquestions
    .map((subquestion, index) => {
      if (!subquestion || typeof subquestion !== 'object') return null

      const referenceAnswer = normalizeExpressionAliases(
        subquestion.reference_answer || subquestion.answer || subquestion.correct_answer || ''
      )

      return {
        ...subquestion,
        id: String(subquestion.id ?? index + 1),
        label: normalizeText(subquestion.label || `(${index + 1})`),
        prompt: normalizeText(subquestion.prompt || ''),
        score: Number(subquestion.score) || 0,
        reference_answer: referenceAnswer,
      }
    })
    .filter(Boolean)
}

function normalizeTooling(tooling = {}) {
  if (!tooling || typeof tooling !== 'object') return {}

  return {
    ...tooling,
    symbols: Array.isArray(tooling.symbols)
      ? [...new Set(tooling.symbols.map((symbol) => normalizeText(symbol)).filter(Boolean))]
      : [],
    wrap_symbols: Array.isArray(tooling.wrap_symbols)
      ? [...new Set(tooling.wrap_symbols.map((symbol) => normalizeText(symbol)).filter(Boolean))]
      : [],
    default_join_symbol: normalizeText(tooling.default_join_symbol || '⋈') || '⋈',
  }
}

export function normalizeRelationalAlgebraExpression(value = '') {
  return normalizeExpressionAliases(value)
}

export function normalizeRelationalAlgebraQuestion(item = {}) {
  if (!item || typeof item !== 'object') return null

  const schemas = normalizeSchemaList(Array.isArray(item.schemas) ? item.schemas : [])
  const subquestions = normalizeSubquestionList(item.subquestions || item.questions || [])
  const answerMode = normalizeText(item.answer_mode || 'per_subquestion_expression') || 'per_subquestion_expression'

  return {
    ...item,
    type: 'relational_algebra',
    prompt: normalizeText(item.prompt || ''),
    schemas,
    subquestions,
    questions: subquestions,
    tooling: normalizeTooling(item.tooling),
    answer_mode: answerMode,
  }
}

export function getRelationalAlgebraSubquestions(item = {}) {
  if (!item || typeof item !== 'object') return []
  const subquestions = Array.isArray(item.subquestions) ? item.subquestions : Array.isArray(item.questions) ? item.questions : []
  return normalizeSubquestionList(subquestions)
}

export function getRelationalAlgebraResponseText(response, itemId, subquestionId) {
  if (response == null) return ''

  if (typeof response === 'string') return response

  if (typeof response !== 'object' || Array.isArray(response)) return ''

  const itemResponse = itemId && response[itemId]
  if (itemResponse && typeof itemResponse === 'object' && !Array.isArray(itemResponse)) {
    if (itemResponse.responses && typeof itemResponse.responses === 'object') {
      return String(itemResponse.responses[subquestionId] || '')
    }
    return String(itemResponse[subquestionId] || '')
  }

  if (response.responses && typeof response.responses === 'object') {
    return String(response.responses[subquestionId] || '')
  }

  if (Object.prototype.hasOwnProperty.call(response, subquestionId)) {
    return String(response[subquestionId] || '')
  }

  return String(response[subquestionId] || response.text || '')
}
