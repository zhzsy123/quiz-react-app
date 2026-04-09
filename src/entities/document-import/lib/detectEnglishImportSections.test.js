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

  it('infers a leading cloze section before the first clear marker', () => {
    const result = detectEnglishImportSections({
      plainText: `
Read the following passage and choose the best word or phrase for each blank.
One day, Tom [[1]] to school and [[2]] a wonderful teacher.
A. went B. go C. goes D. going
A. met B. meet C. meets D. meeting

Passage A
Read Passage A and answer the questions.

Part IV Translation
Translate the following sentences.

Write an essay of about 120 words.
      `,
    })

    expect(result.shouldSplit).toBe(true)
    expect(result.sections.map((item) => item.key)).toEqual(['cloze', 'reading_a', 'translation', 'essay'])
  })

  it('does not infer a weak leading residual block as cloze before reading markers', () => {
    const result = detectEnglishImportSections({
      plainText: `
1. A
2. B
3. C

Passage C
Read Passage C and answer the questions.

Part IV Translation
Translate the following sentences.

Part V Writing
Write an essay.
      `,
    })

    expect(result.sections.map((item) => item.key)).toEqual(['reading_c', 'translation', 'essay'])
  })
})
