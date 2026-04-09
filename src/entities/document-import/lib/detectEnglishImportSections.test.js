import { describe, expect, it } from 'vitest'
import { detectEnglishImportSections } from './detectEnglishImportSections'

describe('detectEnglishImportSections', () => {
  it('detects english sections and splits reading passages', () => {
    const result = detectEnglishImportSections({
      plainText: `
Part I Grammar and Vocabulary
1. Choose the best answer.

Part II Cloze
Read the passage and choose the best answer for each blank.

Part III Reading Comprehension
Passage A
Read Passage A and answer the questions.

Passage B
Read Passage B and answer the questions.

Part IV Translation
Translate the following passage.

Part V Writing
Write a composition.
      `,
    })

    expect(result.shouldSplit).toBe(true)
    expect(result.sections.map((item) => item.key)).toEqual([
      'single_choice',
      'cloze',
      'reading_a',
      'reading_b',
      'translation',
      'essay',
    ])
  })
})
