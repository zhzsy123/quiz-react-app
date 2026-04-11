import { describe, expect, it } from 'vitest'
import {
  buildQuestionNearSignature,
  buildQuestionSignature,
  hasDuplicateSignature,
  rememberSignature,
} from './generationSignatures.js'

describe('generationSignatures', () => {
  it('detects near duplicate questions by semantic token overlap', () => {
    const signatureMap = new Map()

    const firstQuestion = {
      type: 'single_choice',
      prompt: '下列关于栈和队列的说法，正确的是哪一项？',
      options: [
        { key: 'A', text: '栈先进先出' },
        { key: 'B', text: '队列先进先出' },
        { key: 'C', text: '二者都后进先出' },
        { key: 'D', text: '二者都先进后出' },
      ],
    }

    const secondQuestion = {
      type: 'single_choice',
      prompt: '关于栈和队列的特性，下列说法正确的是哪一项？',
      options: [
        { key: 'A', text: '栈先进先出' },
        { key: 'B', text: '队列先进先出' },
        { key: 'C', text: '二者都后进先出' },
        { key: 'D', text: '二者都先进后出' },
      ],
    }

    const firstSignature = buildQuestionSignature(firstQuestion)
    const firstNearSignature = buildQuestionNearSignature(firstQuestion)
    rememberSignature(signatureMap, 'single_choice', firstSignature, firstNearSignature)

    expect(
      hasDuplicateSignature(
        signatureMap,
        'single_choice',
        buildQuestionSignature(secondQuestion),
        buildQuestionNearSignature(secondQuestion)
      )
    ).toBe(true)
  })
})
