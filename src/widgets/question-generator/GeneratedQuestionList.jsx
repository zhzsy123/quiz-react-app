import React from 'react'
import ActivityTimeline from '../feedback/ActivityTimeline.jsx'

function buildFallbackEntries(draftQuestions = []) {
  return draftQuestions.map((entry, index) => ({
    id: entry.rawQuestion?.id || entry.normalizedQuestion?.id || `draft-${index + 1}`,
    index: entry.preview?.index || index + 1,
    title: `第 ${entry.preview?.index || index + 1} 题 · ${entry.preview?.typeLabel || '题目'}`,
    status: entry.status,
    summary: entry.preview?.previewText || entry.preview?.title || '暂无题目摘要',
    details: [...(entry.validation?.warnings || []), ...(entry.errors || [])],
    meta: `${entry.preview?.score || entry.scoreBreakdown?.paperTotal || 0} 分`,
    previewText: entry.preview?.previewText || '',
    questionId: entry.rawQuestion?.id || entry.normalizedQuestion?.id || '',
    phase: 'expansion',
  }))
}

function renderTimeline(entries, testId, emptyText, onRemoveQuestion) {
  return (
    <ActivityTimeline
      entries={entries}
      emptyText={emptyText}
      testId={testId}
      renderBody={(entry) => {
        if (!entry.previewText) return null
        return <div className="activity-preview-text">{entry.previewText}</div>
      }}
      renderActions={(entry) => {
        if (entry.status === 'running' || entry.status === 'queued' || entry.phase === 'planning') return null
        return (
          <button
            type="button"
            className="secondary-btn small-btn"
            onClick={() => onRemoveQuestion?.(entry.questionId || entry.id)}
          >
            移除
          </button>
        )
      }}
    />
  )
}

export default function GeneratedQuestionList({
  draftQuestions = [],
  activityEntries = [],
  onRemoveQuestion,
}) {
  const entries = activityEntries.length > 0 ? activityEntries : buildFallbackEntries(draftQuestions)
  const planningEntries = entries.filter(
    (entry) => entry.phase === 'planning' || String(entry.id || '').startsWith('planning-')
  )
  const questionEntries = entries.filter((entry) => !planningEntries.includes(entry))

  return (
    <div className="generator-activity-groups">
      {planningEntries.length ? (
        <section className="generator-activity-section">
          <div className="generator-activity-section-head">
            <strong>蓝图规划</strong>
            <span>{planningEntries.length} 项</span>
          </div>
          {renderTimeline(planningEntries, 'generator-planning-timeline', '暂无蓝图规划记录。', onRemoveQuestion)}
        </section>
      ) : null}

      <section className="generator-activity-section">
        <div className="generator-activity-section-head">
          <strong>题目扩写</strong>
          <span>{questionEntries.length || entries.length} 项</span>
        </div>
        {renderTimeline(
          questionEntries.length ? questionEntries : entries,
          'generator-activity-timeline',
          '系统会先规划蓝图，再逐题扩写并显示结果。',
          onRemoveQuestion
        )}
      </section>
    </div>
  )
}
