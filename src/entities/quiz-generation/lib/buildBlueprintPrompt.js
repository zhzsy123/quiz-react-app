import { getQuestionTypeMeta } from '../../subject/model/subjects.js'
import {
  BLUEPRINT_GROUP_SCHEMA_VERSION,
  BLUEPRINT_REQUIRED_ITEM_FIELDS,
  buildBlueprintCoverageTargets,
} from './blueprintPlanSchema.js'
import { normalizeGenerationParams } from './buildGenerationPrompt.js'

function getBlueprintContractPayload(questionTypeMeta) {
  return {
    type_key: questionTypeMeta?.key || 'unknown',
    label: questionTypeMeta?.label || questionTypeMeta?.key || 'Unknown',
    summary: questionTypeMeta?.generationContract?.summary || '',
    target_required_fields: questionTypeMeta?.generationContract?.requiredFields || [],
    blueprint_required_fields: BLUEPRINT_REQUIRED_ITEM_FIELDS,
  }
}

export function buildBlueprintPrompt({
  subjectKey,
  params = {},
  requestId = '',
  typeKey = '',
  count = 1,
  score = 1,
  startOrderIndex = 1,
  previousWarnings = [],
  attempt = 1,
} = {}) {
  const { subjectMeta, generation, normalized } = normalizeGenerationParams(subjectKey, params)
  const questionTypeMeta = getQuestionTypeMeta(typeKey)
  const coverageTargets = buildBlueprintCoverageTargets(count)
  const systemPrompt = [
    'You plan unique quiz question blueprints for exactly one question type.',
    'Return only one JSON object.',
    'Do not generate full questions.',
    'Do not output markdown, comments, or explanation.',
    'The JSON must be directly parseable by JSON.parse.',
  ].join(' ')

  const payload = {
    schema_version: BLUEPRINT_GROUP_SCHEMA_VERSION,
    request_id: requestId || `plan_${Date.now()}`,
    subject: subjectMeta.key,
    mode: normalized.mode,
    difficulty: normalized.difficulty,
    paper_title: normalized.paperTitle || subjectMeta.label,
    extra_prompt: normalized.extraPrompt,
    type_key: typeKey,
    type_label: questionTypeMeta.label,
    count,
    score_per_item: score,
    start_order_index: startOrderIndex,
    attempt,
    blueprint_contract: getBlueprintContractPayload(questionTypeMeta),
    coverage_constraints: {
      min_distinct_knowledge_points: coverageTargets.minimumDistinctKnowledgePoints,
      max_repeat_per_knowledge_point: coverageTargets.maxRepeatPerKnowledgePoint,
      min_distinct_task_patterns: coverageTargets.minimumDistinctTaskPatterns,
      max_repeat_per_task_pattern: coverageTargets.maxRepeatPerTaskPattern,
    },
    rules: [
      'Return exactly count blueprint items.',
      'Every blueprint_key must be unique within this response.',
      'Do not repeat the same knowledge_point + task_pattern + scenario combination.',
      `Use at least ${coverageTargets.minimumDistinctKnowledgePoints} distinct knowledge_point values when possible.`,
      `Do not repeat one knowledge_point more than ${coverageTargets.maxRepeatPerKnowledgePoint} times.`,
      `Use at least ${coverageTargets.minimumDistinctTaskPatterns} distinct task_pattern values when possible.`,
      `Do not repeat one task_pattern more than ${coverageTargets.maxRepeatPerTaskPattern} times.`,
      'Do not generate final question text, options, answers, or rationale.',
      'Every item must keep type_key equal to the requested type_key.',
      'Every item must keep score equal to score_per_item.',
      'order_index must start from start_order_index and increase by 1.',
    ],
    planner_profile: generation.promptProfile || 'generic',
  }

  if (previousWarnings.length > 0) {
    payload.previous_warnings = previousWarnings
    payload.rules.push('Fix the previous coverage problems before returning the new blueprint plan.')
  }

  return {
    subjectMeta,
    generation,
    normalized,
    questionTypeMeta,
    systemPrompt,
    userPrompt: JSON.stringify(payload),
  }
}
