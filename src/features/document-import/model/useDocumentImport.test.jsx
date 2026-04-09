/* @vitest-environment jsdom */

import React, { useEffect } from 'react'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
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
      return {
        requestId: 'import_1',
        normalizedDocument: { quiz: { title: '英语模拟卷', subject: 'english', items: [{}] } },
        preview: {
          title: '英语模拟卷',
          subject: '英语',
          questionCount: 12,
          totalScore: 100,
          validCount: 12,
          warningCount: 1,
          invalidCount: 0,
          typeStats: [{ type: 'single_choice', label: '单项选择题', count: 12 }],
        },
        warnings: ['页眉疑似被识别为正文'],
        errors: [],
        invalidReasons: [],
      }
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
        title: '英语模拟卷',
        questionCount: 12,
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
      importDocumentWithAi: async () => ({
        requestId: 'import_2',
        normalizedDocument: { quiz: { title: '国际贸易试卷', subject: 'international_trade', items: [{}] } },
        preview: {
          title: '国际贸易试卷',
          subject: '国际贸易',
          questionCount: 10,
          totalScore: 50,
          validCount: 10,
          warningCount: 0,
          invalidCount: 0,
          typeStats: [{ type: 'single_choice', label: '单项选择题', count: 10 }],
        },
        warnings: [],
        errors: [],
        invalidReasons: [],
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
})
