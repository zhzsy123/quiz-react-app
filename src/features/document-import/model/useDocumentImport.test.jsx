/* @vitest-environment jsdom */

import React, { useEffect } from 'react'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { buildImportPreview } from '../../../entities/document-import/lib/buildImportPreview'
import { buildPersistedImportPayload } from '../../../entities/document-import/lib/buildPersistedImportPayload'
import { getQuizScoreBreakdown } from '../../../entities/quiz/lib/scoring/getQuizScoreBreakdown'
import { useDocumentImport } from './useDocumentImport'

function Harness({ options, onState }) {
  const api = useDocumentImport(options)

  useEffect(() => {
    onState(api)
  }, [api, onState])

  return null
}

async function mountHarness(options = {}) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  const stateRef = { current: null }

  await act(async () => {
    root.render(<Harness options={options} onState={(state) => { stateRef.current = state }} />)
  })

  return { root, container, stateRef }
}

function createSingleChoiceQuestion({
  id = 'q1',
  prompt = '示例单选题',
  score = 2,
} = {}) {
  return {
    id,
    type: 'single_choice',
    prompt,
    score,
    options: [
      { key: 'A', text: '选项 A' },
      { key: 'B', text: '选项 B' },
    ],
    answer: {
      type: 'objective',
      correct: 'A',
      rationale: '示例解析',
    },
  }
}

function createImportResult({ subject = 'english', items = [createSingleChoiceQuestion()], warnings = [], errors = [], invalidReasons = [] } = {}) {
  const scoreBreakdown = getQuizScoreBreakdown(items)
  const persistedPayload = buildPersistedImportPayload({
    title: '测试试卷',
    subject,
    items,
  })

  const normalizedDocument = {
    rawPayload: persistedPayload,
    quiz: {
      title: '测试试卷',
      subject,
      items,
    },
    scoreBreakdown,
  }

  return {
    requestId: 'import_1',
    normalizedDocument,
    persistedPayload,
    scoreBreakdown,
    preview: buildImportPreview({
      normalizedDocument,
      subjectKey: subject,
      warnings,
      invalidReasons,
    }),
    warnings,
    errors,
    invalidReasons,
  }
}

describe('useDocumentImport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('runs extract -> ai import -> preview_ready and computes save flags', async () => {
    const file = new File(['mock pdf text'], 'mock-paper.pdf', { type: 'application/pdf' })
    const extractDocumentDraft = vi.fn(async () => ({
      documentKind: 'pdf',
      warnings: ['页眉疑似被识别为正文'],
      documentDraft: {
        fileName: file.name,
        plainText: 'Page 1\nQuestion 1',
        stats: {
          pageCount: 2,
          paragraphCount: 0,
          characterCount: 1200,
        },
      },
    }))
    const importDocumentWithAi = vi.fn(async ({ onStageChange }) => {
      onStageChange?.('calling_ai', '正在调用 AI 解析试卷结构')
      onStageChange?.('validating', '正在校验并标准化题库结构')
      return createImportResult({
        warnings: ['页眉疑似被识别为正文'],
      })
    })

    const { root, container, stateRef } = await mountHarness({
      initialOpen: true,
      extractDocumentDraft,
      importDocumentWithAi,
    })

    await act(async () => {
      stateRef.current.selectFile(file)
      stateRef.current.setSubject('english')
    })

    await act(async () => {
      await stateRef.current.startImport()
    })

    expect(extractDocumentDraft).toHaveBeenCalledWith(file, { subject: 'english' })
    expect(importDocumentWithAi).toHaveBeenCalled()
    expect(stateRef.current.state.status).toBe('preview_ready')
    expect(stateRef.current.state.preview).toEqual(
      expect.objectContaining({
        title: '测试试卷',
        questionCount: 1,
      })
    )
    expect(stateRef.current.state.canSave).toBe(true)
    expect(stateRef.current.state.canStartPractice).toBe(true)
    expect(stateRef.current.state.progressLog.join('\n')).toContain('文本提取完成')
    expect(stateRef.current.state.progressLog.join('\n')).toContain('解析完成，可预览并保存题库')

    await act(async () => {
      root.unmount()
    })
    container.remove()
  })

  it('reuses one save result when starting practice after saving', async () => {
    const file = new File(['mock pdf text'], 'trade-paper.pdf', { type: 'application/pdf' })
    const onSaveImportedPaper = vi.fn(async () => ({ paperId: 'paper-1', title: '国际贸易试卷' }))
    const onStartPracticeWithImportedPaper = vi.fn(async ({ saveResult }) => saveResult)

    const { root, container, stateRef } = await mountHarness({
      initialOpen: true,
      extractDocumentDraft: async () => ({
        documentKind: 'pdf',
        warnings: [],
        documentDraft: {
          fileName: file.name,
          plainText: 'trade plain text',
          stats: {
            pageCount: 1,
            paragraphCount: 0,
            characterCount: 800,
          },
        },
      }),
      importDocumentWithAi: async () =>
        createImportResult({
          subject: 'international_trade',
        }),
      onSaveImportedPaper,
      onStartPracticeWithImportedPaper,
    })

    await act(async () => {
      stateRef.current.selectFile(file)
      stateRef.current.setSubject('international_trade')
    })

    await act(async () => {
      await stateRef.current.startImport()
    })

    let firstSave = null
    await act(async () => {
      firstSave = await stateRef.current.saveImportedPaper()
    })

    let launchResult = null
    await act(async () => {
      launchResult = await stateRef.current.startPracticeWithImportedPaper()
    })

    expect(firstSave).toEqual(expect.objectContaining({ paperId: 'paper-1' }))
    expect(launchResult).toEqual(expect.objectContaining({ paperId: 'paper-1' }))
    expect(onSaveImportedPaper).toHaveBeenCalledTimes(1)
    expect(onStartPracticeWithImportedPaper).toHaveBeenCalledTimes(1)
    expect(stateRef.current.state.status).toBe('completed')

    await act(async () => {
      root.unmount()
    })
    container.remove()
  })

  it('supports removing and editing questions in preview', async () => {
    const file = new File(['mock pdf text'], 'editable.pdf', { type: 'application/pdf' })
    const questions = [
      createSingleChoiceQuestion({ id: 'q1', prompt: '原始题干一' }),
      createSingleChoiceQuestion({ id: 'q2', prompt: '原始题干二' }),
    ]

    const { root, container, stateRef } = await mountHarness({
      initialOpen: true,
      extractDocumentDraft: async () => ({
        documentKind: 'pdf',
        warnings: [],
        documentDraft: {
          fileName: file.name,
          plainText: 'editable plain text',
          stats: { pageCount: 1, paragraphCount: 0, characterCount: 600 },
        },
      }),
      importDocumentWithAi: async () => createImportResult({ items: questions }),
    })

    await act(async () => {
      stateRef.current.selectFile(file)
      stateRef.current.setSubject('english')
    })

    await act(async () => {
      await stateRef.current.startImport()
    })

    expect(stateRef.current.state.preview.questionPreviews).toHaveLength(2)

    await act(async () => {
      stateRef.current.updateQuestion('q1', { prompt: '修订后的题干', score: 5 })
    })

    expect(stateRef.current.state.preview.questionPreviews[0].prompt).toBe('修订后的题干')
    expect(stateRef.current.state.importResult.persistedPayload.questions[0].prompt).toBe('修订后的题干')
    expect(stateRef.current.state.importResult.persistedPayload.questions[0].score).toBe(5)

    await act(async () => {
      stateRef.current.removeQuestion('q2')
    })

    expect(stateRef.current.state.preview.questionPreviews).toHaveLength(1)
    expect(stateRef.current.state.canSave).toBe(true)

    await act(async () => {
      stateRef.current.removeQuestion('q1')
    })

    expect(stateRef.current.state.preview.questionPreviews).toHaveLength(0)
    expect(stateRef.current.state.invalidReasons[0]).toContain('至少保留一道题')
    expect(stateRef.current.state.canSave).toBe(false)

    await act(async () => {
      root.unmount()
    })
    container.remove()
  })

  it('supports partial question repair without breaking preview state', async () => {
    const file = new File(['mock pdf text'], 'repair.pdf', { type: 'application/pdf' })
    const repairImportedQuestionWithAi = vi.fn(async () => ({
      repairedQuestion: createSingleChoiceQuestion({
        id: 'q1',
        prompt: 'AI 修复后的题干',
        score: 4,
      }),
    }))

    const { root, container, stateRef } = await mountHarness({
      initialOpen: true,
      extractDocumentDraft: async () => ({
        documentKind: 'pdf',
        warnings: [],
        documentDraft: {
          fileName: file.name,
          plainText: 'repair plain text',
          stats: { pageCount: 1, paragraphCount: 0, characterCount: 700 },
        },
      }),
      importDocumentWithAi: async () =>
        createImportResult({
          items: [createSingleChoiceQuestion({ id: 'q1', prompt: '待修复题干' })],
      }),
      repairImportedQuestionWithAi,
    })

    await act(async () => {
      stateRef.current.selectFile(file)
      stateRef.current.setSubject('english')
    })

    await act(async () => {
      await stateRef.current.startImport()
    })

    await act(async () => {
      await stateRef.current.repairQuestion('q1')
    })

    expect(repairImportedQuestionWithAi).toHaveBeenCalledTimes(1)
    expect(stateRef.current.state.preview.questionPreviews[0].prompt).toBe('AI 修复后的题干')
    expect(stateRef.current.state.repairingQuestionIds).toHaveLength(0)

    await act(async () => {
      root.unmount()
    })
    container.remove()
  })
})
