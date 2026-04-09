import React from 'react'
import { ArrowLeft, Clock3, Home, Pause, Play, RefreshCw, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import CleanQuizView from '../widgets/quiz/CleanQuizView'
import { useSubjectWorkspaceState } from '../features/workspace/model/useSubjectWorkspaceState'

export default function SubjectWorkspacePage() {
  const {
    loading,
    loadError,
    entry,
    quiz,
    mode,
    subjectMeta,
    answers,
    relationalAlgebraExpandedMap,
    revealedMap,
    submitted,
    score,
    aiReview,
    aiQuestionReviewMap,
    aiExplainMap,
    aiExplainMode,
    aiPracticeModal,
    currentIndex,
    autoAdvance,
    practiceWritesWrongBook,
    examWritesWrongBook,
    spoilerExpanded,
    remainingSeconds,
    remainingTimeLabel,
    isPaused,
    practiceAccuracy,
    objectiveTotalScore,
    paperTotalScore,
    subjectivePendingScore,
    isCurrentFavorite,
    backLink,
    handleToggleFavorite,
    handleToggleSpoiler,
    handleToggleAutoAdvance,
    handleTogglePracticeWrongBook,
    handleToggleExamWrongBook,
    handleTogglePause,
    handleJump,
    handlePrev,
    handleNext,
    handleSelectOption,
    handleSelectCompositeOption,
    handleRevealCurrentObjective,
    handleRevealCompositeQuestion,
    handleSelectReadingOption,
    handleSelectClozeOption,
    handleFillBlankChange,
    handleCompositeFillBlankChange,
    handleRelationalAlgebraTextChange,
    handleToggleRelationalAlgebraSubQuestion,
    handleRevealRelationalAlgebraQuestion,
    handleTextChange,
    handleCompositeTextChange,
    handleReset,
    handleChangeAiExplainMode,
    handleExplainQuestionWithMode,
    handleExplainWhyWrong,
    handleGenerateSimilarQuestions,
    handleCloseAiPracticeModal,
    handleFinish,
  } = useSubjectWorkspaceState()

  if (loading) {
    return (
      <div className="app-shell">
        <div className="container">
          <section className="hero-card">
            <h1>加载中...</h1>
          </section>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="app-shell">
        <div className="container">
          <section className="hero-card workspace-empty-state">
            <h1>试卷加载失败</h1>
            <p>{loadError}</p>
            <div className="workspace-header-actions">
              <Link className="secondary-btn small-btn" to="/">
                <Home size={14} />
                返回首页
              </Link>
              <Link className="secondary-btn small-btn" to={backLink}>
                <ArrowLeft size={14} />
                返回
              </Link>
            </div>
          </section>
        </div>
      </div>
    )
  }

  if (!entry || !quiz) {
    return (
      <div className="app-shell">
        <div className="container">
          <section className="hero-card workspace-empty-state">
            <h1>未找到可用内容</h1>
            <div className="workspace-header-actions">
              <Link className="secondary-btn small-btn" to="/">
                <Home size={14} />
                返回首页
              </Link>
              <Link className="secondary-btn small-btn" to={backLink}>
                <ArrowLeft size={14} />
                返回
              </Link>
            </div>
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <div className="container clean-workspace-page">
        <section className="clean-workspace-header">
          <div className="workspace-header-main">
            <div className="workspace-title">{entry.title}</div>
            <div className="workspace-mode-row">
              <span className="tag blue">{subjectMeta.shortLabel}</span>
              <span className="tag blue">{mode === 'practice' ? '刷题模式' : '考试模式'}</span>
              {mode === 'practice' && (
                <span className="accuracy-chip">
                  <Star size={14} />
                  正确率 {practiceAccuracy.rate}%
                </span>
              )}
              {mode === 'exam' && (
                <span className={`timer-chip ${remainingSeconds <= 300 ? 'danger' : ''}`}>
                  <Clock3 size={14} />
                  {remainingTimeLabel}
                </span>
              )}
            </div>
          </div>

          <div className="workspace-header-actions">
            {mode === 'exam' && (
              <button className="secondary-btn small-btn" onClick={handleTogglePause} disabled={submitted}>
                {isPaused ? <Play size={14} /> : <Pause size={14} />}
                {isPaused ? '继续' : '暂停'}
              </button>
            )}
            <button className="secondary-btn small-btn" onClick={handleReset}>
              <RefreshCw size={14} />
              重置
            </button>
            <Link className="secondary-btn small-btn" to={backLink}>
              <ArrowLeft size={14} />
              返回
            </Link>
            <Link className="secondary-btn small-btn" to="/">
              <Home size={14} />
              返回首页
            </Link>
          </div>
        </section>

        {submitted && (
          <section className="score-card compact-score-card">
            <div className="score-hero">
              <div className="score-hero-label">试卷总分</div>
              <div className="score-hero-value">
                {aiReview?.status === 'completed' ? aiReview.totalScore : score}
                <span>/ {paperTotalScore}</span>
              </div>
            </div>

            <div className="score-subgrid">
              <article className="score-subcard">
                <div className="score-subtitle">客观题得分</div>
                <div className="score-subvalue">
                  {score}
                  <span>/ {objectiveTotalScore}</span>
                </div>
              </article>
              <article className="score-subcard">
                <div className="score-subtitle">主观题</div>
                <div className="score-subvalue">
                  {aiReview?.status === 'completed' ? aiReview.totalSubjectiveScore : 0}
                  <span>/ {subjectivePendingScore}</span>
                </div>
              </article>
            </div>

            {subjectivePendingScore > 0 && (
              <div className="analysis-box score-ai-summary">
                <div>
                  <strong>AI 批改状态：</strong>
                  {aiReview?.status === 'pending'
                    ? '批改中'
                    : aiReview?.status === 'completed'
                      ? '已完成'
                      : aiReview?.status === 'failed'
                        ? '失败'
                        : '未开始'}
                </div>
                {aiReview?.status === 'completed' && (
                  <>
                    {aiReview.overallComment && (
                      <div>
                        <strong>总体点评：</strong>
                        {aiReview.overallComment}
                      </div>
                    )}
                    {Array.isArray(aiReview.weaknessSummary) && aiReview.weaknessSummary.length > 0 && (
                      <div>
                        <strong>薄弱项：</strong>
                        {aiReview.weaknessSummary.join(' / ')}
                      </div>
                    )}
                  </>
                )}
                {aiReview?.status === 'failed' && (
                  <div>
                    <strong>失败原因：</strong>
                    {aiReview.error || 'AI 批改失败'}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        <CleanQuizView
          quiz={quiz}
          answers={answers}
          relationalAlgebraExpandedMap={relationalAlgebraExpandedMap}
          submitted={submitted}
          currentIndex={currentIndex}
          mode={mode}
          autoAdvance={autoAdvance}
          remainingSeconds={remainingSeconds}
          isPaused={isPaused}
          spoilerExpanded={spoilerExpanded}
          revealedMap={revealedMap}
          isFavorite={isCurrentFavorite}
          onToggleFavorite={handleToggleFavorite}
          onToggleSpoiler={handleToggleSpoiler}
          onToggleAutoAdvance={handleToggleAutoAdvance}
          onTogglePracticeWrongBook={handleTogglePracticeWrongBook}
          onToggleExamWrongBook={handleToggleExamWrongBook}
          onTogglePause={handleTogglePause}
          practiceWritesWrongBook={practiceWritesWrongBook}
          examWritesWrongBook={examWritesWrongBook}
          onJump={handleJump}
          onPrev={handlePrev}
          onNext={handleNext}
          onSelectOption={handleSelectOption}
          onSelectCompositeOption={handleSelectCompositeOption}
          onRevealCurrentObjective={handleRevealCurrentObjective}
          onRevealCompositeQuestion={handleRevealCompositeQuestion}
          onSelectReadingOption={handleSelectReadingOption}
          onSelectClozeOption={handleSelectClozeOption}
          onFillBlankChange={handleFillBlankChange}
          onCompositeFillBlankChange={handleCompositeFillBlankChange}
          onRelationalAlgebraTextChange={handleRelationalAlgebraTextChange}
          onToggleRelationalAlgebraSubQuestion={handleToggleRelationalAlgebraSubQuestion}
          onRevealRelationalAlgebraQuestion={handleRevealRelationalAlgebraQuestion}
          onTextChange={handleTextChange}
          onCompositeTextChange={handleCompositeTextChange}
          aiReview={aiReview}
          aiQuestionReviewMap={aiQuestionReviewMap}
          aiExplainMap={aiExplainMap}
          aiExplainMode={aiExplainMode}
          aiPracticeModal={aiPracticeModal}
          onChangeAiExplainMode={handleChangeAiExplainMode}
          onExplainQuestion={handleExplainQuestionWithMode}
          onExplainWhyWrong={handleExplainWhyWrong}
          onGenerateSimilarQuestions={handleGenerateSimilarQuestions}
          onCloseAiPracticeModal={handleCloseAiPracticeModal}
          onSubmit={handleFinish}
        />
      </div>
    </div>
  )
}
