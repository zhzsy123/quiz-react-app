import { beforeEach, describe, expect, it, vi } from 'vitest'

const { requestAiJsonMock } = vi.hoisted(() => ({
  requestAiJsonMock: vi.fn(),
}))

vi.mock('../../../shared/api/aiGateway.js', () => ({
  requestAiJson: requestAiJsonMock,
}))

import { buildDraftPaper, startQuestionGeneration } from './questionGenerationService.js'

describe('questionGenerationService', () => {
  beforeEach(() => {
    requestAiJsonMock.mockReset()
  })

  it('builds a draft paper from generated questions', () => {
    const draftPaper = buildDraftPaper({
      config: {
        subject: 'data_structure',
        mode: 'practice',
        difficulty: 'medium',
        count: 2,
        extraPrompt: 'focus on heap sort',
        durationMinutes: 90,
      },
      requestId: 'gen_001',
      meta: {
        paperTitle: 'Heap sort draft',
      },
      draftQuestions: [
        {
          status: 'valid',
          rawQuestion: {
            id: 'q1',
            type: 'single_choice',
            prompt: 'Q1',
            score: 2,
            answer: { type: 'objective', correct: 'B' },
          },
          normalizedQuestion: {
            id: 'q1',
            type: 'single_choice',
            prompt: 'Q1',
            score: 2,
            answer: { type: 'objective', correct: 'B' },
          },
        },
        {
          status: 'warning',
          rawQuestion: {
            id: 'q2',
            type: 'programming',
            prompt: 'Q2',
            score: 20,
            answer: { type: 'subjective', reference_answer: 'sample' },
          },
          normalizedQuestion: {
            id: 'q2',
            type: 'programming',
            prompt: 'Q2',
            score: 20,
            answer: { type: 'subjective', reference_answer: 'sample' },
          },
        },
      ],
    })

    expect(draftPaper.paper_id).toBe('gen_001')
    expect(draftPaper.questions).toHaveLength(2)
    expect(draftPaper.scoreBreakdown.totalScore).toBe(22)
    expect(draftPaper.scoreBreakdown.objectiveScore).toBe(2)
    expect(draftPaper.scoreBreakdown.subjectiveScore).toBe(20)
  })

  it('filters invalid draft entries when composing the generated draft paper payload', () => {
    const draftPaper = buildDraftPaper({
      config: {
        subject: 'english',
        mode: 'practice',
        difficulty: 'medium',
      },
      requestId: 'gen_filter_001',
      draftQuestions: [
        {
          status: 'valid',
          normalizedQuestion: {
            id: 'q1',
            type: 'single_choice',
            prompt: 'Valid question',
            score: 2,
            options: [
              { key: 'A', text: 'One' },
              { key: 'B', text: 'Two' },
            ],
            answer: { type: 'objective', correct: 'A' },
          },
        },
        {
          status: 'invalid',
          rawQuestion: {
            id: 'q2',
            type: 'reading',
            prompt: 'Broken reading',
          },
        },
      ],
    })

    expect(draftPaper.questions).toHaveLength(1)
    expect(draftPaper.questions[0].id).toBe('q1')
  })

  it('generates practice questions with per-question json calls and normalizes english single choice', async () => {
    requestAiJsonMock
      .mockResolvedValueOnce({
        content: {
          id: 'q1',
          type: 'single_choice',
          prompt: 'Which conjunction is correct?',
          score: 2,
          options: {
            C: 'for',
            A: { text: 'because' },
            D: 'that',
            B: 'as',
          },
          answer: 'D',
        },
      })
      .mockResolvedValueOnce({
        content: {
          id: 'q2',
          type: 'single_choice',
          prompt: 'Choose the right sentence.',
          score: 2,
          options: ['A. One', 'B. Two', 'C. Three', 'D. Four'],
          correct_answer: 'B',
          rationale: '因为 B 的语法正确。',
        },
      })

    const result = await startQuestionGeneration({
      config: {
        subject: 'english',
        mode: 'practice',
        difficulty: 'medium',
        count: 2,
        questionTypes: ['single_choice'],
        paperTitle: 'English draft',
      },
      meta: {
        requestId: 'gen_002',
      },
    })

    expect(requestAiJsonMock).toHaveBeenCalledTimes(2)
    expect(requestAiJsonMock.mock.calls[0][0].systemPrompt).toContain('generate exactly one quiz question JSON object')
    expect(requestAiJsonMock.mock.calls[0][0].userPrompt).toContain('"target_question_type":"single_choice"')

    expect(result.status).toBe('completed')
    expect(result.draftQuestions).toHaveLength(2)
    expect(result.draftQuestions[0].status).toBe('valid')
    expect(result.draftQuestions[0].normalizedQuestion.options).toEqual([
      { key: 'A', text: 'because' },
      { key: 'B', text: 'as' },
      { key: 'C', text: 'for' },
      { key: 'D', text: 'that' },
    ])
    expect(result.draftQuestions[0].normalizedQuestion.answer.correct).toBe('D')
    expect(result.draftQuestions[1].normalizedQuestion.answer.correct).toBe('B')
  })

  it('normalizes reading children and object-style answers', async () => {
    requestAiJsonMock.mockResolvedValueOnce({
      content: {
        id: 'rq1',
        type: 'reading',
        prompt: 'Read the passage and answer the questions.',
        score: 10,
        passage: {
          title: 'Passage A',
          body: 'Tom likes reading books after school.',
        },
        sub_questions: [
          {
            id: 'rq1_1',
            prompt: 'What does Tom like to do?',
            options: {
              A: 'Play football',
              B: 'Read books',
              C: 'Watch TV',
              D: 'Go shopping',
            },
            answer: 'B',
          },
        ],
      },
    })

    const result = await startQuestionGeneration({
      config: {
        subject: 'english',
        mode: 'practice',
        difficulty: 'medium',
        count: 1,
        questionTypes: ['reading'],
      },
      meta: {
        requestId: 'gen_003',
      },
    })

    expect(result.draftQuestions).toHaveLength(1)
    expect(result.draftQuestions[0].status).toBe('valid')
    expect(result.draftQuestions[0].normalizedQuestion.passage.content).toBe('Tom likes reading books after school.')
    expect(result.draftQuestions[0].normalizedQuestion.questions[0].options).toEqual([
      { key: 'A', text: 'Play football' },
      { key: 'B', text: 'Read books' },
      { key: 'C', text: 'Watch TV' },
      { key: 'D', text: 'Go shopping' },
    ])
    expect(result.draftQuestions[0].normalizedQuestion.questions[0].answer.correct).toBe('B')
  })

  it('preserves cloze questions as a single normalized draft item for english generation', async () => {
    requestAiJsonMock.mockResolvedValueOnce({
      content: {
        id: 'cq1',
        type: 'cloze',
        prompt: 'Complete the passage with the best choices.',
        score: 20,
        article: 'He [[1]] to school every day and [[2]] hard.',
        blanks: [
          {
            blank_id: 1,
            score: 2,
            options: [
              { key: 'A', text: 'go' },
              { key: 'B', text: 'goes' },
              { key: 'C', text: 'went' },
              { key: 'D', text: 'gone' },
            ],
            correct: 'B',
            rationale: 'Third-person singular.',
          },
          {
            blank_id: 2,
            score: 2,
            options: [
              { key: 'A', text: 'studies' },
              { key: 'B', text: 'study' },
              { key: 'C', text: 'studied' },
              { key: 'D', text: 'studying' },
            ],
            correct: 'A',
            rationale: 'Subject matches third-person singular.',
          },
        ],
      },
    })

    const result = await startQuestionGeneration({
      config: {
        subject: 'english',
        mode: 'practice',
        difficulty: 'medium',
        count: 1,
        questionTypes: ['cloze'],
      },
      meta: {
        requestId: 'gen_cloze_001',
      },
    })

    expect(result.draftQuestions).toHaveLength(1)
    expect(result.draftQuestions[0].status).toBe('valid')
    expect(result.draftQuestions[0].normalizedItems).toHaveLength(1)
    expect(result.draftQuestions[0].normalizedQuestion.type).toBe('cloze')
    expect(result.draftQuestions[0].normalizedQuestion.blanks).toHaveLength(2)
    expect(result.draftPaper.questions).toHaveLength(1)
    expect(result.draftPaper.questions[0].type).toBe('cloze')
    expect(result.draftPaper.scoreBreakdown.totalScore).toBe(4)
  })

  it('accepts localized cloze type labels from AI and normalizes them to cloze', async () => {
    requestAiJsonMock.mockResolvedValueOnce({
      content: {
        id: 'cq_localized',
        type: '\u5b8c\u5f62\u586b\u7a7a',
        prompt: 'Read the short passage and complete the blanks.',
        score: 20,
        article: 'The sun [[1]] in the east and birds [[2]] in the morning.',
        blanks: [
          {
            blank_id: 1,
            options: [
              { key: 'A', text: 'rise' },
              { key: 'B', text: 'rises' },
              { key: 'C', text: 'rose' },
              { key: 'D', text: 'rising' },
            ],
            correct: 'B',
            rationale: 'Subject is singular.',
          },
          {
            blank_id: 2,
            options: [
              { key: 'A', text: 'sing' },
              { key: 'B', text: 'sings' },
              { key: 'C', text: 'sang' },
              { key: 'D', text: 'sung' },
            ],
            correct: 'A',
            rationale: 'Plural subject takes base form.',
          },
        ],
      },
    })

    const result = await startQuestionGeneration({
      config: {
        subject: 'english',
        mode: 'practice',
        difficulty: 'medium',
        count: 1,
        questionTypes: ['cloze'],
      },
      meta: {
        requestId: 'gen_cloze_localized_001',
      },
    })

    expect(result.status).toBe('completed')
    expect(result.draftQuestions).toHaveLength(1)
    expect(result.draftQuestions[0].status).toBe('valid')
    expect(result.draftQuestions[0].normalizedQuestion.type).toBe('cloze')
    expect(result.draftQuestions[0].normalizedQuestion.blanks).toHaveLength(2)
  })

  it('falls back to the planned cloze type when AI returns an unknown type label', async () => {
    requestAiJsonMock.mockResolvedValueOnce({
      content: {
        id: 'cq_unknown',
        type: 'cloze_case',
        prompt: 'Choose the best words to complete the passage.',
        score: 20,
        article: 'Students [[1]] English every day and [[2]] progress quickly.',
        blanks: [
          {
            blank_id: 1,
            options: [
              { key: 'A', text: 'study' },
              { key: 'B', text: 'studies' },
              { key: 'C', text: 'studied' },
              { key: 'D', text: 'studying' },
            ],
            correct: 'A',
            rationale: 'Plural subject uses the base verb.',
          },
          {
            blank_id: 2,
            options: [
              { key: 'A', text: 'make' },
              { key: 'B', text: 'makes' },
              { key: 'C', text: 'made' },
              { key: 'D', text: 'making' },
            ],
            correct: 'A',
            rationale: 'Plural subject uses the base verb.',
          },
        ],
      },
    })

    const result = await startQuestionGeneration({
      config: {
        subject: 'english',
        mode: 'practice',
        difficulty: 'medium',
        count: 1,
        questionTypes: ['cloze'],
      },
      meta: {
        requestId: 'gen_cloze_unknown_001',
      },
    })

    expect(result.status).toBe('completed')
    expect(result.draftQuestions).toHaveLength(1)
    expect(result.draftQuestions[0].status).toBe('valid')
    expect(result.draftQuestions[0].rawQuestion.type).toBe('cloze')
    expect(result.draftQuestions[0].normalizedQuestion.type).toBe('cloze')
    expect(result.draftPaper.questions).toHaveLength(1)
    expect(result.draftPaper.questions[0].type).toBe('cloze')
  })

  it('normalizes cloze questions when AI returns passage text and sub questions instead of article + blanks', async () => {
    requestAiJsonMock.mockResolvedValueOnce({
      content: {
        id: 'cq_variant',
        type: '完型填空',
        prompt: 'Read the passage and choose the best answers.',
        score: 20,
        passage: 'Alice [[1]] to school early and [[2]] her homework on time.',
        questions: [
          {
            id: 'cq_variant_1',
            options: {
              A: 'go',
              B: 'goes',
              C: 'went',
              D: 'going',
            },
            answer: { correct: 'B', rationale: 'Third-person singular.' },
          },
          {
            id: 'cq_variant_2',
            options: {
              A: 'finish',
              B: 'finishes',
              C: 'finished',
              D: 'finishing',
            },
            answer: { correct: 'B', rationale: 'Third-person singular.' },
          },
        ],
      },
    })

    const result = await startQuestionGeneration({
      config: {
        subject: 'english',
        mode: 'practice',
        difficulty: 'medium',
        count: 1,
        questionTypes: ['cloze'],
      },
      meta: {
        requestId: 'gen_cloze_variant_001',
      },
    })

    expect(result.status).toBe('completed')
    expect(result.draftQuestions).toHaveLength(1)
    expect(result.draftQuestions[0].status).toBe('valid')
    expect(result.draftQuestions[0].normalizedQuestion.type).toBe('cloze')
    expect(result.draftQuestions[0].normalizedQuestion.article).toContain('Alice')
    expect(result.draftQuestions[0].normalizedQuestion.blanks).toHaveLength(2)
  })

  it('retries cloze generation when the first response has an incomplete structure', async () => {
    requestAiJsonMock
      .mockResolvedValueOnce({
        content: {
          id: 'cq_retry_bad',
          type: 'cloze',
          prompt: 'Complete the passage.',
          score: 20,
          article: '',
          blanks: [],
        },
      })
      .mockResolvedValueOnce({
        content: {
          id: 'cq_retry_good',
          type: 'cloze',
          prompt: 'Complete the passage.',
          score: 20,
          article: 'Mike [[1]] breakfast and [[2]] to school.',
          blanks: [
            {
              blank_id: 1,
              options: [
                { key: 'A', text: 'eat' },
                { key: 'B', text: 'eats' },
                { key: 'C', text: 'ate' },
                { key: 'D', text: 'eating' },
              ],
              correct: 'B',
              rationale: 'Third-person singular.',
            },
            {
              blank_id: 2,
              options: [
                { key: 'A', text: 'go' },
                { key: 'B', text: 'goes' },
                { key: 'C', text: 'went' },
                { key: 'D', text: 'going' },
              ],
              correct: 'B',
              rationale: 'Third-person singular.',
            },
          ],
        },
      })

    const result = await startQuestionGeneration({
      config: {
        subject: 'english',
        mode: 'practice',
        difficulty: 'medium',
        count: 1,
        questionTypes: ['cloze'],
      },
      meta: {
        requestId: 'gen_cloze_retry_001',
      },
    })

    expect(requestAiJsonMock).toHaveBeenCalledTimes(2)
    expect(requestAiJsonMock.mock.calls[0][0].userPrompt).toContain('allowed_question_types')
    expect(requestAiJsonMock.mock.calls[1][0].userPrompt).toContain('previous_generation_error')
    expect(requestAiJsonMock.mock.calls[1][0].userPrompt).not.toContain('allowed_question_types')
    expect(requestAiJsonMock.mock.calls[1][0].userPrompt).not.toContain('"example"')
    expect(requestAiJsonMock.mock.calls[1][0].systemPrompt).toContain('repair exactly one malformed quiz question JSON object')
    expect(result.status).toBe('completed')
    expect(result.draftQuestions).toHaveLength(1)
    expect(result.draftQuestions[0].status).toBe('valid')
    expect(result.draftQuestions[0].normalizedQuestion.type).toBe('cloze')
    expect(result.draftQuestions[0].normalizedQuestion.blanks).toHaveLength(2)
  })

  it('retries duplicate generated questions within the same batch', async () => {
    requestAiJsonMock
      .mockResolvedValueOnce({
        content: {
          id: 'q1',
          type: 'case_analysis',
          prompt: '根据案例判断卖方是否违约。',
          context: '某出口合同约定装运期为 6 月 30 日。',
          score: 10,
          answer: {
            type: 'subjective',
            reference_answer: '应先判断迟延装运是否构成违约。',
            scoring_points: ['识别争议点', '判断是否违约'],
          },
        },
      })
      .mockResolvedValueOnce({
        content: {
          id: 'q2',
          type: 'case_analysis',
          prompt: '根据案例判断卖方是否违约。',
          context: '某出口合同约定装运期为 6 月 30 日。',
          score: 10,
          answer: {
            type: 'subjective',
            reference_answer: '应先判断迟延装运是否构成违约。',
            scoring_points: ['识别争议点', '判断是否违约'],
          },
        },
      })
      .mockResolvedValueOnce({
        content: {
          id: 'q3',
          type: 'case_analysis',
          prompt: '分析买方拒收货物是否成立。',
          context: '某合同约定以信用证支付，卖方迟延提交单据。',
          score: 10,
          answer: {
            type: 'subjective',
            reference_answer: '应结合单据迟延与拒收依据综合判断。',
            scoring_points: ['识别拒收依据', '判断是否有权拒收'],
          },
        },
      })

    const result = await startQuestionGeneration({
      config: {
        subject: 'international_trade',
        mode: 'practice',
        difficulty: 'medium',
        count: 2,
        questionTypes: ['case_analysis'],
      },
      meta: {
        requestId: 'gen_005',
      },
    })

    expect(requestAiJsonMock.mock.calls.length).toBeGreaterThanOrEqual(3)
    expect(result.status).toBe('completed')
    expect(result.draftQuestions).toHaveLength(2)
    expect(result.draftQuestions[0].normalizedQuestion.prompt).toBe('根据案例判断卖方是否违约。')
    expect(result.draftQuestions[1].normalizedQuestion.prompt).toBe('分析买方拒收货物是否成立。')
    expect(requestAiJsonMock.mock.calls[2][0].userPrompt).toContain('"avoid_question_signatures"')
  })

  it('returns diagnostic invalid entries when generation fails', async () => {
    requestAiJsonMock.mockRejectedValueOnce(new Error('network error'))

    const result = await startQuestionGeneration({
      config: {
        subject: 'english',
        mode: 'practice',
        difficulty: 'medium',
        count: 1,
        questionTypes: ['single_choice'],
        paperTitle: 'Broken paper',
      },
      meta: {
        requestId: 'gen_004',
      },
    })

    expect(result.status).toBe('completed')
    expect(result.draftQuestions).toHaveLength(1)
    expect(result.draftQuestions[0].status).toBe('invalid')
    expect(result.draftQuestions[0].errors[0]).toContain('network error')
  })
})
