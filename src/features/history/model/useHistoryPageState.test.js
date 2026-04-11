import { describe, expect, it } from 'vitest'
import { buildAnswerRows, getAttemptScoreSummary } from './useHistoryPageState'

describe('useHistoryPageState helpers', () => {
  it('includes persisted subjective AI review details in answer rows', () => {
    const attempt = {
      objectiveScore: 6,
      objectiveTotal: 10,
      subjectivePendingTotal: 15,
      paperTotal: 25,
      answersSnapshot: {
        essay_1: {
          text: '这是我的作文答案。',
        },
      },
      itemsSnapshot: [
        {
          id: 'essay_1',
          type: 'essay',
          prompt: '写一篇作文。',
          score: 15,
          answer: {
            type: 'subjective',
            reference_answer: '参考范文',
          },
        },
      ],
      aiReview: {
        status: 'completed',
        totalSubjectiveScore: 12,
        questionReviews: {
          essay_1: {
            score: 12,
            maxScore: 15,
            feedback: '立意明确，但语言还可以更精炼。',
            strengths: ['结构完整'],
            weaknesses: ['句式单一'],
            suggestions: ['增加过渡句'],
          },
        },
      },
    }

    const [row] = buildAnswerRows(attempt)

    expect(row).toEqual(
      expect.objectContaining({
        type: 'subjective',
        userText: '这是我的作文答案。',
        referenceText: '参考范文',
        reviewStatus: 'completed',
        reviewScore: 12,
        reviewMaxScore: 15,
        reviewFeedback: '立意明确，但语言还可以更精炼。',
        reviewStrengths: ['结构完整'],
        reviewWeaknesses: ['句式单一'],
        reviewSuggestions: ['增加过渡句'],
      })
    )

    expect(getAttemptScoreSummary(attempt)).toEqual(
      expect.objectContaining({
        objectiveScore: 6,
        objectiveTotal: 10,
        subjectiveScore: 12,
        subjectivePendingTotal: 15,
        totalScore: 18,
        totalMax: 25,
      })
    )
  })
})
