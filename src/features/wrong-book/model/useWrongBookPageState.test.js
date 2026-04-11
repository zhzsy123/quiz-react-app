import { describe, expect, it } from 'vitest'
import {
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
      subject: '',
      paper_title: '旧试卷',
      questionPrompt: '旧题干',
      options: null,
      tags: null,
    })

    expect(result.questionKey).toBe('q1')
    expect(result.prompt).toBe('旧题干')
    expect(result.paperTitle).toBe('旧试卷')
    expect(result.subject).toBe('english')
    expect(result.options).toEqual([])
    expect(result.tags).toEqual([])
  })
})
