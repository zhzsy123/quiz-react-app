import { describe, expect, it } from 'vitest'
import {
  buildRelationalAlgebraInsertion,
  normalizeRelationalAlgebraResponse,
  serializeRelationalAlgebraResponse,
} from './relationalAlgebraEditorUtils.js'

describe('relationalAlgebraEditorUtils', () => {
  it('normalizes and serializes subquestion responses', () => {
    const subquestions = [{ id: '1' }, { id: '2' }]
    const normalized = normalizeRelationalAlgebraResponse(
      JSON.stringify({
        type: 'relational_algebra',
        question_id: 'ra_1',
        responses: {
          1: 'π[学号](学生)',
          2: 'σ[专业="英语"](学生)',
        },
      }),
      subquestions
    )

    expect(normalized).toEqual({
      1: 'π[学号](学生)',
      2: 'σ[专业="英语"](学生)',
    })

    expect(serializeRelationalAlgebraResponse('ra_1', subquestions, normalized)).toContain('"question_id": "ra_1"')
  })

  it('wraps algebra operators with parentheses', () => {
    expect(buildRelationalAlgebraInsertion('π', { wrap: true, wrapStyle: 'brackets' })).toBe('π[]')
    expect(buildRelationalAlgebraInsertion('PI', { wrap: true, wrapStyle: 'brackets' })).toBe('π[]')
    expect(buildRelationalAlgebraInsertion("'", { wrap: true, wrapStyle: 'quotes' })).toBe("''")
    expect(buildRelationalAlgebraInsertion('AND', { wrap: false })).toBe('^')
  })
})
