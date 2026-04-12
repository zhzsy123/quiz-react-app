import React, { useState } from 'react'
import { Bot, CheckCircle2, LoaderCircle } from 'lucide-react'

export default function QuizAiToolbar({
  currentItem,
  currentExplainEntry,
  currentAuditEntry,
  practiceJudgeState,
  onExplainQuestion,
  onAuditQuestion,
  onTogglePracticeCorrect,
  disabled,
}) {
  if (!currentItem) return null

  const explainPending = currentExplainEntry?.status === 'pending'
  const auditPending = currentAuditEntry?.status === 'pending'
  const practiceJudgeOverridden = practiceJudgeState?.manualVerdict === 'correct'
  const [restoreHover, setRestoreHover] = useState(false)

  const practiceJudgeLabel = practiceJudgeOverridden
    ? restoreHover
      ? '恢复判定'
      : '已记为答对'
    : '改成答对'

  return (
    <div className="ai-toolbar">
      <div className="ai-action-row">
        <button
          type="button"
          className="secondary-btn small-btn ai-inline-btn"
          onClick={onExplainQuestion}
          disabled={disabled || explainPending}
        >
          {explainPending ? <LoaderCircle size={14} className="spin" /> : <Bot size={14} />}
          {explainPending ? 'AI解释中' : 'AI解释'}
        </button>
        <button
          type="button"
          className="secondary-btn small-btn ai-inline-btn"
          onClick={onAuditQuestion}
          disabled={disabled || auditPending}
        >
          {auditPending ? <LoaderCircle size={14} className="spin" /> : <CheckCircle2 size={14} />}
          {auditPending ? 'AI核题中' : 'AI核题'}
        </button>
        {practiceJudgeState && typeof onTogglePracticeCorrect === 'function' ? (
          <button
            type="button"
            className={`secondary-btn small-btn ai-inline-btn ai-practice-judge-btn ${practiceJudgeOverridden ? 'active' : ''}`}
            onClick={onTogglePracticeCorrect}
            disabled={disabled}
            title={practiceJudgeOverridden ? '恢复系统判定' : '将本题记为答对'}
            onMouseEnter={() => setRestoreHover(true)}
            onMouseLeave={() => setRestoreHover(false)}
          >
            <CheckCircle2 size={14} />
            {practiceJudgeLabel}
          </button>
        ) : null}
      </div>
    </div>
  )
}
