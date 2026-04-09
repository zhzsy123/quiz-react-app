import React from 'react'
import ActivityTimeline from '../feedback/ActivityTimeline.jsx'

function buildFallbackEntries(draftQuestions = []) {
  return draftQuestions.map((entry, index) => ({
    id: entry.rawQuestion?.id || entry.normalizedQuestion?.id || `draft-${index + 1}`,
    index: entry.preview?.index || index + 1,
    title: `第 ${entry.preview?.index || index + 1} 题 · ${entry.preview?.typeLabel || '题目'}`,
    status: entry.status,
    summary: entry.preview?.previewText || entry.preview?.title || '暂无题目摘要',
    details: [
      ...(entry.validation?.warnings || []),
      ...(entry.errors || []),
    ],
    meta: `${entry.preview?.score || entry.scoreBreakdown?.paperTotal || 0} 分`,
    previewText: entry.preview?.previewText || '',
    questionId: entry.rawQuestion?.id || entry.normalizedQuestion?.id || '',
  }))
}

export default function GeneratedQuestionList({
  draftQuestions = [],
  activityEntries = [],
  onRemoveQuestion,
}) {
  const entries = activityEntries.length > 0 ? activityEntries : buildFallbackEntries(draftQuestions)

  return (
    <ActivityTimeline
      entries={entries}
      emptyText="生成后的题目会逐题显示在这里。"
      testId="generator-activity-timeline"
      renderBody={(entry) => {
        if (!entry.previewText) return null
        return <div className="activity-preview-text">{entry.previewText}</div>
      }}
      renderActions={(entry) => {
        if (entry.status === 'running' || entry.status === 'queued') return null
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
