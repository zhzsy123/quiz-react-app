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
        aiAuditMap={{}}
        aiExplainMode="standard"
        aiPracticeModal={null}
        onChangeAiExplainMode={noop}
        onExplainQuestion={noop}
        onAuditQuestion={noop}
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
        aiAuditMap={{}}
        aiExplainMode="standard"
        aiPracticeModal={null}
        onChangeAiExplainMode={noop}
        onExplainQuestion={noop}
        onAuditQuestion={noop}
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

  it('renders both AI解释 and AI核题 buttons for the current question', async () => {
    const item = {
      id: 'q1',
      type: 'single_choice',
      prompt: 'Which option is correct?',
      score: 2,
      options: [
        { key: 'A', text: 'Option A' },
        { key: 'B', text: 'Option B' },
      ],
      answer: {
        type: 'objective',
        correct: 'A',
        rationale: 'A is correct.',
      },
    }

    const { container, root } = await renderComponent(
      <CleanQuizView
        quiz={{ items: [item] }}
        answers={{ q1: 'B' }}
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
        aiAuditMap={{}}
        aiExplainMode="standard"
        aiPracticeModal={null}
        onChangeAiExplainMode={noop}
        onExplainQuestion={noop}
        onAuditQuestion={noop}
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

    expect(container.textContent).toContain('AI解释')
    expect(container.textContent).toContain('AI核题')

    await act(async () => {
      root.unmount()
    })
  })

  it('shows AI评分 for short answer questions with existing response', async () => {
    const item = {
      id: 'short_1',
      type: 'short_answer',
      prompt: '简述数据库系统中数据独立性的含义。',
      score: 8,
      answer: {
        type: 'subjective',
        scoring_points: ['说明逻辑独立性', '说明物理独立性'],
      },
    }

    const { container, root } = await renderComponent(
      <CleanQuizView
        quiz={{ items: [item] }}
        answers={{ short_1: { text: '逻辑独立性与物理独立性。' } }}
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
        onErDiagramChange={noop}
        aiReview={null}
        aiQuestionReviewMap={{}}
        aiExplainMap={{}}
        aiAuditMap={{}}
        aiExplainMode="standard"
        aiPracticeModal={null}
        onChangeAiExplainMode={noop}
        onExplainQuestion={noop}
        onAuditQuestion={noop}
        onGradeQuestion={noop}
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

    expect(container.textContent).toContain('AI评分')

    await act(async () => {
      root.unmount()
    })
  })
  it('shows fill blank slot hints for top-level fill blank questions', async () => {
    const item = {
      id: 'blank_1',
      type: 'fill_blank',
      prompt: '算法具有多个重要特性，它们分别是、、、以及有零或多个输入和一个或多个输出。',
      score: 1.5,
      blanks: [
        { blank_id: 'b1', accepted_answers: ['有穷性'], score: 0.5 },
        { blank_id: 'b2', accepted_answers: ['确定性'], score: 0.5 },
        { blank_id: 'b3', accepted_answers: ['可行性'], score: 0.5 },
      ],
      answer: { type: 'objective' },
    }

    const { container, root } = await renderComponent(
      <CleanQuizView
        quiz={{ items: [item] }}
        answers={{ blank_1: {} }}
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
        aiAuditMap={{}}
        aiExplainMode="standard"
        aiPracticeModal={null}
        onChangeAiExplainMode={noop}
        onExplainQuestion={noop}
        onAuditQuestion={noop}
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

    expect(container.textContent).toContain('空位顺序')
    expect(container.textContent).toContain('第 1 空')
    expect(container.textContent).toContain('第 2 空')
    expect(container.textContent).toContain('第 3 空')

    await act(async () => {
      root.unmount()
    })
  })

  it('shows the compact practice override button instead of the old manual judge panel', async () => {
    const item = {
      id: 'q1',
      type: 'single_choice',
      prompt: 'Which option is correct?',
      score: 2,
      options: [
        { key: 'A', text: 'Option A' },
        { key: 'B', text: 'Option B' },
      ],
      answer: {
        type: 'objective',
        correct: 'A',
        rationale: 'A is correct.',
      },
    }

    const { container, root } = await renderComponent(
      <CleanQuizView
        quiz={{ items: [item] }}
        answers={{ q1: 'B' }}
        submitted={false}
        currentIndex={0}
        mode="practice"
        autoAdvance={false}
        remainingSeconds={0}
        isPaused={false}
        revealedMap={{ q1: true }}
        manualJudgeMap={{ q1: 'correct' }}
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
        aiAuditMap={{}}
        aiExplainMode="standard"
        aiPracticeModal={null}
        onChangeAiExplainMode={noop}
        onExplainQuestion={noop}
        onAuditQuestion={noop}
        onExplainWhyWrong={noop}
        onGenerateSimilarQuestions={noop}
        onCloseAiPracticeModal={noop}
        onSubmit={noop}
        onSelectCompositeOption={noop}
        onCompositeFillBlankChange={noop}
        onCompositeTextChange={noop}
        onRevealCompositeQuestion={noop}
        onSetManualJudge={noop}
      />
    )

    expect(container.querySelectorAll('.ai-inline-btn').length).toBe(3)
    expect(container.querySelector('.ai-practice-judge-btn.active')).not.toBeNull()
    expect(container.querySelector('.practice-judge-panel')).toBeNull()

    await act(async () => {
      root.unmount()
    })
  })
})
