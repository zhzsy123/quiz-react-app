import { describe, expect, it } from 'vitest'
import {
  buildCompositeAnswerSnapshotMap,
  buildQuestionKey,
  decorateCompositeItems,
  normalizeWrongbookEntry,
} from './compositePersistence'

function createCompositeItem() {
  return {
    id: 'comp_1',
    type: 'composite',
    prompt: 'Read the transaction schedule and answer the questions.',
    material_title: 'Transaction Schedule',
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
        options: [
          { key: 'A', text: 'Yes' },
          { key: 'B', text: 'No' },
        ],
        answer: {
          type: 'objective',
          correct: 'A',
        },
      },
      {
        id: 'q2',
        type: 'short_answer',
        prompt: 'Explain why.',
        answer: {
          type: 'subjective',
          reference_answer: 'Analyze the precedence graph.',
        },
      },
    ],
  }
}

describe('compositePersistence helpers', () => {
  it('decorates composite child snapshots with canonical questionKey and composite_context', () => {
    const [item] = decorateCompositeItems([createCompositeItem()])

    expect(item.questions[0].questionKey).toBe('comp_1:q1')
    expect(item.questions[1].questionKey).toBe('comp_1:q2')
    expect(item.questions[0].composite_context).toEqual({
      composite_id: 'comp_1',
      composite_prompt: 'Read the transaction schedule and answer the questions.',
      material_title: 'Transaction Schedule',
      material: 'T1: read(A); T2: write(A);',
      material_format: 'sql',
      presentation: 'code',
      deliverable_type: 'transaction_analysis',
      tags: ['transaction', 'concurrency'],
      assets: [{ type: 'text', value: 'schedule' }],
    })
  })

  it('builds canonical composite answer snapshots from answers[compositeId][subQuestionId]', () => {
    const [item] = decorateCompositeItems([createCompositeItem()])
    const answerMap = buildCompositeAnswerSnapshotMap(
      [item],
      {
        comp_1: {
          q1: 'A',
          q2: { text: 'Because the graph has no cycle.' },
        },
      }
    )

    expect(answerMap['comp_1:q1']).toBe('A')
    expect(answerMap['comp_1:q2']).toEqual({ text: 'Because the graph has no cycle.' })
  })

  it('normalizes wrongbook entries using canonical composite_context and inferred child questionKey', () => {
    const normalized = normalizeWrongbookEntry({
      subject: 'database',
      questionId: 'comp_1',
      subQuestionId: 'q1',
      prompt: 'Is the schedule conflict-serializable?',
      composite_context: {
        composite_id: 'comp_1',
        composite_prompt: 'Read the transaction schedule and answer the questions.',
        material_title: 'Transaction Schedule',
        material: 'T1: read(A); T2: write(A);',
        material_format: 'sql',
        presentation: 'code',
        deliverable_type: 'transaction_analysis',
        tags: ['transaction', 'concurrency'],
        assets: [{ type: 'text', value: 'schedule' }],
      },
    })

    expect(normalized.questionKey).toBe('comp_1:q1')
    expect(normalized.composite_context).toEqual({
      composite_id: 'comp_1',
      composite_prompt: 'Read the transaction schedule and answer the questions.',
      material_title: 'Transaction Schedule',
      material: 'T1: read(A); T2: write(A);',
      material_format: 'sql',
      presentation: 'code',
      deliverable_type: 'transaction_analysis',
      tags: ['transaction', 'concurrency'],
      assets: [{ type: 'text', value: 'schedule' }],
    })
  })

  it('keeps the legacy question key path for non-composite questions', () => {
    expect(buildQuestionKey({ id: 'plain_q1' })).toBe('plain_q1')
    expect(
      normalizeWrongbookEntry({
        questionId: 'plain_q1',
        prompt: 'Legacy question',
      }).questionKey
    ).toBe('plain_q1')
  })
})
