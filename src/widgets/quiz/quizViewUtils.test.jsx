import { describe, expect, it } from 'vitest'
import { getNavGroupMeta, getQuestionDisplayMeta, getReadingQuestionDisplayLabel } from './quizViewUtils.jsx'

describe('quizViewUtils', () => {
  it('groups top-level cloze items under the cloze navigation group', () => {
    const meta = getNavGroupMeta({
      id: 'q_cloze_001',
      type: 'cloze',
    })

    expect(meta.key).toBe('cloze')
  })

  it('formats reading labels as passage-section plus sub-question index', () => {
    expect(
      getReadingQuestionDisplayLabel(
        {
          id: 'q_reading_A',
          passage: { title: 'Passage A' },
        },
        2
      )
    ).toBe('A-3')

    expect(
      getReadingQuestionDisplayLabel(
        {
          id: 'reading_block',
        },
        0,
        1
      )
    ).toBe('B-1')
  })

  it('returns clean display metadata for database sql questions', () => {
    const meta = getQuestionDisplayMeta({ id: 'sql_1', type: 'sql' })

    expect(meta.label).toBe('SQL 题')
    expect(meta.shortLabel).toBe('SQL')
    expect(meta.gradingLabel).toBe('AI核题')
  })
})
