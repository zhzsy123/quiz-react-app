/* @vitest-environment jsdom */

import React from 'react'
import { act } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { createRoot } from 'react-dom/client'
import QuizClozeBlock from './QuizClozeBlock.jsx'

async function renderComponent(element) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  await act(async () => {
    root.render(element)
  })

  return { container, root }
}

describe('QuizClozeBlock', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('shows fallback blanks when the passage text has no inline placeholders', async () => {
    const item = {
      id: 'cloze_1',
      type: 'cloze',
      title: '完形填空 A',
      article:
        'In the heart of the city there is a small park that offers comfort to nearby residents.',
      blanks: [
        {
          blank_id: 1,
          score: 2,
          prompt: 'The city park offers a quiet place for residents to relax.',
          options: [
            { key: 'A', text: 'refuge' },
            { key: 'B', text: 'obstacle' },
          ],
          correct: 'A',
          rationale: '符合语境。',
        },
        {
          blank_id: 2,
          score: 2,
          prompt: 'Local volunteers hope their efforts will inspire more people to care for it.',
          options: [
            { key: 'A', text: 'if only' },
            { key: 'B', text: 'even if' },
          ],
          correct: 'B',
          rationale: '符合语义。',
        },
      ],
    }

    const { container, root } = await renderComponent(
      <QuizClozeBlock
        item={item}
        response={{}}
        submitted={false}
        isPaused={false}
        mode="practice"
        revealedMap={{}}
        onSelectClozeOption={() => {}}
        onRevealCurrentObjective={() => {}}
      />
    )

    expect(container.textContent).toContain('In the heart of the city')
    expect(container.textContent).toContain('(1) ______')
    expect(container.textContent).toContain('(2) ______')
    expect(container.textContent).toContain('The city park offers a quiet place for residents to relax.')
    expect(container.textContent).toContain('Local volunteers hope their efforts will inspire more people to care for it.')

    await act(async () => {
      root.unmount()
    })
  })
})
