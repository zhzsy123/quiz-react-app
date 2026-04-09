/* @vitest-environment jsdom */

import React from 'react'
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import DocumentImportDialog from './DocumentImportDialog.jsx'

async function renderDialog(props) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  await act(async () => {
    root.render(<DocumentImportDialog {...props} />)
  })

  return { root, container }
}

describe('DocumentImportDialog', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  it('renders preview information and allows selecting a file', async () => {
    const onFileSelect = vi.fn()
    const props = {
      open: true,
      state: {
        open: true,
        status: 'preview_ready',
        file: null,
        fileMeta: { name: 'mock-paper.pdf', size: 2048, mimeType: 'application/pdf' },
        subject: 'english',
        extractedText: 'text',
        documentDraft: {
          stats: {
            characterCount: 1200,
            pageCount: 2,
            paragraphCount: 0,
          },
        },
        importResult: {},
        preview: {
          title: '英语模拟卷',
          subject: '英语',
          questionCount: 24,
          totalScore: 100,
          validCount: 24,
          warningCount: 1,
          invalidCount: 0,
          typeStats: [{ type: 'reading', label: '阅读理解', count: 4 }],
          questionPreviews: [
            {
              id: 'q1',
              index: 1,
              label: '阅读理解',
              score: 8,
              prompt: '阅读理解 A',
              excerpt: 'This is a sample reading passage.',
              subQuestionCount: 4,
            },
          ],
        },
        progressLog: ['已选择文件', '解析完成，可预览并保存题库'],
        warnings: ['页脚已自动忽略'],
        errors: [],
        invalidReasons: [],
        failedStage: '',
        canSave: true,
        canStartPractice: true,
      },
      subjectOptions: [
        { key: 'english', shortLabel: '英语' },
        { key: 'data_structure', shortLabel: '数据结构' },
      ],
      onClose: vi.fn(),
      onFileSelect,
      onSubjectChange: vi.fn(),
      onStartImport: vi.fn(),
      onCancelImport: vi.fn(),
      onReset: vi.fn(),
      onSaveImportedPaper: vi.fn(),
      onStartPracticeWithImportedPaper: vi.fn(),
    }

    const { root, container } = await renderDialog(props)

    expect(container.textContent).toContain('导入 PDF / DOCX')
    expect(container.textContent).toContain('英语模拟卷')
    expect(container.textContent).toContain('阅读理解')
    expect(container.textContent).toContain('阅读理解 A')
    expect(container.querySelector('[data-testid="document-import-save"]').disabled).toBe(false)
    expect(container.querySelector('[data-testid="document-import-launch"]').disabled).toBe(false)

    const input = container.querySelector('[data-testid="document-file-input"]')
    const file = new File(['pdf'], 'next-paper.pdf', { type: 'application/pdf' })
    await act(async () => {
      Object.defineProperty(input, 'files', {
        configurable: true,
        value: [file],
      })
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })

    expect(onFileSelect).toHaveBeenCalledWith(file)

    await act(async () => {
      root.unmount()
    })
  })
})
