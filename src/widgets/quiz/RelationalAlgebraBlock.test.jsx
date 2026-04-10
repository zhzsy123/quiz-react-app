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
        reference_answer: 'π(学生)',
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
  it('renders schema lines and inserts operators into the active textarea', () => {
    const { container, root } = mountHarness()

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

    const projectionBtn = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'π[]')
    expect(projectionBtn).toBeTruthy()

    act(() => {
      projectionBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(container.querySelector('.rel-algebra-editor').value).toContain('π[]')

    const studentToken = Array.from(container.querySelectorAll('.rel-algebra-token')).find(
      (button) => button.textContent === '学生'
    )
    expect(studentToken).toBeTruthy()

    act(() => {
      studentToken.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(container.querySelector('.rel-algebra-editor').value).toContain('学生')

    act(() => {
      root.unmount()
    })
  })
})
