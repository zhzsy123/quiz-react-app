import React, { useEffect, useState } from 'react'
import { CheckCircle2, LoaderCircle, XCircle } from 'lucide-react'

export default function QuizAiPracticeModal({ modal, onClose }) {
  const [selectedMap, setSelectedMap] = useState({})
  const [revealedMap, setRevealedMap] = useState({})

  useEffect(() => {
    setSelectedMap({})
    setRevealedMap({})
  }, [modal?.requestedAt, modal?.title])

  if (!modal) return null

  const optionKey = (option = '', index = 0) => {
    const text = String(option || '')
    const matched = text.match(/^\s*([A-Z])[\.\)]/)
    return matched ? matched[1] : String.fromCharCode(65 + index)
  }

  return (
    <div className="ai-modal-backdrop" onClick={onClose}>
      <div className="ai-modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="ai-modal-head">
          <strong>{modal.title || 'AI 同类题'}</strong>
          <button type="button" className="ai-panel-toggle" onClick={onClose}>关闭</button>
        </div>

        {modal.status === 'pending' && (
          <div className="ai-loading-row">
            <LoaderCircle size={18} className="spin" />
            AI 正在生成同类题...
          </div>
        )}

        {modal.status === 'failed' && (
          <div className="ai-panel-status">生成失败：{modal.error || '请稍后再试'}</div>
        )}

        {modal.status === 'completed' && (
          <div className="ai-similar-list">
            {(modal.questions || []).map((question, index) => {
              const revealed = Boolean(revealedMap[index])
              const selected = selectedMap[index]
              const correctAnswer = String(question.answer || '').trim().toUpperCase()

              return (
                <article key={`${question.index || index}`} className="ai-similar-card">
                  <div className="ai-similar-head">
                    <span className="tag blue">题 {index + 1}</span>
                    <span className="tag">{question.difficulty || 'progressive'}</span>
                  </div>
                  <div className="ai-similar-prompt">{question.prompt}</div>

                  {Array.isArray(question.options) && question.options.length > 0 && (
                    <div className="ai-similar-options">
                      {question.options.map((option, optionIndex) => {
                        const currentKey = optionKey(option, optionIndex)
                        const isSelected = selected === currentKey
                        const isCorrect = currentKey === correctAnswer

                        let className = 'option compact-option'
                        let icon = null

                        if (!revealed) {
                          if (isSelected) className += ' selected'
                        } else if (isCorrect) {
                          className += ' correct'
                          icon = <CheckCircle2 size={16} />
                        } else if (isSelected) {
                          className += ' wrong'
                          icon = <XCircle size={16} />
                        } else {
                          className += ' muted'
                        }

                        return (
                          <button
                            key={`${index}-${optionIndex}`}
                            type="button"
                            className={className}
                            onClick={() => {
                              if (revealed) return
                              setSelectedMap((prev) => ({ ...prev, [index]: currentKey }))
                            }}
                          >
                            <span>{option}</span>
                            {icon}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {!revealed ? (
                    <div className="question-inline-actions">
                      <button
                        type="button"
                        className="secondary-btn small-btn"
                        disabled={!selected}
                        onClick={() => setRevealedMap((prev) => ({ ...prev, [index]: true }))}
                      >
                        检查答案
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="ai-panel-row">
                        <strong>结果</strong>
                        <span>{selected === correctAnswer ? '回答正确' : '回答错误'}</span>
                      </div>
                      <div className="ai-panel-row"><strong>正确答案</strong><span>{question.answer || '--'}</span></div>
                      <div className="ai-panel-row"><strong>解析</strong><span>{question.explanation || '--'}</span></div>
                    </>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
