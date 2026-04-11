/* @vitest-environment jsdom */

import React from 'react'
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import AiQuestionGeneratorDialog from './AiQuestionGeneratorDialog.jsx'

async function renderDialog(props) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  await act(async () => {
    root.render(<AiQuestionGeneratorDialog {...props} />)
  })

  return { root, container }
}

describe('AiQuestionGeneratorDialog', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  it('maps generator status into product language', async () => {
    const props = {
      open: true,
      subjectMeta: {
        shortLabel: '英语',
        questionTypeOptions: [{ key: 'single_choice', label: '单项选择题' }],
        generation: {
          supportedModes: ['practice'],
          defaultCounts: [5, 10],
          defaultDifficulty: 'medium',
        },
      },
      config: {
        mode: 'practice',
        difficulty: 'medium',
        count: 5,
        questionTypes: ['single_choice'],
        questionPlan: {},
        extraPrompt: '',
      },
      status: 'generating',
      error: '',
      summary: {
        valid: 0,
        warning: 0,
        invalid: 0,
      },
      draftQuestions: [],
      activityEntries: [],
      onClose: vi.fn(),
      onConfigChange: vi.fn(),
      onStartGeneration: vi.fn(),
      onStopGeneration: vi.fn(),
      onResetGenerator: vi.fn(),
      onSaveGeneratedPaper: vi.fn(),
      onStartPracticeWithGeneratedPaper: vi.fn(),
      onRemoveQuestion: vi.fn(),
    }

    const { root, container } = await renderDialog(props)

    expect(container.textContent).toContain('正在生成')
    expect(container.textContent).not.toContain('generating')

    await act(async () => {
      root.unmount()
    })
  })
})
