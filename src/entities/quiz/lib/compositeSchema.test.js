import { describe, expect, it } from 'vitest'
import { normalizeQuizPayload } from './normalize/normalizeQuizPayload'
import { getQuizScoreBreakdown } from './scoring/getQuizScoreBreakdown'
import { validateQuizPayload } from './validation/validateQuizPayload'

function createCompositePayload(overrides = {}) {
  return {
    schema_version: '2026-04',
    title: 'DS/DB Composite Quiz',
    subject: 'database',
    questions: [
      {
        id: 'comp_1',
        type: 'composite',
        prompt: 'Read the following transaction schedule and answer the questions.',
        material_title: 'Transaction schedule',
        material: 'T1: read(A); T2: write(A);',
        material_format: 'sql',
        presentation: 'code',
        deliverable_type: 'transaction_analysis',
        tags: ['transaction', 'concurrency'],
        assets: [{ type: 'text', value: 'schedule' }],
        questions: [
          {
            id: 'q1',
            type: 'single_choice',
            prompt: 'Is the schedule conflict-serializable?',
            score: 2,
            options: ['A. Yes', 'B. No'],
            answer: { correct: 'A' },
          },
          {
            id: 'q2',
            type: 'short_answer',
            prompt: 'Explain your reasoning.',
            score: 6,
            answer: {
              reference_answer: 'Analyze whether the precedence graph contains a cycle.',
              scoring_points: ['precedence graph', 'cycle', 'conclusion'],
            },
          },
        ],
      },
    ],
    ...overrides,
  }
}

describe('composite quiz schema', () => {
  it('accepts a valid composite payload with supported child question types', () => {
    const result = validateQuizPayload(createCompositePayload())

    expect(result.isValid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('rejects nested composite child questions', () => {
    const result = validateQuizPayload(
      createCompositePayload({
        questions: [
          {
            id: 'comp_1',
            type: 'composite',
            prompt: 'nested',
            questions: [
              {
                id: 'nested_1',
                type: 'composite',
                prompt: 'nested child',
                questions: [],
              },
            ],
          },
        ],
      })
    )

    expect(result.isValid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('rejects reading children inside composite', () => {
    const result = validateQuizPayload(
      createCompositePayload({
        questions: [
          {
            id: 'comp_1',
            type: 'composite',
            prompt: 'invalid child',
            questions: [
              {
                id: 'reading_1',
                type: 'reading',
                prompt: 'Read and answer',
                passage: {
                  title: 'Passage',
                  content: 'Body',
                },
                questions: [
                  {
                    id: 'reading_1_q1',
                    type: 'single_choice',
                    prompt: 'Pick one',
                    options: ['A. One', 'B. Two'],
                    answer: { correct: 'A' },
                  },
                ],
              },
            ],
          },
        ],
      })
    )

    expect(result.isValid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('normalizes composite into a single top-level item with normalized children and canonical composite_context core fields', () => {
    const result = normalizeQuizPayload(createCompositePayload())

    expect(result.items).toHaveLength(1)
    expect(result.items[0].type).toBe('composite')
    expect(result.items[0].score).toBe(8)
    expect(result.items[0].questions).toHaveLength(2)
    expect(result.items[0].questions[0].type).toBe('single_choice')
    expect(result.items[0].questions[1].type).toBe('short_answer')
    expect(result.items[0].questions[0].composite_context).toMatchObject({
      composite_id: 'comp_1',
      composite_prompt: 'Read the following transaction schedule and answer the questions.',
      material_title: 'Transaction schedule',
      material: 'T1: read(A); T2: write(A);',
      material_format: 'sql',
      presentation: 'code',
      deliverable_type: 'transaction_analysis',
    })
  })

  it('normalizes composite score to the sum of child scores when the declared score is missing or inconsistent', () => {
    const missingScore = normalizeQuizPayload(createCompositePayload())
    const inconsistentScore = normalizeQuizPayload(
      createCompositePayload({
        questions: [
          {
            ...createCompositePayload().questions[0],
            score: 999,
          },
        ],
      })
    )

    expect(missingScore.items[0].score).toBe(8)
    expect(inconsistentScore.items[0].score).toBe(8)
  })

  it('aggregates composite objective and subjective scores correctly', () => {
    const result = normalizeQuizPayload(createCompositePayload())

    expect(getQuizScoreBreakdown(result.items)).toEqual({
      objectiveTotal: 2,
      subjectiveTotal: 6,
      paperTotal: 8,
    })
  })

  it('keeps compatibility with legacy items payloads', () => {
    const result = normalizeQuizPayload({
      title: 'Legacy quiz',
      items: [
        {
          id: 'legacy_1',
          question: 'Legacy question',
          options: ['A. One', 'B. Two'],
          correct_answer: 'B',
          rationale: 'Legacy rationale',
        },
      ],
    })

    expect(result.compatibility.sourceSchema).toBe('legacy_items')
    expect(result.items).toHaveLength(1)
    expect(result.items[0].type).toBe('single_choice')
  })

  it('keeps compatibility with non-composite questions payloads', () => {
    const result = normalizeQuizPayload({
      schema_version: '2026-04',
      title: 'Plain quiz',
      subject: 'data_structure',
      questions: [
        {
          id: 'q1',
          type: 'operation',
          prompt: '设计关系模式',
          deliverable_type: 'relation_schema',
          answer: {
            reference_answer: 'R(A, B, C)',
          },
        },
      ],
    })

    expect(result.items).toHaveLength(1)
    expect(result.items[0].type).toBe('operation')
    expect(result.items[0].deliverable_type).toBe('relation_schema')
  })
})
