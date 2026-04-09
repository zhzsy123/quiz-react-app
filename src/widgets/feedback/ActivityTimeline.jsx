import React, { useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDot,
  LoaderCircle,
  XCircle,
} from 'lucide-react'

function normalizeStatus(status = 'idle') {
  switch (status) {
    case 'valid':
      return 'completed'
    case 'invalid':
      return 'failed'
    default:
      return status || 'idle'
  }
}

function getStatusLabel(status = 'idle') {
  switch (normalizeStatus(status)) {
    case 'running':
      return '处理中'
    case 'completed':
      return '已完成'
    case 'warning':
      return '有警告'
    case 'failed':
      return '失败'
    case 'queued':
      return '等待中'
    default:
      return '待开始'
  }
}

function ActivityIcon({ status = 'idle' }) {
  const normalized = normalizeStatus(status)

  if (normalized === 'running') {
    return <LoaderCircle size={16} className="activity-icon spin" />
  }

  if (normalized === 'completed') {
    return <CheckCircle2 size={16} className="activity-icon completed" />
  }

  if (normalized === 'warning') {
    return <AlertTriangle size={16} className="activity-icon warning" />
  }

  if (normalized === 'failed') {
    return <XCircle size={16} className="activity-icon failed" />
  }

  return <CircleDot size={16} className="activity-icon idle" />
}

export default function ActivityTimeline({
  entries = [],
  emptyText = '暂无任务记录。',
  renderActions,
  renderBody,
  testId,
}) {
  const [expandedIds, setExpandedIds] = useState([])

  const normalizedEntries = useMemo(
    () =>
      entries.map((entry, index) => ({
        id: entry.id || `activity-${index}`,
        title: entry.title || `任务 ${index + 1}`,
        summary: entry.summary || '',
        details: Array.isArray(entry.details) ? entry.details : entry.details ? [entry.details] : [],
        meta: entry.meta || '',
        status: normalizeStatus(entry.status),
        rawStatus: entry.status || 'idle',
        ...entry,
      })),
    [entries]
  )

  const toggleExpanded = (id) => {
    setExpandedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    )
  }

  if (!normalizedEntries.length) {
    return <div className="generator-empty-state">{emptyText}</div>
  }

  return (
    <div className="activity-timeline" data-testid={testId}>
      {normalizedEntries.map((entry) => {
        const expanded = expandedIds.includes(entry.id)
        const hasExtraContent =
          Boolean(entry.summary) ||
          Boolean(entry.details?.length) ||
          Boolean(renderBody?.(entry)) ||
          Boolean(renderActions)

        return (
          <article
            key={entry.id}
            className={`activity-card ${entry.status} ${expanded ? 'expanded' : ''}`}
          >
            <button
              type="button"
              className="activity-card-head"
              onClick={() => toggleExpanded(entry.id)}
              disabled={!hasExtraContent}
            >
              <div className="activity-card-main">
                <span className="activity-icon-wrap">
                  <ActivityIcon status={entry.rawStatus || entry.status} />
                </span>
                <div className="activity-copy">
                  <strong>{entry.title}</strong>
                  {entry.meta ? <span className="activity-meta">{entry.meta}</span> : null}
                </div>
              </div>

              <div className="activity-card-side">
                <span className={`activity-status-pill ${entry.status}`}>
                  {getStatusLabel(entry.rawStatus || entry.status)}
                </span>
                {hasExtraContent ? (
                  expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
                ) : null}
              </div>
            </button>

            {expanded ? (
              <div className="activity-card-body">
                {entry.summary ? <div className="activity-summary">{entry.summary}</div> : null}

                {entry.details?.length ? (
                  <ul className="activity-details">
                    {entry.details.map((detail, index) => (
                      <li key={`${entry.id}-detail-${index}`}>{detail}</li>
                    ))}
                  </ul>
                ) : null}

                {renderBody ? renderBody(entry) : null}

                {renderActions ? (
                  <div
                    className="activity-card-actions"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {renderActions(entry)}
                  </div>
                ) : null}
              </div>
            ) : null}
          </article>
        )
      })}
    </div>
  )
}
