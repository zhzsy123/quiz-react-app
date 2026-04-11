export const BLUEPRINT_PLAN_SCHEMA_VERSION = 'question-blueprint-plan-v1'
export const BLUEPRINT_GROUP_SCHEMA_VERSION = 'question-blueprint-group-v1'

export const BLUEPRINT_REQUIRED_ITEM_FIELDS = [
  'blueprint_key',
  'type_key',
  'order_index',
  'score',
  'difficulty',
  'knowledge_point',
  'task_pattern',
  'scenario',
  'variant',
]

export const BLUEPRINT_REQUIRED_GROUP_FIELDS = [
  'schema_version',
  'subject',
  'type_key',
  'count',
  'items',
]

export function createBlueprintKeyPrefix(subjectKey = '', typeKey = '') {
  return [String(subjectKey || '').trim(), String(typeKey || '').trim()].filter(Boolean).join(':')
}

export function normalizeBlueprintText(value, fallback = '') {
  const text = String(value ?? fallback).trim()
  return text || fallback
}

export function normalizeBlueprintVariant(value, fallback = 'a') {
  const text = normalizeBlueprintText(value, fallback).toLowerCase()
  return text.replace(/[^a-z0-9_-]+/g, '-') || fallback
}

export function buildBlueprintCoverageTargets(requestedCount = 1) {
  const count = Math.max(1, Number(requestedCount) || 1)
  const minimumDistinctKnowledgePoints =
    count <= 2 ? count : Math.min(count, Math.max(2, Math.ceil(count * 0.6)))
  const maxRepeatPerKnowledgePoint = count <= 2 ? 1 : Math.max(1, Math.ceil(count / 2))
  const minimumDistinctTaskPatterns =
    count <= 2 ? 1 : Math.min(count, Math.max(2, Math.ceil(count / 2)))
  const maxRepeatPerTaskPattern = count <= 2 ? count : Math.max(1, Math.ceil(count * 0.7))

  return {
    minimumDistinctKnowledgePoints,
    maxRepeatPerKnowledgePoint,
    minimumDistinctTaskPatterns,
    maxRepeatPerTaskPattern,
  }
}
