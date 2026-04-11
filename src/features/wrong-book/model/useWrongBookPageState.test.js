import { describe, expect, it } from 'vitest'
import {
  formatWrongBookDisplayValue,
  inferWrongItemType,
  isRenderableWrongBookEntry,
  sanitizeWrongBookEntry,
} from './useWrongBookPageState'

describe('useWrongBookPageState helpers', () => {
  it('filters malformed wrongbook rows before rendering', () => {
    expect(isRenderableWrongBookEntry(null)).toBe(false)
    expect(isRenderableWrongBookEntry('broken')).toBe(false)
    expect(isRenderableWrongBookEntry({})).toBe(false)
    expect(isRenderableWrongBookEntry({ prompt: '题目' })).toBe(true)
    expect(isRenderableWrongBookEntry({ questionId: 'q1' })).toBe(true)
  })

  it('sanitizes incomplete wrongbook rows into safe display data', () => {
    const result = sanitizeWrongBookEntry({
      questionId: 'q1',
      subject: { legacy: true },
      paper_title: '旧试卷',
      questionPrompt: '旧题干',
      options: null,
      tags: null,
      rationale: { text: '对象解析' },
      correctAnswerLabel: { label: 'A. 正确答案' },
      correctAnswer: { label: 'B. 正确答案' },
      wrong_times: '3',
    })

    expect(result.questionKey).toBe('q1')
    expect(result.prompt).toBe('旧题干')
    expect(result.paperTitle).toBe('旧试卷')
    expect(result.subject).toBe('english')
    expect(result.options).toEqual([])
    expect(result.tags).toEqual([])
    expect(result.rationale).toBe('对象解析')
    expect(result.correctAnswerLabel).toBe('A. 正确答案')
    expect(result.correctAnswer).toEqual({ label: 'B. 正确答案' })
    expect(result.wrongTimes).toBe(3)
  })

  it('formats object-like display values into safe strings', () => {
    expect(formatWrongBookDisplayValue({ text: '解析文本' }, '')).toBe('解析文本')
    expect(formatWrongBookDisplayValue(['A', 'B'], '')).toBe('A / B')
    expect(formatWrongBookDisplayValue({ nested: true }, '')).toBe('{"nested":true}')
  })

  it('tolerates null items when inferring wrongbook item types', () => {
    expect(inferWrongItemType(null)).toBe('single_choice')
    expect(inferWrongItemType(undefined)).toBe('single_choice')
  })
})
