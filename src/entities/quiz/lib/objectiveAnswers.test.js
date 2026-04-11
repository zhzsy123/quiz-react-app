import { describe, expect, it } from 'vitest'
import { evaluateFillBlankResponse, isObjectiveResponseCorrect } from './objectiveAnswers.js'
import { getObjectiveItemScore, getObjectiveWrongCount } from '../../../features/workspace/model/subjectWorkspaceObjective.js'

describe('objectiveAnswers fill blank evaluation', () => {
  it('treats regular fill_blank as unordered by default', () => {
    const item = {
      type: 'fill_blank',
      blanks: [
        { blank_id: 'b1', accepted_answers: ['有穷性'], score: 0.5 },
        { blank_id: 'b2', accepted_answers: ['确定性'], score: 0.5 },
        { blank_id: 'b3', accepted_answers: ['可行性'], score: 0.5 },
      ],
    }
    const response = {
      b1: '有穷性',
      b2: '可行性',
      b3: '确定性',
    }

    const evaluation = evaluateFillBlankResponse(item, response)

    expect(evaluation.orderSensitive).toBe(false)
    expect(evaluation.isCorrect).toBe(true)
    expect(evaluation.correctCount).toBe(3)
    expect(isObjectiveResponseCorrect(item, response)).toBe(true)
    expect(getObjectiveItemScore(item, response)).toBe(1.5)
    expect(getObjectiveWrongCount(item, response)).toBe(0)
  })

  it('keeps function_fill_blank order-sensitive', () => {
    const item = {
      type: 'function_fill_blank',
      blanks: [
        { blank_id: 'b1', accepted_answers: ['n'], score: 2 },
        { blank_id: 'b2', accepted_answers: ['i'], score: 2 },
      ],
    }
    const response = {
      b1: 'i',
      b2: 'n',
    }

    const evaluation = evaluateFillBlankResponse(item, response)

    expect(evaluation.orderSensitive).toBe(true)
    expect(evaluation.isCorrect).toBe(false)
    expect(isObjectiveResponseCorrect(item, response)).toBe(false)
    expect(getObjectiveItemScore(item, response)).toBe(0)
    expect(getObjectiveWrongCount(item, response)).toBe(2)
  })
})
