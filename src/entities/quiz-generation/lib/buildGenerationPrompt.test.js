import { describe, expect, it } from 'vitest'
import { buildGenerationPrompt, normalizeGenerationParams } from './buildGenerationPrompt.js'

describe('buildGenerationPrompt', () => {
  it('normalizes practice generation params by subject subset', () => {
    const result = normalizeGenerationParams('english', {
      mode: 'practice',
      count: 6,
      questionTypes: ['single_choice', 'translation', 'sql'],
    })

    expect(result.subjectMeta.key).toBe('english')
    expect(result.normalized.mode).toBe('practice')
    expect(result.normalized.questionTypes).toEqual(['single_choice', 'translation'])
    expect(result.generationPlan).toHaveLength(6)
    expect(result.generationPlan[0].typeKey).toBe('single_choice')
    expect(result.generationPlan[1].typeKey).toBe('translation')
  })

  it('normalizes mock exam question plan with per-type count and score', () => {
    const result = normalizeGenerationParams('data_structure', {
      mode: 'mock_exam',
      questionTypes: ['single_choice', 'programming'],
      questionPlan: {
        single_choice: { count: 8, score: 2 },
        programming: { count: 1, score: 20 },
      },
      targetPaperTotal: 36,
    })

    expect(result.normalized.mode).toBe('mock_exam')
    expect(result.normalized.questionPlan).toEqual({
      single_choice: { count: 8, score: 2 },
      programming: { count: 1, score: 20 },
    })
    expect(result.generationPlan).toHaveLength(9)
    expect(result.generationPlan.at(-1)).toMatchObject({
      typeKey: 'programming',
      score: 20,
    })
  })

  it('builds a compact single-question prompt with duplicate-avoidance hints', () => {
    const result = buildGenerationPrompt({
      subjectKey: 'english',
      requestId: 'req_001',
      params: {
        mode: 'practice',
        count: 5,
        questionTypes: ['single_choice'],
        extraPrompt: '偏重语法和连词辨析',
      },
      planItem: {
        typeKey: 'single_choice',
        score: 2,
        label: '单项选择题',
      },
      questionIndex: 1,
      totalQuestions: 5,
      avoidQuestionSignatures: ['grammar question about conjunctions'],
    })

    expect(result.systemPrompt).toContain('generate exactly one quiz question JSON object')
    expect(result.userPrompt).toContain('"target_question_type":"single_choice"')
    expect(result.userPrompt).toContain('"target_score":2')
    expect(result.userPrompt).toContain('偏重语法和连词辨析')
    expect(result.userPrompt).toContain('"avoid_question_signatures":["grammar question about conjunctions"]')
    expect(result.userPrompt).toContain('"allowed_question_types"')
  })

  it('locks cloze generation to the cloze contract instead of plain single choice', () => {
    const result = buildGenerationPrompt({
      subjectKey: 'english',
      requestId: 'req_cloze_001',
      params: {
        mode: 'practice',
        count: 1,
        questionTypes: ['cloze'],
      },
      planItem: {
        typeKey: 'cloze',
        score: 20,
        label: '完形填空',
      },
      questionIndex: 1,
      totalQuestions: 1,
    })

    expect(result.userPrompt).toContain('"target_question_type":"cloze"')
    expect(result.userPrompt).toContain('Use article plus blanks structure.')
    expect(result.userPrompt).toContain('"requiredFields":["id","type","prompt","article","blanks[]"]')
    expect(result.userPrompt).toContain('target_question_type')
  })

  it('adds database relational algebra contract rules to the generation prompt', () => {
    const result = buildGenerationPrompt({
      subjectKey: 'database_principles',
      requestId: 'req_ra_001',
      params: {
        mode: 'practice',
        count: 1,
        questionTypes: ['relational_algebra'],
      },
      planItem: {
        typeKey: 'relational_algebra',
        score: 20,
        label: '关系代数题',
      },
      questionIndex: 1,
      totalQuestions: 1,
    })

    expect(result.userPrompt).toContain('"target_question_type":"relational_algebra"')
    expect(result.userPrompt).toContain('"requiredFields":["id","type","prompt","score","schemas[]","subquestions[]","subquestions[].reference_answer"]')
    expect(result.userPrompt).toContain('Use schemas plus subquestions structure.')
    expect(result.userPrompt).toContain('reference_answer must be a relational algebra expression')
  })
})
