function stringifyScalar(value, fallback = '') {
  if (value == null) return fallback
  if (typeof value === 'string') return value.trim() || fallback
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return fallback
}

function formatNamedCollection(values = [], fallback = '') {
  const items = values
    .map((item) => {
      if (typeof item === 'string') return item.trim()
      if (!item || typeof item !== 'object') return ''
      return (
        stringifyScalar(item.name, '') ||
        stringifyScalar(item.label, '') ||
        stringifyScalar(item.text, '') ||
        stringifyScalar(item.value, '') ||
        stringifyScalar(item.id, '')
      )
    })
    .filter(Boolean)

  return items.length ? items.join('、') : fallback
}

function formatResponseMap(responses = {}, fallback = '未作答') {
  const lines = Object.entries(responses)
    .sort(([left], [right]) => String(left).localeCompare(String(right), 'zh-Hans-CN'))
    .map(([subId, response]) => `(${subId}) ${formatDisplayValue(response, '未作答')}`)

  return lines.length ? lines.join('\n') : fallback
}

function formatErDiagramValue(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ''

  const entityText = formatNamedCollection(value.entities || value.entityes || [], '')
  const relationshipText = formatNamedCollection(
    value.relationships || value.relations || value.links || [],
    ''
  )
  const attributeText = formatNamedCollection(value.attributes || value.fields || [], '')
  const primaryKeyText = formatNamedCollection(
    value.primary_keys || value.primaryKeys || value.keys || [],
    ''
  )
  const cardinalityText = formatNamedCollection(
    value.cardinalities || value.cardinality || value.constraints || [],
    ''
  )

  const lines = [
    entityText ? `实体：${entityText}` : '',
    relationshipText ? `联系：${relationshipText}` : '',
    attributeText ? `属性：${attributeText}` : '',
    primaryKeyText ? `主键：${primaryKeyText}` : '',
    cardinalityText ? `基数：${cardinalityText}` : '',
  ].filter(Boolean)

  return lines.join('\n')
}

export function formatDisplayValue(value, fallback = '') {
  if (value == null) return fallback

  if (typeof value === 'string') return value.trim() || fallback
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)

  if (Array.isArray(value)) {
    const items = value
      .map((item) => formatDisplayValue(item, ''))
      .filter(Boolean)
    return items.length ? items.join('\n') : fallback
  }

  if (typeof value === 'object') {
    if (typeof value.text === 'string') return value.text.trim() || fallback

    if (value.responses && typeof value.responses === 'object') {
      return formatResponseMap(value.responses, fallback)
    }

    const erDiagramText = formatErDiagramValue(value)
    if (erDiagramText) return erDiagramText

    if ('label' in value || 'value' in value) {
      return stringifyScalar(value.label, '') || stringifyScalar(value.value, '') || fallback
    }

    try {
      return JSON.stringify(value, null, 2)
    } catch {
      return fallback
    }
  }

  return fallback
}

export function formatSchemaSummary(schemas = []) {
  const lines = (Array.isArray(schemas) ? schemas : [])
    .map((schema) => {
      const name = stringifyScalar(schema?.name || schema?.table || schema?.relation, '')
      const attributes = Array.isArray(schema?.attributes)
        ? schema.attributes.map((attribute) => stringifyScalar(attribute, '')).filter(Boolean)
        : []
      if (!name) return ''
      return `${name}（${attributes.join('、')}）`
    })
    .filter(Boolean)

  return lines.join('\n')
}

export function normalizeDisplayList(value) {
  if (!value) return []

  if (Array.isArray(value)) {
    return value.map((item) => formatDisplayValue(item, '')).filter(Boolean)
  }

  if (typeof value === 'string') {
    const text = value.trim()
    return text ? [text] : []
  }

  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([key, item]) => {
        const next = formatDisplayValue(item, '')
        return next ? `${key}：${next}` : ''
      })
      .filter(Boolean)
  }

  return []
}

export function buildQuestionDisplayModel(item = {}, response = null, overrides = {}) {
  const type = overrides.type || item?.type || 'short_answer'
  const contextTitle =
    overrides.contextTitle ??
    item?.context_title ??
    item?.material_title ??
    item?.composite_context?.material_title ??
    ''
  let contextText =
    overrides.contextText ??
    item?.context ??
    item?.material ??
    item?.composite_context?.material ??
    ''

  if (!contextText && type === 'relational_algebra' && Array.isArray(item?.schemas)) {
    contextText = formatSchemaSummary(item.schemas)
  }

  const contextFormat =
    overrides.contextFormat ??
    item?.context_format ??
    item?.material_format ??
    item?.presentation ??
    item?.composite_context?.material_format ??
    'plain'

  const referenceText = formatDisplayValue(
    overrides.referenceText ??
      item?.reference_answer ??
      item?.answer?.reference_answer ??
      item?.answer?.correct ??
      '',
    '暂无参考答案'
  )
  const userText = formatDisplayValue(response, '未作答')
  const requirements = normalizeDisplayList(item?.requirements)
  const scoringPoints = normalizeDisplayList(item?.answer?.scoring_points || item?.scoring_points)

  return {
    displayType: type,
    codeLike: type === 'sql' || type === 'relational_algebra',
    contextCodeLike: contextFormat === 'sql' || type === 'sql' || type === 'relational_algebra',
    contextTitle: contextTitle || (type === 'relational_algebra' && contextText ? '关系模式' : ''),
    contextText: formatDisplayValue(contextText, ''),
    userText,
    referenceText,
    requirements,
    scoringPoints,
  }
}
