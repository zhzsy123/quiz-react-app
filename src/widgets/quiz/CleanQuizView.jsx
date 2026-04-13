import React from 'react'
import { LoaderCircle, Sparkles, XCircle } from 'lucide-react'
import { isObjectiveAnswered } from '../../entities/quiz/lib/objectiveAnswers'
import { MANUAL_JUDGE_CORRECT, resolvePracticeJudge } from '../../entities/quiz/lib/practiceJudging.js'
import QuizNavigationSidebar from './QuizNavigationSidebar.jsx'
import QuizObjectiveBlock from './QuizObjectiveBlock.jsx'
import QuizSubjectiveBlock from './QuizSubjectiveBlock.jsx'
import QuizAiToolbar from './QuizAiToolbar.jsx'
import { AiExplainPanel, AiQuestionReviewPanel } from './QuizAiPanels.jsx'
import QuizAiPracticeModal from './QuizAiPracticeModal.jsx'
import {
  buildFillBlankSlotHints,
  difficultyClass,
  formatDisplayScore,
  getItemDisplayScore,
  getQuestionDisplayMeta,
} from './quizViewUtils.jsx'

function getCurrentItem(quiz, currentIndex) {
  if (!quiz?.items?.length) return null
  return quiz.items[Math.max(0, Math.min(currentIndex || 0, quiz.items.length - 1))]
}

function getFocusedSubQuestion(item, focusId = '') {
  if (!item) return null
  const normalizedFocusId = String(focusId || '')

  if (item.type === 'reading' || item.type === 'composite') {
    const questions = Array.isArray(item.questions) ? item.questions : []
    return questions.find((question) => String(question.id) === normalizedFocusId) || questions[0] || null
  }

  if (item.type === 'relational_algebra') {
    const subquestions = Array.isArray(item.subquestions) ? item.subquestions : []
    return subquestions.find((question) => String(question.id) === normalizedFocusId) || subquestions[0] || null
  }

  return null
}

function getCurrentExplainEntry(currentItem, currentNestedTarget, aiExplainMap) {
  if (!currentItem) return null
  const key = currentNestedTarget ? `${currentItem.id}:${currentNestedTarget.id}` : currentItem.id
  return aiExplainMap?.[key] || null
}

function getCurrentAuditEntry(currentItem, currentNestedTarget, aiAuditMap) {
  if (!currentItem) return null
  const key = currentNestedTarget ? `${currentItem.id}:${currentNestedTarget.id}` : currentItem.id
  return aiAuditMap?.[key] || null
}

function getCurrentQuestionReview(currentItem, currentNestedTarget, aiQuestionReviewMap) {
  if (!currentItem) return null
  if (currentNestedTarget && aiQuestionReviewMap?.[`${currentItem.id}:${currentNestedTarget.id}`]) {
    return aiQuestionReviewMap[`${currentItem.id}:${currentNestedTarget.id}`]
  }
  if (currentNestedTarget && aiQuestionReviewMap?.[currentNestedTarget.id]) {
    return aiQuestionReviewMap[currentNestedTarget.id]
  }
  return aiQuestionReviewMap?.[currentItem.id] || null
}

function getCurrentJudgeResponse(currentItem, currentNestedTarget, answers = {}) {
  if (!currentItem) return undefined

  if (currentNestedTarget && currentItem.type === 'relational_algebra') {
    return answers[currentItem.id]?.responses?.[currentNestedTarget.id]
  }

  if (currentNestedTarget && (currentItem.type === 'reading' || currentItem.type === 'composite')) {
    return answers[currentItem.id]?.[currentNestedTarget.id]
  }

  return answers[currentItem.id]
}

function InvalidQuizFallback() {
  return (
    <div className="quiz-layout">
      <main className="question-list">
        <section className="question-card current">
          <div className="analysis-box">
            <div>当前试卷没有可渲染的题目，请返回题库重新导入或重新生成。</div>
          </div>
        </section>
      </main>
    </div>
  )
}

function GenerationPlaceholderBlock({ item }) {
  const placeholder = item?.generation_placeholder || {}
  const status = placeholder.status || 'queued'
  const isFailed = status === 'failed'

  return (
    <div className={`generation-placeholder-panel ${isFailed ? 'failed' : status}`}>
      <div className="generation-placeholder-head">
        <span className={`generation-placeholder-pill ${isFailed ? 'failed' : 'running'}`}>
          {isFailed ? <XCircle size={14} /> : <LoaderCircle size={14} className="spin" />}
          {isFailed ? '生成失败' : 'AI 正在生成本题'}
        </span>
        <span className="generation-placeholder-meta">
          {placeholder.label || item?.generation_type_key || '题目'} · {formatDisplayScore(placeholder.score || 0)} 分
        </span>
      </div>
      <div className="generation-placeholder-summary">
        {placeholder.summary || '系统正在后台生成本题，请稍候。'}
      </div>
      {Array.isArray(placeholder.details) && placeholder.details.length > 0 ? (
        <ul className="generation-placeholder-details">
          {placeholder.details.map((detail, index) => (
            <li key={`${item.id}-detail-${index}`}>{detail}</li>
          ))}
        </ul>
      ) : null}
      {!isFailed ? (
        <div className="generation-placeholder-note">
          <Sparkles size={14} />
          左侧导航中的转圈题目会在生成完成后自动替换成可作答内容。
        </div>
      ) : null}
    </div>
  )
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
  relationalAlgebraExpandedMap = {},
  subQuestionFocusMap = {},
  manualJudgeMap = {},
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
  onSelectClozeOption,
  onFillBlankChange,
  onTextChange,
  aiReview,
  aiQuestionReviewMap,
  aiExplainMap,
  aiAuditMap,
  aiExplainMode,
  aiPracticeModal,
  onChangeAiExplainMode,
  onExplainQuestion,
  onAuditQuestion,
  onExplainWhyWrong,
  onGenerateSimilarQuestions,
  onCloseAiPracticeModal,
  onSubmit,
  onSelectCompositeOption,
  onCompositeFillBlankChange,
  onCompositeTextChange,
  onRevealCompositeQuestion,
  onRelationalAlgebraTextChange,
  onToggleRelationalAlgebraSubQuestion,
  onRevealRelationalAlgebraQuestion,
  onFocusSubQuestion,
  onSetManualJudge,
}) {
  const currentItem = getCurrentItem(quiz, currentIndex)

  if (!quiz?.items?.length || !currentItem) {
    return <InvalidQuizFallback />
  }

  const currentNestedTarget = getFocusedSubQuestion(currentItem, subQuestionFocusMap?.[currentItem.id] || '')
  const currentExplainEntry = getCurrentExplainEntry(currentItem, currentNestedTarget, aiExplainMap)
  const currentAuditEntry = getCurrentAuditEntry(currentItem, currentNestedTarget, aiAuditMap)
  const currentQuestionReview = getCurrentQuestionReview(currentItem, currentNestedTarget, aiQuestionReviewMap)
  const currentJudgeState =
    mode === 'practice' && currentItem.type !== 'generation_placeholder'
      ? resolvePracticeJudge({
          manualJudgeMap,
          item: currentItem,
          response: getCurrentJudgeResponse(currentItem, currentNestedTarget, answers),
          subQuestion: currentNestedTarget,
          questionReview: currentQuestionReview,
        })
      : null
  const currentItemScore = getItemDisplayScore(currentItem)
  const currentQuestionTypeMeta =
    currentItem.type !== 'generation_placeholder' ? getQuestionDisplayMeta(currentItem) : null
  const fillBlankSlotHints = buildFillBlankSlotHints(currentItem)
  const hasPendingGeneration = quiz.items.some((item) => item.type === 'generation_placeholder')
  const prompt =
    currentItem.type === 'generation_placeholder'
      ? currentItem.prompt || 'AI 正在生成题目'
      : currentItem.prompt || currentItem.passage?.title || currentItem.title || '未命名题目'

  const renderObjectiveBlock =
    currentItem.type !== 'generation_placeholder' &&
    currentItem.type !== 'cloze' &&
    currentItem.type !== 'reading' &&
    currentItem.type !== 'composite' &&
    (currentItem.answer?.type === 'objective' || currentItem.type === 'fill_blank')

  const showBottomRevealAction =
    currentItem.type === 'fill_blank' &&
    mode === 'practice' &&
    !submitted &&
    !Boolean(revealedMap[currentItem.id]) &&
    isObjectiveAnswered(currentItem, answers[currentItem.id])

  const showPracticeJudgePanel =
    mode === 'practice' &&
    !submitted &&
    currentItem.type !== 'generation_placeholder' &&
    Boolean(currentJudgeState?.answered) &&
    typeof onSetManualJudge === 'function'

  const showPracticeJudgeToggle =
    showPracticeJudgePanel &&
    (currentJudgeState?.isWrong ||
      currentJudgeState?.manualVerdict === MANUAL_JUDGE_CORRECT ||
      currentJudgeState?.manualVerdict === 'wrong')

  const toolbarDisabled = isPaused || currentItem.type === 'generation_placeholder'

  return (
    <div className="quiz-layout">
      <QuizNavigationSidebar
        quizItems={quiz.items}
        currentItem={currentItem}
        currentIndex={currentIndex}
        answers={answers}
        subQuestionFocusMap={subQuestionFocusMap}
        revealedMap={revealedMap}
        manualJudgeMap={manualJudgeMap}
        mode={mode}
        submitted={submitted}
        isPaused={isPaused}
        remainingSeconds={remainingSeconds}
        autoAdvance={autoAdvance}
        practiceWritesWrongBook={practiceWritesWrongBook}
        examWritesWrongBook={examWritesWrongBook}
        aiQuestionReviewMap={aiQuestionReviewMap}
        onTogglePause={onTogglePause}
        onToggleAutoAdvance={onToggleAutoAdvance}
        onTogglePracticeWrongBook={onTogglePracticeWrongBook}
        onToggleExamWrongBook={onToggleExamWrongBook}
        onJump={onJump}
        onFocusSubQuestion={onFocusSubQuestion}
      />

      <main className="question-list">
        <section className="question-card current">
          <div className="question-top">
            <div>
              <div className="question-meta">
                <span className="tag blue">第 {currentIndex + 1} 题</span>
                <span className="tag score">{formatDisplayScore(currentItemScore)} 分</span>
                {currentQuestionTypeMeta ? (
                  <span className="tag purple" title={currentQuestionTypeMeta.label}>
                    {currentQuestionTypeMeta.shortLabel}
                  </span>
                ) : null}
                {currentQuestionTypeMeta?.gradingLabel ? (
                  <span className="tag" title={currentQuestionTypeMeta.gradingLabel}>
                    {currentQuestionTypeMeta.gradingLabel}
                  </span>
                ) : null}
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
          {fillBlankSlotHints.length > 0 ? (
            <div className="fill-blank-slot-hints">
              <span className="fill-blank-slot-hints-label">空位顺序</span>
              <div className="fill-blank-slot-hints-list">
                {fillBlankSlotHints.map((slot) => (
                  <span key={`${currentItem.id}-${slot.blankId}`} className="fill-blank-slot-pill">
                    {slot.label}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {currentItem.type !== 'generation_placeholder' && (
            <QuizAiToolbar
              currentItem={currentItem}
              currentExplainEntry={currentExplainEntry}
              currentAuditEntry={currentAuditEntry}
              practiceJudgeState={showPracticeJudgeToggle ? currentJudgeState : null}
              onExplainQuestion={() => onExplainQuestion({ item: currentItem, subQuestion: currentNestedTarget })}
              onAuditQuestion={() => onAuditQuestion?.({ item: currentItem, subQuestion: currentNestedTarget })}
              onTogglePracticeCorrect={
                showPracticeJudgeToggle
                  ? () =>
                      onSetManualJudge(
                        currentItem.id,
                        currentJudgeState?.manualVerdict === MANUAL_JUDGE_CORRECT ? null : MANUAL_JUDGE_CORRECT,
                        currentNestedTarget?.id || ''
                      )
                  : null
              }
              disabled={toolbarDisabled}
            />
          )}

          {currentItem.type === 'generation_placeholder' ? (
            <GenerationPlaceholderBlock item={currentItem} />
          ) : renderObjectiveBlock ? (
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
              suppressInlineRevealAction={showBottomRevealAction}
            />
          ) : (
            <QuizSubjectiveBlock
              item={currentItem}
              response={answers[currentItem.id]}
              submitted={submitted}
              isPaused={isPaused}
              mode={mode}
              revealedMap={revealedMap}
              relationalAlgebraExpandedMap={relationalAlgebraExpandedMap?.[currentItem.id] || {}}
              aiQuestionReviewMap={aiQuestionReviewMap}
              aiExplainMap={aiExplainMap}
              aiAuditMap={aiAuditMap}
              focusSubQuestionId={subQuestionFocusMap?.[currentItem.id] || ''}
              onFocusSubQuestion={(subQuestionId) => onFocusSubQuestion?.(currentItem.id, subQuestionId)}
              onSelectReadingOption={onSelectReadingOption}
              onSelectClozeOption={onSelectClozeOption}
              onRevealCurrentObjective={onRevealCurrentObjective}
              onExplainQuestion={onExplainQuestion}
              onAuditQuestion={onAuditQuestion}
              onSelectCompositeOption={onSelectCompositeOption}
              onCompositeFillBlankChange={onCompositeFillBlankChange}
              onCompositeTextChange={onCompositeTextChange}
              onRevealCompositeQuestion={onRevealCompositeQuestion}
              onRelationalAlgebraTextChange={onRelationalAlgebraTextChange}
              onToggleRelationalAlgebraSubQuestion={onToggleRelationalAlgebraSubQuestion}
              onRevealRelationalAlgebraQuestion={onRevealRelationalAlgebraQuestion}
              onFillBlankChange={onFillBlankChange}
              onTextChange={onTextChange}
            />
          )}

          {currentExplainEntry ? <AiExplainPanel entry={currentExplainEntry} /> : null}
          {currentAuditEntry ? <AiExplainPanel entry={currentAuditEntry} /> : null}
          {currentQuestionReview ? <AiQuestionReviewPanel review={currentQuestionReview} /> : null}

          <div className={`question-actions ${showBottomRevealAction ? 'with-center-action' : ''}`}>
            <button type="button" className="secondary-btn" onClick={onPrev} disabled={currentIndex <= 0}>
              上一题
            </button>
            {showBottomRevealAction ? (
              <button type="button" className="secondary-btn question-action-center" onClick={onRevealCurrentObjective}>
                检查答案
              </button>
            ) : null}
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
      </main>

      <QuizAiPracticeModal modal={aiPracticeModal} onClose={onCloseAiPracticeModal} />
    </div>
  )
}
