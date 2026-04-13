function safeId(prefix = 'node') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

function normalizeFlag(value) {
  return Boolean(value)
}

function normalizeAttribute(attribute) {
  return {
    id: String(attribute?.id || safeId('attr')),
    name: String(attribute?.name || '').trim(),
    isPrimaryKey: normalizeFlag(attribute?.isPrimaryKey),
    isForeignKey: normalizeFlag(attribute?.isForeignKey),
  }
}

function normalizeEntity(entity) {
  return {
    id: String(entity?.id || safeId('entity')),
    name: String(entity?.name || '').trim(),
    attributes: Array.isArray(entity?.attributes) ? entity.attributes.map(normalizeAttribute) : [],
  }
}

function normalizeRelationship(relationship) {
  return {
    id: String(relationship?.id || safeId('relationship')),
    name: String(relationship?.name || '').trim(),
    fromEntityId: String(relationship?.fromEntityId || ''),
    toEntityId: String(relationship?.toEntityId || ''),
    cardinalityFrom: String(relationship?.cardinalityFrom || '').trim(),
    cardinalityTo: String(relationship?.cardinalityTo || '').trim(),
  }
}

function normalizeRelationSchema(schema) {
  return {
    id: String(schema?.id || safeId('schema')),
    name: String(schema?.name || '').trim(),
    attributes: Array.isArray(schema?.attributes) ? schema.attributes.map(normalizeAttribute) : [],
  }
}

function safeParseJson(text) {
  if (typeof text !== 'string') return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export function createEmptyErDiagramResponse() {
  return {
    diagram: {
      entities: [
        {
          id: safeId('entity'),
          name: '',
          attributes: [],
        },
      ],
      relationships: [],
    },
    relations: [],
    notes: '',
  }
}

export function normalizeErDiagramResponse(response) {
  if (!response) return createEmptyErDiagramResponse()

  if (typeof response === 'string') {
    const parsed = safeParseJson(response)
    if (parsed) return normalizeErDiagramResponse(parsed)
    return {
      ...createEmptyErDiagramResponse(),
      notes: response,
    }
  }

  if (typeof response !== 'object') return createEmptyErDiagramResponse()

  return {
    diagram: {
      entities: Array.isArray(response?.diagram?.entities) ? response.diagram.entities.map(normalizeEntity) : [],
      relationships: Array.isArray(response?.diagram?.relationships)
        ? response.diagram.relationships.map(normalizeRelationship)
        : [],
    },
    relations: Array.isArray(response?.relations) ? response.relations.map(normalizeRelationSchema) : [],
    notes: String(response?.notes || response?.text || '').trim(),
  }
}

export function buildErDiagramAttributeLabel(attribute) {
  const name = String(attribute?.name || '').trim()
  if (!name) return ''
  if (attribute?.isPrimaryKey) return `__${name}__`
  if (attribute?.isForeignKey) return `~~${name}~~`
  return name
}

export function serializeErDiagramResponse(response) {
  const normalized = normalizeErDiagramResponse(response)
  const entityLines = normalized.diagram.entities
    .filter((entity) => entity.name)
    .map((entity) => {
      const attributes = entity.attributes
        .filter((attribute) => attribute.name)
        .map(buildErDiagramAttributeLabel)
        .join('、')
      return attributes ? `${entity.name}（${attributes}）` : entity.name
    })

  const relationshipLines = normalized.diagram.relationships
    .filter((relationship) => relationship.name || relationship.fromEntityId || relationship.toEntityId)
    .map((relationship) => {
      const from = normalized.diagram.entities.find((entity) => entity.id === relationship.fromEntityId)?.name || '未指定实体'
      const to = normalized.diagram.entities.find((entity) => entity.id === relationship.toEntityId)?.name || '未指定实体'
      const cardinality = [relationship.cardinalityFrom, relationship.cardinalityTo].filter(Boolean).join(' : ')
      return `${relationship.name || '联系'}：${from} -> ${to}${cardinality ? `（${cardinality}）` : ''}`
    })

  const relationLines = normalized.relations
    .filter((relation) => relation.name)
    .map((relation) => {
      const attributes = relation.attributes
        .filter((attribute) => attribute.name)
        .map(buildErDiagramAttributeLabel)
        .join('、')
      return attributes ? `${relation.name}（${attributes}）` : relation.name
    })

  return [
    entityLines.length > 0 ? `实体：${entityLines.join('；')}` : '',
    relationshipLines.length > 0 ? `联系：${relationshipLines.join('；')}` : '',
    relationLines.length > 0 ? `关系模式：${relationLines.join('；')}` : '',
    normalized.notes ? `补充说明：${normalized.notes}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

export function hasMeaningfulErDiagramResponse(response) {
  const normalized = normalizeErDiagramResponse(response)
  return Boolean(
    normalized.diagram.entities.some((entity) => entity.name || entity.attributes.some((attribute) => attribute.name)) ||
      normalized.diagram.relationships.some(
        (relationship) =>
          relationship.name ||
          relationship.fromEntityId ||
          relationship.toEntityId ||
          relationship.cardinalityFrom ||
          relationship.cardinalityTo
      ) ||
      normalized.relations.some(
        (relation) => relation.name || relation.attributes.some((attribute) => attribute.name)
      ) ||
      normalized.notes
  )
}

export function createErDiagramAttribute() {
  return {
    id: safeId('attr'),
    name: '',
    isPrimaryKey: false,
    isForeignKey: false,
  }
}

export function createErDiagramEntity() {
  return {
    id: safeId('entity'),
    name: '',
    attributes: [],
  }
}

export function createErDiagramRelationship() {
  return {
    id: safeId('relationship'),
    name: '',
    fromEntityId: '',
    toEntityId: '',
    cardinalityFrom: '',
    cardinalityTo: '',
  }
}

export function createRelationSchemaRow() {
  return {
    id: safeId('schema'),
    name: '',
    attributes: [],
  }
}
