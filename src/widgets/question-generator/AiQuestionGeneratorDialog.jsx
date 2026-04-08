import React from 'react'
import { Sparkles, X } from 'lucide-react'
import GeneratedQuestionList from './GeneratedQuestionList.jsx'

const DIFFICULTY_OPTIONS = [
  { key: 'easy', label: '简单' },
  { key: 'medium', label: '中等' },
  { key: 'hard', label: '困难' },
  { key: 'mixed', label: '混合' },
]

const MODE_OPTIONS = [
  { key: 'practice', label: '练习题' },
  { key: 'mock_exam', label: '模拟卷' },
]

function updateQuestionTypeList(current = [], typeKey) {
  return current.includes(typeKey) ? current.filter((item) => item !== typeKey) : [...current, typeKey]
}

export default function AiQuestionGeneratorDialog({
  open,
  subjectMeta,
  config,
  status,
  error,
  summary,
  draftQuestions,
  onClose,
  onConfigChange,
  onStartGeneration,
  onStopGeneration,
  onResetGenerator,
  onSaveGeneratedPaper,
  onStartPracticeWithGeneratedPaper,
  onRemoveQuestion,
}) {
  if (!open) return null

  const generation = subjectMeta?.generation || {}
  const questionTypeOptions = subjectMeta?.questionTypeOptions || []
  const canStart = status !== 'generating'
  const canPersist = (summary?.valid || 0) + (summary?.warning || 0) > 0 && status !== 'saving'

  return (
    <div className="ai-modal-backdrop" onClick={onClose}>
      <div className="ai-modal-card generator-dialog-card" onClick={(event) => event.stopPropagation()}>
        <div className="ai-modal-head">
          <div className="download-dialog-copy">
            <span className="dashboard-eyebrow">AI Generator</span>
            <h3>{subjectMeta?.shortLabel || '当前科目'} AI 生成题目</h3>
            <p>按当前科目的协议流式生成题目，逐题校验后再保存到题库或直接开始练习。</p>
          </div>

          <button type="button" className="secondary-btn small-btn" onClick={onClose} aria-label="关闭生成器">
            <X size={16} />
            关闭
          </button>
        </div>

        <div className="generator-layout">
          <section className="generator-config-panel">
            <div className="generator-config-grid">
              <label className="form-field">
                <span>生成模式</span>
                <select value={config.mode || generation.supportedModes?.[0] || 'practice'} onChange={(event) => onConfigChange({ mode: event.target.value })}>
                  {MODE_OPTIONS.filter((item) => !generation.supportedModes || generation.supportedModes.includes(item.key)).map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-field">
                <span>难度</span>
                <select value={config.difficulty || generation.defaultDifficulty || 'medium'} onChange={(event) => onConfigChange({ difficulty: event.target.value })}>
                  {DIFFICULTY_OPTIONS.map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-field">
                <span>题量</span>
                <select value={String(config.count || generation.defaultCounts?.[0] || 5)} onChange={(event) => onConfigChange({ count: Number(event.target.value) })}>
                  {(generation.defaultCounts || [5, 10, 20]).map((count) => (
                    <option key={count} value={count}>
                      {count} 题
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="generator-type-panel">
              <span className="generator-section-title">题型选择</span>
              <div className="generator-chip-list">
                {questionTypeOptions.map((item) => {
                  const active = (config.questionTypes || []).includes(item.key)
                  return (
                    <button
                      key={item.key}
                      type="button"
                      className={`generator-type-chip ${active ? 'active' : ''}`}
                      onClick={() =>
                        onConfigChange({
                          questionTypes: updateQuestionTypeList(config.questionTypes || [], item.key),
                        })
                      }
                    >
                      {item.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <label className="form-field grow">
              <span>附加提示词</span>
              <textarea
                className="subjective-textarea generator-extra-prompt"
                rows={4}
                value={config.extraPrompt || ''}
                onChange={(event) => onConfigChange({ extraPrompt: event.target.value })}
                placeholder="例如：偏重堆排序、折半查找判定树、国际贸易术语辨析等"
              />
            </label>

            <div className="generator-summary-row">
              <span>状态：{status}</span>
              <span>通过：{summary?.valid || 0}</span>
              <span>警告：{summary?.warning || 0}</span>
              <span>无效：{summary?.invalid || 0}</span>
            </div>

            {error ? <div className="status error">{error}</div> : null}
          </section>

          <section className="generator-results-panel">
            <div className="generator-results-head">
              <span className="generator-section-title">流式生成结果</span>
            </div>
            <GeneratedQuestionList draftQuestions={draftQuestions} onRemoveQuestion={onRemoveQuestion} />
          </section>
        </div>

        <div className="generator-actions">
          <button type="button" className="primary-btn" onClick={onStartGeneration} disabled={!canStart}>
            <Sparkles size={16} />
            开始生成
          </button>
          <button type="button" className="secondary-btn" onClick={onStopGeneration} disabled={status !== 'generating'}>
            停止生成
          </button>
          <button type="button" className="secondary-btn" onClick={onResetGenerator}>
            清空结果
          </button>
          <button type="button" className="secondary-btn" onClick={onSaveGeneratedPaper} disabled={!canPersist}>
            保存到题库
          </button>
          <button type="button" className="primary-btn" onClick={onStartPracticeWithGeneratedPaper} disabled={!canPersist}>
            立即开始练习
          </button>
        </div>
      </div>
    </div>
  )
}
