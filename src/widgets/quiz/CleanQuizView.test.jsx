/* @vitest-environment jsdom */

import React from 'react'
import { act } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { createRoot } from 'react-dom/client'
import CleanQuizView from './CleanQuizView.jsx'

async function renderComponent(element) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  await act(async () => {
    root.render(element)
  })

  return { container, root }
}

function noop() {}

describe('CleanQuizView', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('renders a fallback message instead of returning a blank screen for empty quizzes', async () => {
    const { container, root } = await renderComponent(
      <CleanQuizView
        quiz={{ items: [] }}
        answers={{}}
        submitted={false}
        currentIndex={0}
        mode="practice"
        autoAdvance={false}
        remainingSeconds={0}
        isPaused={false}
        revealedMap={{}}
        isFavorite={false}
        onToggleFavorite={noop}
        onToggleAutoAdvance={noop}
        onTogglePracticeWrongBook={noop}
        onToggleExamWrongBook={noop}
        onTogglePause={noop}
        practiceWritesWrongBook
        examWritesWrongBook
        onJump={noop}
        onPrev={noop}
        onNext={noop}
        onSelectOption={noop}
        onRevealCurrentObjective={noop}
        onSelectReadingOption={noop}
        onFillBlankChange={noop}
        onTextChange={noop}
        aiReview={null}
        aiQuestionReviewMap={{}}
        aiExplainMap={{}}
        aiExplainMode="standard"
        aiPracticeModal={null}
        onChangeAiExplainMode={noop}
        onExplainQuestion={noop}
        onExplainWhyWrong={noop}
        onGenerateSimilarQuestions={noop}
        onCloseAiPracticeModal={noop}
        onSubmit={noop}
        onSelectCompositeOption={noop}
        onCompositeFillBlankChange={noop}
        onCompositeTextChange={noop}
        onRevealCompositeQuestion={noop}
      />
    )

    expect(container.textContent).toContain('当前试卷没有可渲染的题目')

    await act(async () => {
      root.unmount()
    })
  })

  it('renders reading questions through the reading block instead of the generic objective fallback', async () => {
    const readingItem = {
      id: 'reading_a',
      type: 'reading',
      title: 'Passage A',
      passage: {
        title: 'Passage A',
        content: 'Tom likes reading books after school.',
      },
      questions: [
        {
          id: 'reading_a_1',
          type: 'single_choice',
          prompt: 'What does Tom like to do?',
          score: 2.5,
          options: [
            { key: 'A', text: 'Play football' },
            { key: 'B', text: 'Read books' },
            { key: 'C', text: 'Watch TV' },
            { key: 'D', text: 'Go shopping' },
          ],
          answer: {
            type: 'objective',
            correct: 'B',
            rationale: 'Because the passage says he likes reading books.',
          },
        },
      ],
      answer: { type: 'objective' },
    }

    const { container, root } = await renderComponent(
      <CleanQuizView
        quiz={{ items: [readingItem] }}
        answers={{ reading_a: {} }}
        submitted={false}
        currentIndex={0}
        mode="practice"
        autoAdvance={false}
        remainingSeconds={0}
        isPaused={false}
        revealedMap={{}}
        isFavorite={false}
        onToggleFavorite={noop}
        onToggleAutoAdvance={noop}
        onTogglePracticeWrongBook={noop}
        onToggleExamWrongBook={noop}
        onTogglePause={noop}
        practiceWritesWrongBook
        examWritesWrongBook
        onJump={noop}
        onPrev={noop}
        onNext={noop}
        onSelectOption={noop}
        onRevealCurrentObjective={noop}
        onSelectReadingOption={noop}
        onFillBlankChange={noop}
        onTextChange={noop}
        aiReview={null}
        aiQuestionReviewMap={{}}
        aiExplainMap={{}}
        aiExplainMode="standard"
        aiPracticeModal={null}
        onChangeAiExplainMode={noop}
        onExplainQuestion={noop}
        onExplainWhyWrong={noop}
        onGenerateSimilarQuestions={noop}
        onCloseAiPracticeModal={noop}
        onSubmit={noop}
        onSelectCompositeOption={noop}
        onCompositeFillBlankChange={noop}
        onCompositeTextChange={noop}
        onRevealCompositeQuestion={noop}
      />
    )

    expect(container.textContent).toContain('Tom likes reading books after school.')
    expect(container.textContent).toContain('What does Tom like to do?')
    expect(container.textContent).not.toContain('当前客观题缺少可作答的选项')

    await act(async () => {
      root.unmount()
    })
  })
})
