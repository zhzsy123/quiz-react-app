/* @vitest-environment jsdom */

import React from 'react'
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import GeneratedQuestionList from './GeneratedQuestionList.jsx'

function mountComponent(props) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  act(() => {
    root.render(<GeneratedQuestionList {...props} />)
  })

  return { container, root }
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('GeneratedQuestionList', () => {
  it('splits planning and expansion entries into two sections', () => {
    const { container, root } = mountComponent({
      activityEntries: [
        {
          id: 'planning-single_choice',
          phase: 'planning',
          title: '规划 单项选择题',
          status: 'completed',
          summary: 'Planned 2 blueprints',
          meta: '2 项',
        },
        {
          id: 'question-1',
          phase: 'expansion',
          title: '第 1 题 · 单项选择题',
          status: 'completed',
          summary: '题目已生成',
          meta: '2 分',
          previewText: '选择正确答案',
          questionId: 'q1',
        },
      ],
      onRemoveQuestion: vi.fn(),
    })

    expect(container.textContent).toContain('蓝图规划')
    expect(container.textContent).toContain('题目扩写')
    expect(container.querySelector('[data-testid="generator-planning-timeline"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="generator-activity-timeline"]')).toBeTruthy()

    act(() => {
      root.unmount()
    })
  })
})
