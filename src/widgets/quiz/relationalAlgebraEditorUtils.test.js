import { describe, expect, it } from 'vitest'
import {
  buildRelationalAlgebraInsertion,
  normalizeRelationalAlgebraResponse,
  normalizeSymbol,
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
          2: "σ[专业='英语'](学生)",
        },
      }),
      subquestions
    )

    expect(normalized).toEqual({
      1: 'π[学号](学生)',
      2: "σ[专业='英语'](学生)",
    })

    expect(serializeRelationalAlgebraResponse('ra_1', subquestions, normalized)).toContain('"question_id": "ra_1"')
  })

  it('wraps algebra operators with expected delimiters and cursor offsets', () => {
    expect(buildRelationalAlgebraInsertion('PI')).toEqual({
      text: `${normalizeSymbol('PI')}[]()`,
      selectionStartOffset: 2,
      selectionEndOffset: 2,
    })

    expect(buildRelationalAlgebraInsertion('SIGMA')).toEqual({
      text: `${normalizeSymbol('SIGMA')}[]()`,
      selectionStartOffset: 2,
      selectionEndOffset: 2,
    })

    expect(buildRelationalAlgebraInsertion("'", { wrapStyle: 'quotes' })).toEqual({
      text: "''",
      selectionStartOffset: 1,
      selectionEndOffset: 1,
    })

    const andInsertion = buildRelationalAlgebraInsertion('AND')
    expect(andInsertion).toEqual({
      text: normalizeSymbol('AND'),
      selectionStartOffset: normalizeSymbol('AND').length,
      selectionEndOffset: normalizeSymbol('AND').length,
    })

    const joinInsertion = buildRelationalAlgebraInsertion('JOIN')
    expect(joinInsertion).toEqual({
      text: normalizeSymbol('JOIN'),
      selectionStartOffset: normalizeSymbol('JOIN').length,
      selectionEndOffset: normalizeSymbol('JOIN').length,
    })
  })

  it('adds a comma when inserting another attribute inside brackets', () => {
    const insertion = buildRelationalAlgebraInsertion('属性2', {
      kind: 'attribute',
      textValue: 'π[属性1](关系)',
      selectionStart: 5,
    })

    expect(insertion.text).toContain('属性2')
    expect(insertion.text.length).toBeGreaterThan('属性2'.length)
  })
})
