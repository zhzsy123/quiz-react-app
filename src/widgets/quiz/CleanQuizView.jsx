import React from 'react'
import QuizNavigationSidebar from './QuizNavigationSidebar.jsx'
import QuizObjectiveBlock from './QuizObjectiveBlock.jsx'
import QuizSubjectiveBlock from './QuizSubjectiveBlock.jsx'
import QuizAiToolbar from './QuizAiToolbar.jsx'
import { AiExplainPanel, AiQuestionReviewPanel } from './QuizAiPanels.jsx'
import QuizAiPracticeModal from './QuizAiPracticeModal.jsx'
import { difficultyClass } from './quizViewUtils.jsx'

function getCurrentItem(quiz, currentIndex) {
  if (!quiz?.items?.length) return null
  return quiz.items[Math.max(0, Math.min(currentIndex || 0, quiz.items.length - 1))]
}

function getCurrentExplainEntry(currentItem, aiExplainMap) {
  if (!currentItem) return null
  return aiExplainMap?.[currentItem.id] || null
}

function getCurrentQuestionReview(currentItem, aiQuestionReviewMap) {
  if (!currentItem) return null
  return aiQuestionReviewMap?.[currentItem.id] || null
}

export default function CleanQuizView({
  quiz,
  answers,
  submitted,
  currentIndex,
  mode,
  autoAdvance,
  remainingSeconds,
  isPaused,
  revealedMap,
  isFavorite,
  onToggleFavorite,
  onToggleAutoAdvance,
  onTogglePracticeWrongBook,
  onToggleExamWrongBook,
  onTogglePause,
  practiceWritesWrongBook,
  examWritesWrongBook,
  onJump,
  onPrev,
  onNext,
  onSelectOption,
  onRevealCurrentObjective,
  onSelectReadingOption,
  onFillBlankChange,
  onTextChange,
  aiReview,
  aiQuestionReviewMap,
  aiExplainMap,
  aiExplainMode,
  aiPracticeModal,
  onChangeAiExplainMode,
  onExplainQuestion,
  onExplainWhyWrong,
  onGenerateSimilarQuestions,
  onCloseAiPracticeModal,
  onSubmit,
  onSelectCompositeOption,
  onCompositeFillBlankChange,
  onCompositeTextChange,
  onRevealCompositeQuestion,
}) {
  const currentItem = getCurrentItem(quiz, currentIndex)
  const currentExplainEntry = getCurrentExplainEntry(currentItem, aiExplainMap)
  const currentQuestionReview = getCurrentQuestionReview(currentItem, aiQuestionReviewMap)
  const showPracticeAiToolbar = mode === 'practice'
  const showExamAuditToolbar = mode === 'exam'
  const showWrongFollowups = false
  const prompt = currentItem?.prompt || currentItem?.passage?.title || currentItem?.title || '未命名题目'

  if (!quiz?.items?.length || !currentItem) return null

  return (
    <div className="quiz-layout">
      <QuizNavigationSidebar
        quizItems={quiz.items}
        currentItem={currentItem}
        currentIndex={currentIndex}
        answers={answers}
        mode={mode}
        submitted={submitted}
        isPaused={isPaused}
        remainingSeconds={remainingSeconds}
        autoAdvance={autoAdvance}
        practiceWritesWrongBook={practiceWritesWrongBook}
        examWritesWrongBook={examWritesWrongBook}
        onTogglePause={onTogglePause}
        onToggleAutoAdvance={onToggleAutoAdvance}
        onTogglePracticeWrongBook={onTogglePracticeWrongBook}
        onToggleExamWrongBook={onToggleExamWrongBook}
        onJump={onJump}
      />

      <main className="question-list">
        <section className="question-card current">
          <div className="question-top">
            <div>
              <div className="question-meta">
                <span className="tag blue">第 {currentIndex + 1} 题</span>
                {currentItem.difficulty ? (
                  <span className={difficultyClass(currentItem.difficulty)}>{currentItem.difficulty}</span>
                ) : null}
              </div>
              <div className="progress-text">
                进度：{currentIndex + 1} / {quiz.items.length}
              </div>
            </div>

            <div className="question-top-actions">
              <button
                type="button"
                className={`favorite-toggle ${isFavorite ? 'active' : ''}`}
                onClick={onToggleFavorite}
                aria-label={isFavorite ? '取消收藏' : '收藏题目'}
                title={isFavorite ? '取消收藏' : '收藏题目'}
              >
                ★
              </button>
            </div>
          </div>

          <h3>{prompt}</h3>

          <QuizAiToolbar
            currentItem={currentItem}
            currentExplainEntry={currentExplainEntry}
            mode={mode}
            showPracticeAiToolbar={showPracticeAiToolbar}
            showExamAuditToolbar={showExamAuditToolbar}
            showWrongFollowups={showWrongFollowups}
            aiExplainMode={aiExplainMode}
            onChangeAiExplainMode={onChangeAiExplainMode}
            onExplainQuestion={onExplainQuestion}
            onExplainWhyWrong={onExplainWhyWrong}
            onGenerateSimilarQuestions={onGenerateSimilarQuestions}
            disabled={isPaused || submitted}
          />

          {currentItem.answer?.type === 'objective' || currentItem.type === 'fill_blank' ? (
            <QuizObjectiveBlock
              item={currentItem}
              userResponse={answers[currentItem.id]}
              objectiveReveal={Boolean(revealedMap[currentItem.id])}
              submitted={submitted}
              disabled={isPaused}
              mode={mode}
              onSelectOption={onSelectOption}
              onRevealCurrentObjective={onRevealCurrentObjective}
              onFillBlankChange={onFillBlankChange}
            />
          ) : (
            <QuizSubjectiveBlock
              item={currentItem}
              response={answers[currentItem.id]}
              submitted={submitted}
              isPaused={isPaused}
              mode={mode}
              revealedMap={revealedMap}
              onFocusSubQuestion={() => {}}
              onSelectReadingOption={onSelectReadingOption}
              aiExplainMap={aiExplainMap}
              onExplainQuestion={onExplainQuestion}
              onSelectCompositeOption={onSelectCompositeOption}
              onCompositeFillBlankChange={onCompositeFillBlankChange}
              onCompositeTextChange={onCompositeTextChange}
              onRevealCompositeQuestion={onRevealCompositeQuestion}
              onFillBlankChange={onFillBlankChange}
              onTextChange={onTextChange}
            />
          )}

          {currentExplainEntry && <AiExplainPanel entry={currentExplainEntry} />}
          {currentQuestionReview && <AiQuestionReviewPanel review={currentQuestionReview} />}

          <div className="question-actions">
            <button type="button" className="secondary-btn" onClick={onPrev} disabled={currentIndex <= 0}>
              上一题
            </button>
            <button
              type="button"
              className="secondary-btn"
              onClick={onNext}
              disabled={currentIndex >= quiz.items.length - 1}
            >
              下一题
            </button>
          </div>
        </section>

        <div className="quiz-submit-row">
          <button type="button" className="primary-btn" onClick={onSubmit}>
            {mode === 'practice' ? 'Submit practice' : 'Submit exam'}
          </button>
        </div>
      </main>

      <QuizAiPracticeModal modal={aiPracticeModal} onClose={onCloseAiPracticeModal} />
    </div>
  )
}
