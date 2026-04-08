import React from 'react'
import { Bot, LoaderCircle } from 'lucide-react'

export default function QuizAiToolbar({
  currentItem,
  currentExplainEntry,
  mode,
  showPracticeAiToolbar,
  showExamAuditToolbar,
  showWrongFollowups,
  aiExplainMode,
  onChangeAiExplainMode,
  onExplainQuestion,
  onExplainWhyWrong,
  onGenerateSimilarQuestions,
  disabled,
}) {
  if (!currentItem || (!showPracticeAiToolbar && !showExamAuditToolbar)) return null

  return (
    <div className="ai-toolbar">
      <div className="ai-mode-switch" style={{ display: showPracticeAiToolbar ? undefined : 'none' }}>
        {[
          { key: 'brief', label: '简略' },
          { key: 'standard', label: '标准' },
          { key: 'deep', label: '深入' },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            className={`ai-mode-chip ${aiExplainMode === item.key ? 'active' : ''}`}
            onClick={() => onChangeAiExplainMode?.(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="ai-action-row">
        <button
          type="button"
          className="secondary-btn small-btn ai-inline-btn ai-dynamic-label"
          data-ai-label={
            mode === 'exam'
              ? currentExplainEntry?.status === 'pending'
                ? 'AI 审核中'
                : 'AI 审核'
              : currentExplainEntry?.status === 'pending'
                ? 'AI 解析中'
                : 'AI 解析'
          }
          onClick={() => onExplainQuestion({ item: currentItem })}
          disabled={disabled || currentExplainEntry?.status === 'pending'}
        >
          {currentExplainEntry?.status === 'pending' ? <LoaderCircle size={14} className="spin" /> : <Bot size={14} />}
          {currentExplainEntry?.status === 'pending' ? 'AI 解析中' : 'AI 解析'}
        </button>

        {showPracticeAiToolbar && showWrongFollowups && (
          <>
            <button
              type="button"
              className="secondary-btn small-btn ai-inline-btn"
              onClick={() => onExplainWhyWrong?.({ item: currentItem })}
              disabled={disabled || currentExplainEntry?.status === 'pending'}
            >
              错因分析
            </button>
            <button
              type="button"
              className="secondary-btn small-btn ai-inline-btn"
              onClick={() => onGenerateSimilarQuestions?.({ item: currentItem })}
              disabled={disabled}
            >
              同类练习
            </button>
          </>
        )}
      </div>
    </div>
  )
}
