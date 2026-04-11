import { describe, expect, it } from 'vitest'
import { buildBlueprintPrompt } from './buildBlueprintPrompt.js'

describe('buildBlueprintPrompt', () => {
  it('builds a blueprint planning payload for a single type', () => {
    const result = buildBlueprintPrompt({
      subjectKey: 'english',
      params: {
        mode: 'practice',
        difficulty: 'medium',
        paperTitle: 'English draft',
        extraPrompt: 'focus on CET style',
      },
      requestId: 'plan_001',
      typeKey: 'reading',
      count: 2,
      score: 10,
      startOrderIndex: 3,
    })

    const payload = JSON.parse(result.userPrompt)

    expect(result.systemPrompt).toContain('plan unique quiz question blueprints')
    expect(payload.schema_version).toBe('question-blueprint-group-v1')
    expect(payload.request_id).toBe('plan_001')
    expect(payload.subject).toBe('english')
    expect(payload.type_key).toBe('reading')
    expect(payload.count).toBe(2)
    expect(payload.score_per_item).toBe(10)
    expect(payload.start_order_index).toBe(3)
    expect(payload.blueprint_contract.blueprint_required_fields).toContain('blueprint_key')
    expect(payload.coverage_constraints.min_distinct_knowledge_points).toBe(2)
    expect(payload.coverage_constraints.max_repeat_per_knowledge_point).toBe(1)
    expect(payload.rules.join(' ')).toContain('distinct knowledge_point')
  })
})
