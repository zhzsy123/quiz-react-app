import { describe, expect, it } from 'vitest'
import { validateBlueprintPlan } from './validateBlueprintPlan.js'

describe('validateBlueprintPlan', () => {
  it('normalizes returned blueprint items and keeps keys unique', () => {
    const result = validateBlueprintPlan({
      subjectKey: 'english',
      typeKey: 'single_choice',
      requestedCount: 2,
      score: 2,
      difficulty: 'medium',
      startOrderIndex: 5,
      payload: {
        items: [
          {
            blueprint_key: 'dup-key',
            order_index: 5,
            score: 2,
            knowledge_point: 'vocabulary',
            task_pattern: 'context',
            scenario: 'campus',
            variant: 'A',
          },
          {
            blueprint_key: 'dup-key',
            order_index: 5,
            score: 2,
            knowledge_point: 'grammar',
            task_pattern: 'tense',
            scenario: 'daily',
            variant: 'B',
          },
        ],
      },
    })

    expect(result.status).toBe('valid')
    expect(result.items).toHaveLength(2)
    expect(result.items[0].blueprint_key).toBe('dup-key')
    expect(result.items[1].blueprint_key).not.toBe('dup-key')
    expect(result.items[0].order_index).toBe(5)
    expect(result.items[1].order_index).toBe(6)
  })

  it('falls back when planner returns no usable items', () => {
    const result = validateBlueprintPlan({
      subjectKey: 'database_principles',
      typeKey: 'relational_algebra',
      requestedCount: 1,
      score: 20,
      difficulty: 'hard',
      startOrderIndex: 1,
      payload: {},
    })

    expect(result.status).toBe('fallback')
    expect(result.items).toHaveLength(1)
    expect(result.items[0].type_key).toBe('relational_algebra')
    expect(result.items[0].blueprint_key).toContain('database_principles:relational_algebra')
    expect(result.warnings[0]).toContain('fallback')
  })

  it('marks coverage warnings when knowledge points are overly concentrated', () => {
    const result = validateBlueprintPlan({
      subjectKey: 'english',
      typeKey: 'single_choice',
      requestedCount: 3,
      score: 2,
      difficulty: 'medium',
      startOrderIndex: 1,
      payload: {
        items: [
          {
            blueprint_key: 'sc-1',
            order_index: 1,
            score: 2,
            knowledge_point: 'vocabulary',
            task_pattern: 'context',
            scenario: 'campus',
            variant: 'a',
          },
          {
            blueprint_key: 'sc-2',
            order_index: 2,
            score: 2,
            knowledge_point: 'vocabulary',
            task_pattern: 'context',
            scenario: 'office',
            variant: 'b',
          },
          {
            blueprint_key: 'sc-3',
            order_index: 3,
            score: 2,
            knowledge_point: 'vocabulary',
            task_pattern: 'context',
            scenario: 'travel',
            variant: 'c',
          },
        ],
      },
    })

    expect(result.status).toBe('warning')
    expect(result.coverage.needsRefinement).toBe(true)
    expect(result.coverage.distinctKnowledgePoints).toBe(1)
    expect(result.warnings.join(' ')).toContain('knowledge points')
  })
})
