import { describe, expect, it } from 'vitest'
import { resolveAiModel } from './aiModelPolicy'

describe('resolveAiModel', () => {
  it('routes import and generation throughput features to deepseek-chat', () => {
    expect(resolveAiModel({ feature: 'document_import' })).toBe('deepseek-chat')
    expect(resolveAiModel({ feature: 'document_import_section' })).toBe('deepseek-chat')
    expect(resolveAiModel({ feature: 'question_generation' })).toBe('deepseek-chat')
  })

  it('routes repair and grading features to deepseek-reasoner', () => {
    expect(resolveAiModel({ feature: 'document_import_repair' })).toBe('deepseek-reasoner')
    expect(resolveAiModel({ feature: 'subjective_grading' })).toBe('deepseek-reasoner')
    expect(resolveAiModel({ feature: 'relational_algebra_grading' })).toBe('deepseek-reasoner')
  })

  it('honors explicit model first and configured model second', () => {
    expect(
      resolveAiModel({
        feature: 'document_import',
        preferredModel: 'deepseek-reasoner',
        explicitModel: 'deepseek-chat',
      })
    ).toBe('deepseek-chat')

    expect(
      resolveAiModel({
        feature: 'document_import',
        preferredModel: 'deepseek-reasoner',
      })
    ).toBe('deepseek-reasoner')
  })
})
