const OPERATOR_ALIASES = [
  [/Π|PI|PROJECT/gi, 'π'],
  [/Σ|σ|SIGMA|SELECT/gi, 'σ'],
  [/ρ|RENAME/gi, 'ρ'],
  [/⨝|⋈|JOIN|∞/gi, '⋈'],
  [/÷|DIVIDE/gi, '÷'],
  [/∪|UNION/gi, '∪'],
  [/∩|INTERSECT/gi, '∩'],
  [/¬|NOT/gi, '¬'],
  [/\bOR\b|∨/gi, '∨'],
  [/\bAND\b|∧/gi, '^'],
]

function normalizePunctuation(text) {
  return String(text || '')
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/【|［/g, '[')
    .replace(/】|］/g, ']')
    .replace(/，/g, ',')
    .replace(/；/g, ';')
    .replace(/[“”‘’]/g, "'")
    .replace(/≥|>=/g, '≥')
    .replace(/≤|<=/g, '≤')
    .replace(/<>|!=/g, '≠')
}

function normalizeSymbolLike(value = '') {
  return normalizeRelationalAlgebraExpression(String(value || '')).trim()
}

export function normalizeRelationalAlgebraExpression(expression = '') {
  let normalized = normalizePunctuation(expression)
  OPERATOR_ALIASES.forEach(([pattern, replacement]) => {
    normalized = normalized.replace(pattern, replacement)
  })

  return normalized
    .replace(/\s+/g, ' ')
    .replace(/\s*([()[\],^=≥≤≠¬∨∪∩⋈÷;])\s*/g, '$1')
    .replace(/\s*-\s*/g, '-')
    .trim()
}

export function normalizeRelationalAlgebraQuestion(item = {}) {
  if (!item || typeof item !== 'object') return item

  const rawSubquestions = Array.isArray(item.subquestions)
    ? item.subquestions
    : Array.isArray(item.questions)
      ? item.questions
      : []
  const tooling = item.tooling || {}
  const normalizedSubquestions = rawSubquestions.map((subquestion, index) => ({
    ...subquestion,
    id: String(subquestion?.id ?? index + 1),
    label: subquestion?.label || `(${index + 1})`,
    prompt: String(subquestion?.prompt || '').trim(),
    score: Number(subquestion?.score) || 0,
    reference_answer: normalizeRelationalAlgebraExpression(
      subquestion?.reference_answer || subquestion?.answer || subquestion?.correct_answer || ''
    ),
  }))

  return {
    ...item,
    prompt: String(item.prompt || '').trim(),
    schemas: Array.isArray(item.schemas)
      ? item.schemas.map((schema) => ({
          ...schema,
          name: String(schema?.name || '').trim(),
          attributes: Array.isArray(schema?.attributes)
            ? schema.attributes.map((attribute) => String(attribute || '').trim()).filter(Boolean)
            : [],
        }))
      : [],
    subquestions: normalizedSubquestions,
    questions: normalizedSubquestions,
    tooling: {
      ...tooling,
      symbols: Array.isArray(tooling.symbols)
        ? Array.from(new Set(tooling.symbols.map((symbol) => normalizeSymbolLike(symbol)).filter(Boolean)))
        : [],
      wrap_symbols: Array.isArray(tooling.wrap_symbols)
        ? Array.from(new Set(tooling.wrap_symbols.map((symbol) => normalizeSymbolLike(symbol)).filter(Boolean)))
        : [],
      default_join_symbol: normalizeSymbolLike(tooling.default_join_symbol || '⋈'),
    },
  }
}

export function getRelationalAlgebraSubquestions(item = {}) {
  if (Array.isArray(item?.subquestions)) return item.subquestions
  if (Array.isArray(item?.questions)) return item.questions
  return []
}

export function getRelationalAlgebraResponseText(response, itemId, subquestionId) {
  if (!response) return ''

  if (typeof response === 'string') return response
  if (typeof response?.responses?.[subquestionId] === 'string') return response.responses[subquestionId]
  if (typeof response?.responses?.[String(subquestionId)] === 'string') return response.responses[String(subquestionId)]
  if (typeof response?.[subquestionId] === 'string') return response[subquestionId]
  if (typeof response?.[String(subquestionId)] === 'string') return response[String(subquestionId)]
  if (typeof response?.text === 'string') return response.text

  return ''
}
