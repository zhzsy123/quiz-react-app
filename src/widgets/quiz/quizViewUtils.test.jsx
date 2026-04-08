import { describe, expect, it } from 'vitest'
import { getNavGroupMeta, getReadingQuestionDisplayLabel } from './quizViewUtils.jsx'

describe('quizViewUtils', () => {
  it('groups cloze-derived objective items under the cloze navigation group', () => {
    const meta = getNavGroupMeta({
      id: 'q_cloze_001_blank_1',
      type: 'single_choice',
      source_type: 'cloze',
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
})
