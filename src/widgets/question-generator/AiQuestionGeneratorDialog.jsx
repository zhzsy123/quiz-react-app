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

function parsePositiveNumber(value, fallback = 1) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function updateQuestionTypeSelection(config = {}, typeOption) {
  const currentTypes = Array.isArray(config.questionTypes) ? config.questionTypes : []
  const nextTypes = currentTypes.includes(typeOption.key)
    ? currentTypes.filter((item) => item !== typeOption.key)
    : [...currentTypes, typeOption.key]

  const nextPlan = { ...(config.questionPlan || {}) }
  if (nextTypes.includes(typeOption.key)) {
    nextPlan[typeOption.key] = nextPlan[typeOption.key] || {
      count: typeOption.mockExamDefaultCount || 1,
      score: typeOption.mockExamDefaultScore || 1,
    }
  } else {
    delete nextPlan[typeOption.key]
  }

  return {
    questionTypes: nextTypes,
    questionPlan: nextPlan,
  }
}

function updateQuestionPlan(config = {}, typeKey, field, value) {
  const currentPlan = config.questionPlan || {}
  const currentEntry = currentPlan[typeKey] || { count: 1, score: 1 }
  return {
    questionPlan: {
      ...currentPlan,
      [typeKey]: {
        ...currentEntry,
        [field]: parsePositiveNumber(value, currentEntry[field] || 1),
      },
    },
  }
}

function getPlanSummary(config = {}) {
  return Object.entries(config.questionPlan || {}).reduce(
    (summary, [typeKey, item]) => {
      if (!(config.questionTypes || []).includes(typeKey)) return summary
      const count = parsePositiveNumber(item?.count, 1)
      const score = parsePositiveNumber(item?.score, 1)
      summary.count += count
      summary.totalScore += count * score
      return summary
    },
    { count: 0, totalScore: 0 }
  )
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
  const selectedTypeKeys = Array.isArray(config.questionTypes) ? config.questionTypes : []
  const planSummary = getPlanSummary(config)
  const canStart = status !== 'generating' && selectedTypeKeys.length > 0
  const canPersist = (summary?.valid || 0) + (summary?.warning || 0) > 0 && status !== 'saving'

  return (
    <div className="ai-modal-backdrop" onClick={onClose}>
      <div className="ai-modal-card generator-dialog-card" onClick={(event) => event.stopPropagation()}>
        <div className="ai-modal-head">
          <div className="download-dialog-copy">
            <span className="dashboard-eyebrow">AI Generator</span>
            <h3>{subjectMeta?.shortLabel || '当前科目'} AI 生成题目</h3>
            <p>按当前科目的题型协议生成题目。生成完成后可以保存到题库，或直接进入刷题模式。</p>
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
                <select
                  value={config.mode || generation.supportedModes?.[0] || 'practice'}
                  onChange={(event) => onConfigChange({ mode: event.target.value })}
                >
                  {MODE_OPTIONS.filter((item) => !generation.supportedModes || generation.supportedModes.includes(item.key)).map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-field">
                <span>难度</span>
                <select
                  value={config.difficulty || generation.defaultDifficulty || 'medium'}
                  onChange={(event) => onConfigChange({ difficulty: event.target.value })}
                >
                  {DIFFICULTY_OPTIONS.map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              {config.mode !== 'mock_exam' && (
                <label className="form-field">
                  <span>题量</span>
                  <select
                    value={String(config.count || generation.defaultCounts?.[0] || 5)}
                    onChange={(event) => onConfigChange({ count: Number(event.target.value) })}
                  >
                    {(generation.defaultCounts || [5, 10, 20]).map((count) => (
                      <option key={count} value={count}>
                        {count} 题
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            <div className="generator-type-panel">
              <span className="generator-section-title">题型选择</span>
              <div className="generator-chip-list">
                {questionTypeOptions.map((item) => {
                  const active = selectedTypeKeys.includes(item.key)
                  return (
                    <button
                      key={item.key}
                      type="button"
                      className={`generator-type-chip ${active ? 'active' : ''}`}
                      onClick={() => onConfigChange(updateQuestionTypeSelection(config, item))}
                    >
                      {item.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {config.mode === 'mock_exam' && selectedTypeKeys.length > 0 && (
              <div className="generator-plan-panel">
                <div className="generator-section-title">模拟卷出题计划</div>
                <div className="generator-plan-list">
                  {questionTypeOptions
                    .filter((item) => selectedTypeKeys.includes(item.key))
                    .map((item) => (
                      <div key={item.key} className="generator-plan-row">
                        <strong>{item.label}</strong>
                        <label className="form-field slim-field">
                          <span>题数</span>
                          <input
                            type="number"
                            min="1"
                            value={config.questionPlan?.[item.key]?.count || item.mockExamDefaultCount || 1}
                            onChange={(event) => onConfigChange(updateQuestionPlan(config, item.key, 'count', event.target.value))}
                          />
                        </label>
                        <label className="form-field slim-field">
                          <span>每题分值</span>
                          <input
                            type="number"
                            min="1"
                            step="0.5"
                            value={config.questionPlan?.[item.key]?.score || item.mockExamDefaultScore || 1}
                            onChange={(event) => onConfigChange(updateQuestionPlan(config, item.key, 'score', event.target.value))}
                          />
                        </label>
                      </div>
                    ))}
                </div>
                <div className="generator-summary-row">
                  <span>总题数：{planSummary.count}</span>
                  <span>目标总分：{planSummary.totalScore}</span>
                </div>
              </div>
            )}

            <label className="form-field grow">
              <span>附加提示词</span>
              <textarea
                className="subjective-textarea generator-extra-prompt"
                rows={4}
                value={config.extraPrompt || ''}
                onChange={(event) => onConfigChange({ extraPrompt: event.target.value })}
                placeholder="例如：偏重堆排序、折半查找判定树、国际贸易术语辨析等。"
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
              <span className="generator-section-title">生成结果</span>
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
