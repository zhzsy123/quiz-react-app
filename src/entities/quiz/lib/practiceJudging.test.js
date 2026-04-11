import { describe, expect, it } from 'vitest'
import {
  MANUAL_JUDGE_CORRECT,
  MANUAL_JUDGE_WRONG,
  getManualJudgeKey,
  resolvePracticeJudge,
} from './practiceJudging.js'

describe('practiceJudging', () => {
  it('allows manual override for top-level objective items', () => {
    const item = {
      id: 'q1',
      type: 'single_choice',
      score: 5,
      answer: {
        type: 'objective',
        correct: 'A',
      },
    }

    const systemJudge = resolvePracticeJudge({
      manualJudgeMap: {},
      item,
      response: 'B',
    })

    expect(systemJudge.isWrong).toBe(true)
    expect(systemJudge.overridden).toBe(false)

    const overriddenJudge = resolvePracticeJudge({
      manualJudgeMap: {
        [getManualJudgeKey(item)]: MANUAL_JUDGE_CORRECT,
      },
      item,
      response: 'B',
    })

    expect(overriddenJudge.isCorrect).toBe(true)
    expect(overriddenJudge.overridden).toBe(true)
  })

  it('allows manual override for reading subquestions', () => {
    const item = {
      id: 'reading_1',
      type: 'reading',
      questions: [
        {
          id: 'A-1',
          type: 'single_choice',
          score: 2,
          answer: {
            type: 'objective',
            correct: 'B',
          },
        },
      ],
    }
    const subQuestion = item.questions[0]

    const judgement = resolvePracticeJudge({
      manualJudgeMap: {
        [getManualJudgeKey(item, subQuestion)]: MANUAL_JUDGE_WRONG,
      },
      item,
      response: 'B',
      subQuestion,
    })

    expect(judgement.isWrong).toBe(true)
    expect(judgement.systemVerdict).toBe(MANUAL_JUDGE_CORRECT)
    expect(judgement.manualVerdict).toBe(MANUAL_JUDGE_WRONG)
  })
})
