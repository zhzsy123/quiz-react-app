import { getQuestionTypeMeta } from '../../subject/model/subjects.js'
import {
  BLUEPRINT_GROUP_SCHEMA_VERSION,
  buildBlueprintCoverageTargets,
  createBlueprintKeyPrefix,
  normalizeBlueprintText,
  normalizeBlueprintVariant,
} from './blueprintPlanSchema.js'

function asPositiveInt(value, fallback = 1) {
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : fallback
}

function toItemArray(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.items)) return payload.items
  if (Array.isArray(payload?.group?.items)) return payload.group.items
  if (Array.isArray(payload?.groups) && payload.groups.length === 1 && Array.isArray(payload.groups[0]?.items)) {
    return payload.groups[0].items
  }
  return []
}

function buildFallbackBlueprint({
  subjectKey,
  typeKey,
  requestedCount,
  score,
  difficulty,
  startOrderIndex,
}) {
  const typeMeta = getQuestionTypeMeta(typeKey)
  return Array.from({ length: requestedCount }, (_, index) => {
    const orderIndex = startOrderIndex + index
    return {
      blueprint_key: `${createBlueprintKeyPrefix(subjectKey, typeKey)}:${orderIndex}`,
      type_key: typeKey,
      order_index: orderIndex,
      score,
      difficulty,
      knowledge_point: typeMeta.label || typeKey,
      task_pattern: typeMeta.label || typeKey,
      scenario: 'generic',
      variant: `fallback-${index + 1}`,
      stem_goal: '',
      dedupe_tags: [typeKey, typeMeta.label || typeKey],
      constraints: {
        must_be_gradable: true,
      },
    }
  })
}

function buildCountMap(items, field) {
  return items.reduce((map, item) => {
    const key = normalizeBlueprintText(item?.[field], '')
    if (!key) return map
    map.set(key, (map.get(key) || 0) + 1)
    return map
  }, new Map())
}

function buildCoverageSummary(items = [], requestedCount = 1) {
  const targets = buildBlueprintCoverageTargets(requestedCount)
  const knowledgePointCounts = buildCountMap(items, 'knowledge_point')
  const taskPatternCounts = buildCountMap(items, 'task_pattern')
  const repeatedKnowledgePoints = [...knowledgePointCounts.entries()]
    .filter(([, count]) => count > targets.maxRepeatPerKnowledgePoint)
    .map(([value, count]) => ({ value, count }))
  const repeatedTaskPatterns = [...taskPatternCounts.entries()]
    .filter(([, count]) => count > targets.maxRepeatPerTaskPattern)
    .map(([value, count]) => ({ value, count }))
  const distinctKnowledgePoints = knowledgePointCounts.size
  const distinctTaskPatterns = taskPatternCounts.size
  const needsRefinement =
    distinctKnowledgePoints < targets.minimumDistinctKnowledgePoints ||
    distinctTaskPatterns < targets.minimumDistinctTaskPatterns ||
    repeatedKnowledgePoints.length > 0 ||
    repeatedTaskPatterns.length > 0

  return {
    ...targets,
    distinctKnowledgePoints,
    distinctTaskPatterns,
    repeatedKnowledgePoints,
    repeatedTaskPatterns,
    needsRefinement,
  }
}

export function validateBlueprintPlan({
  subjectKey = '',
  typeKey = '',
  requestedCount = 1,
  score = 1,
  difficulty = 'medium',
  startOrderIndex = 1,
  payload,
} = {}) {
  const typeMeta = getQuestionTypeMeta(typeKey)
  const items = toItemArray(payload)

  if (!items.length) {
    return {
      status: 'fallback',
      schema_version: BLUEPRINT_GROUP_SCHEMA_VERSION,
      subject: subjectKey,
      type_key: typeKey,
      count: requestedCount,
      items: buildFallbackBlueprint({
        subjectKey,
        typeKey,
        requestedCount,
        score,
        difficulty,
        startOrderIndex,
      }),
      warnings: ['Blueprint planner returned no usable items; fallback blueprints were used.'],
    }
  }

  const normalizedItems = items.slice(0, requestedCount).map((item, index) => {
    const orderIndex = asPositiveInt(item?.order_index, startOrderIndex + index)
    const safeDifficulty = normalizeBlueprintText(item?.difficulty, difficulty)
    const safeKnowledgePoint = normalizeBlueprintText(item?.knowledge_point, typeMeta.label || typeKey)
    const safeTaskPattern = normalizeBlueprintText(item?.task_pattern, typeMeta.label || typeKey)
    const safeScenario = normalizeBlueprintText(item?.scenario, 'generic')
    const safeVariant = normalizeBlueprintVariant(item?.variant, String.fromCharCode(97 + (index % 26)))
    const blueprintKey =
      normalizeBlueprintText(item?.blueprint_key) ||
      `${createBlueprintKeyPrefix(subjectKey, typeKey)}:${orderIndex}:${safeVariant}`

    return {
      blueprint_key: blueprintKey,
      type_key: typeKey,
      order_index: orderIndex,
      score: asPositiveInt(item?.score, score),
      difficulty: safeDifficulty,
      knowledge_point: safeKnowledgePoint,
      task_pattern: safeTaskPattern,
      scenario: safeScenario,
      variant: safeVariant,
      stem_goal: normalizeBlueprintText(item?.stem_goal, ''),
      dedupe_tags: Array.isArray(item?.dedupe_tags)
        ? item.dedupe_tags.map((tag) => normalizeBlueprintText(tag)).filter(Boolean)
        : [safeKnowledgePoint, safeTaskPattern, safeScenario].filter(Boolean),
      constraints:
        item?.constraints && typeof item.constraints === 'object'
          ? { ...item.constraints }
          : { must_be_gradable: true },
    }
  })

  const keySet = new Set()
  const orderSet = new Set()
  normalizedItems.forEach((item, index) => {
    if (keySet.has(item.blueprint_key)) {
      item.blueprint_key = `${item.blueprint_key}:${index + 1}`
    }
    keySet.add(item.blueprint_key)

    if (orderSet.has(item.order_index)) {
      item.order_index = startOrderIndex + index
    }
    orderSet.add(item.order_index)
  })

  const completedItems =
    normalizedItems.length < requestedCount
      ? [
          ...normalizedItems,
          ...buildFallbackBlueprint({
            subjectKey,
            typeKey,
            requestedCount: requestedCount - normalizedItems.length,
            score,
            difficulty,
            startOrderIndex: startOrderIndex + normalizedItems.length,
          }),
        ]
      : normalizedItems

  const warnings = []
  if (normalizedItems.length < requestedCount) {
    warnings.push('Blueprint planner returned fewer items than requested; fallback blueprints filled the gap.')
  }

  const coverage = buildCoverageSummary(completedItems, requestedCount)
  if (coverage.distinctKnowledgePoints < coverage.minimumDistinctKnowledgePoints) {
    warnings.push(
      `Blueprint coverage is too narrow: only ${coverage.distinctKnowledgePoints} distinct knowledge points for ${requestedCount} items.`
    )
  }
  if (coverage.distinctTaskPatterns < coverage.minimumDistinctTaskPatterns) {
    warnings.push(
      `Blueprint task patterns are too concentrated: only ${coverage.distinctTaskPatterns} distinct task patterns for ${requestedCount} items.`
    )
  }
  if (coverage.repeatedKnowledgePoints.length > 0) {
    warnings.push(
      `Blueprint knowledge points repeat too often: ${coverage.repeatedKnowledgePoints
        .map(({ value, count }) => `${value} x${count}`)
        .join(', ')}.`
    )
  }
  if (coverage.repeatedTaskPatterns.length > 0) {
    warnings.push(
      `Blueprint task patterns repeat too often: ${coverage.repeatedTaskPatterns
        .map(({ value, count }) => `${value} x${count}`)
        .join(', ')}.`
    )
  }

  return {
    status: warnings.length ? 'warning' : 'valid',
    schema_version: BLUEPRINT_GROUP_SCHEMA_VERSION,
    subject: subjectKey,
    type_key: typeKey,
    count: requestedCount,
    items: completedItems,
    warnings,
    coverage,
  }
}
