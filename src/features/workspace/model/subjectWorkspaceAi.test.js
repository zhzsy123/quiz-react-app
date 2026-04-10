import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  gradeSubjectiveAttemptMock,
  gradeRelationalAlgebraAttemptMock,
  gradeRelationalAlgebraSubquestionAttemptMock,
  explainQuizQuestionWithModeMock,
  auditQuizQuestionComplianceMock,
  generateSimilarQuestionsMock,
} = vi.hoisted(() => ({
  gradeSubjectiveAttemptMock: vi.fn(),
  gradeRelationalAlgebraAttemptMock: vi.fn(),
  gradeRelationalAlgebraSubquestionAttemptMock: vi.fn(),
  explainQuizQuestionWithModeMock: vi.fn(),
  auditQuizQuestionComplianceMock: vi.fn(),
  generateSimilarQuestionsMock: vi.fn(),
}))

vi.mock('../../ai/reviewService', () => ({
  gradeSubjectiveAttempt: gradeSubjectiveAttemptMock,
  gradeRelationalAlgebraAttempt: gradeRelationalAlgebraAttemptMock,
  gradeRelationalAlgebraSubquestionAttempt: gradeRelationalAlgebraSubquestionAttemptMock,
  explainQuizQuestionWithMode: explainQuizQuestionWithModeMock,
  auditQuizQuestionCompliance: auditQuizQuestionComplianceMock,
  generateSimilarQuestions: generateSimilarQuestionsMock,
}))

import { runSubjectiveAiReview } from './subjectWorkspaceAi.js'

describe('subjectWorkspaceAi', () => {
  beforeEach(() => {
    gradeSubjectiveAttemptMock.mockReset()
    gradeRelationalAlgebraAttemptMock.mockReset()
    gradeRelationalAlgebraSubquestionAttemptMock.mockReset()
  })

  it('accepts subjectivePendingTotal and uses built-in pending review creator', async () => {
    gradeSubjectiveAttemptMock.mockResolvedValue({
      status: 'completed',
      provider: 'deepseek',
      questionReviews: {
        essay_1: {
          questionId: 'essay_1',
          score: 12,
          maxScore: 15,
          feedback: 'Well structured.',
        },
      },
      totalSubjectiveScore: 12,
      totalScore: 17,
      overallComment: 'Strong essay.',
      weaknessSummary: ['Need more examples'],
    })
    gradeRelationalAlgebraAttemptMock.mockResolvedValue({
      status: 'completed',
      provider: 'deepseek',
      questionReviews: {},
      totalRelationalAlgebraScore: 0,
      totalScore: 5,
      overallComment: '',
      weaknessSummary: [],
      relationalAlgebraReviews: [],
      totalMaxScore: 0,
    })

    const result = await runSubjectiveAiReview({
      quiz: {
        title: 'English paper',
        items: [{ id: 'essay_1', type: 'essay', answer: { type: 'subjective' } }],
      },
      answers: {
        essay_1: { text: 'My answer' },
      },
      objectiveScore: 5,
      objectiveTotal: 20,
      paperTotal: 35,
      subjectivePendingTotal: 15,
    })

    expect(gradeSubjectiveAttemptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        subjectivePendingTotal: 15,
      })
    )
    expect(result).toEqual(
      expect.objectContaining({
        status: 'completed',
        totalSubjectiveScore: 12,
        totalScore: 17,
        overallComment: 'Strong essay.',
      })
    )
  })

  it('returns null when no subjective score is pending', async () => {
    const result = await runSubjectiveAiReview({
      quiz: { title: 'English paper', items: [] },
      answers: {},
      objectiveScore: 5,
      objectiveTotal: 20,
      paperTotal: 20,
      subjectiveTotal: 0,
    })

    expect(result).toBeNull()
    expect(gradeSubjectiveAttemptMock).not.toHaveBeenCalled()
    expect(gradeRelationalAlgebraAttemptMock).not.toHaveBeenCalled()
  })
})
