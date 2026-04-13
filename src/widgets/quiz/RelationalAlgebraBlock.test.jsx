/* @vitest-environment jsdom */

import React, { useState } from 'react'
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import RelationalAlgebraBlock from './RelationalAlgebraBlock.jsx'

function Harness() {
  const [response, setResponse] = useState({
    type: 'relational_algebra',
    responses: { '1': '' },
  })
  const [expandedMap, setExpandedMap] = useState({ '1': false })

  const item = {
    id: 'ra_1',
    type: 'relational_algebra',
    title: '关系代数题',
    prompt: '请完成下列查询。',
    schemas: [
      { name: '学生', attributes: ['学号', '姓名'] },
      { name: '课程', attributes: ['课程号', '课程名'] },
    ],
    subquestions: [
      {
        id: '1',
        prompt: '找出学生信息。',
        score: 5,
        reference_answer: 'π[姓名](学生)',
      },
    ],
  }

  return (
    <RelationalAlgebraBlock
      item={item}
      response={response}
      submitted={false}
      isPaused={false}
      expandedMap={expandedMap}
      onTextChange={(_, subquestionId, nextValue) =>
        setResponse((current) => ({
          ...current,
          responses: {
            ...current.responses,
            [subquestionId]: nextValue,
          },
        }))
      }
      onToggleSubQuestion={(_, subquestionId, nextExpanded) =>
        setExpandedMap((current) => ({
          ...current,
          [subquestionId]: nextExpanded,
        }))
      }
      onRevealQuestion={vi.fn()}
    />
  )
}

function mountHarness() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  act(() => {
    root.render(<Harness />)
  })

  return { container, root }
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('RelationalAlgebraBlock', () => {
  it('renders schema lines, supports template insertion, and can collapse tools', () => {
    const { container, root } = mountHarness()

    const promptText = '请完成下列查询。'
    const pageText = container.textContent || ''
    const promptCount = pageText.split(promptText).length - 1
    expect(promptCount).toBe(0)
    expect(pageText).not.toContain('待核验 0 / 2')

    const header = container.querySelector('.rel-algebra-subquestion-head')
    expect(header).toBeTruthy()

    act(() => {
      header.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const textarea = container.querySelector('.rel-algebra-editor')
    expect(textarea).toBeTruthy()

    act(() => {
      textarea.focus()
      textarea.setSelectionRange(0, 0)
    })

    const templateBtn = Array.from(container.querySelectorAll('.rel-algebra-template-card')).find((button) =>
      button.textContent.includes('选择后投影')
    )
    expect(templateBtn).toBeTruthy()

    act(() => {
      templateBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(container.querySelector('.rel-algebra-editor').value).toContain('σ[条件]')

    const studentToken = Array.from(container.querySelectorAll('.rel-algebra-token')).find(
      (button) => button.textContent === '学生'
    )
    expect(studentToken).toBeTruthy()

    act(() => {
      studentToken.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(container.querySelector('.rel-algebra-editor').value).toContain('学生')

    const toggleButton = container.querySelector('.rel-algebra-sidebar-toggle')
    expect(toggleButton).toBeTruthy()

    act(() => {
      toggleButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(container.querySelector('.rel-algebra-sidebar')?.className).toContain('collapsed')
    expect(container.querySelector('.rel-algebra-tools-collapsed-hint')).toBeTruthy()

    act(() => {
      root.unmount()
    })
  })
})
