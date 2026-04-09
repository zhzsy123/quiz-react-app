import React, { useMemo, useState } from 'react'
import ActivityTimeline from '../feedback/ActivityTimeline.jsx'

function renderPreviewStats(preview) {
  if (!preview) return null

  return (
    <div className="document-import-preview">
      <div className="document-import-preview-head">
        <div>
          <h4>{preview.title || '未命名试卷'}</h4>
          <p>
            {preview.subject || '--'} · {preview.questionCount} 题 · 总分 {preview.totalScore || 0}
          </p>
        </div>
        <div className="document-import-preview-summary">
          <span>通过 {preview.validCount}</span>
          <span>警告 {preview.warningCount}</span>
          <span>无效 {preview.invalidCount}</span>
        </div>
      </div>

      <div className="document-import-type-stats">
        {(preview.typeStats || []).map((item) => (
          <div key={item.type} className="document-import-type-stat">
            <strong>{item.count}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function renderIssueList(title, items = [], tone = 'warning') {
  if (!items.length) return null

  return (
    <div className={`document-import-issues ${tone}`}>
      <strong>{title}</strong>
      <ul>
        {items.map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

function renderQuestionPreviewList(preview, handlers) {
  const questionPreviews = preview?.questionPreviews || []
  if (!questionPreviews.length) return null

  return (
    <QuestionPreviewList
      questionPreviews={questionPreviews}
      totalCount={preview.questionCount || questionPreviews.length}
      handlers={handlers}
    />
  )
}

function QuestionPreviewList({ questionPreviews, totalCount, handlers }) {
  const [expanded, setExpanded] = useState(false)
  const [editingId, setEditingId] = useState('')
  const [drafts, setDrafts] = useState({})

  const visibleItems = useMemo(() => {
    if (expanded) return questionPreviews
    return questionPreviews.slice(0, 8)
  }, [expanded, questionPreviews])

  const startEdit = (item) => {
    setEditingId(item.id)
    setDrafts((current) => ({
      ...current,
      [item.id]: {
        prompt: item.prompt || '',
        score: item.score || 0,
        content: item.content || '',
      },
    }))
  }

  const updateDraft = (questionId, patch) => {
    setDrafts((current) => ({
      ...current,
      [questionId]: {
        ...(current[questionId] || {}),
        ...patch,
      },
    }))
  }

  const saveDraft = async (questionId) => {
    const draft = drafts[questionId]
    if (!draft) return
    await handlers?.onUpdateQuestion?.(questionId, draft)
    setEditingId('')
  }

  const handleRepair = async (questionId) => {
    try {
      await handlers?.onRepairQuestion?.(questionId)
    } catch {
      // 错误状态由 hook 内部维护
    }
  }

  return (
    <div className="document-import-question-preview">
      <div className="document-import-question-preview-head">
        <strong>题目预览</strong>
        {questionPreviews.length < totalCount ? (
          <span className="section-header-tip">仅展示前 {questionPreviews.length} 题</span>
        ) : (
          <span className="section-header-tip">共 {totalCount} 题</span>
        )}
      </div>
      <div className="document-import-question-preview-list" data-testid="document-import-question-preview-list">
        {visibleItems.map((item) => (
          <article key={item.id} className="document-import-question-card">
            <div className="document-import-question-card-head">
              <div>
                <strong>第 {item.index} 题</strong>
                <span className="tag blue">{item.label}</span>
                {item.subQuestionCount > 0 ? (
                  <span className="tag blue">含 {item.subQuestionCount} 个子题</span>
                ) : null}
              </div>
              <span>{item.score} 分</span>
            </div>
            <div className="document-import-question-card-title">{item.prompt}</div>
            {editingId === item.id ? (
              <div className="document-import-question-edit-form">
                <label className="form-field grow">
                  <span>题干</span>
                  <textarea
                    value={drafts[item.id]?.prompt || ''}
                    onChange={(event) => updateDraft(item.id, { prompt: event.target.value })}
                    rows={3}
                  />
                </label>
                <label className="form-field grow">
                  <span>分值</span>
                  <input
                    type="number"
                    value={drafts[item.id]?.score ?? item.score}
                    onChange={(event) => updateDraft(item.id, { score: event.target.value })}
                  />
                </label>
                {item.content ? (
                  <label className="form-field grow">
                    <span>正文 / 材料</span>
                    <textarea
                      value={drafts[item.id]?.content || ''}
                      onChange={(event) => updateDraft(item.id, { content: event.target.value })}
                      rows={6}
                    />
                  </label>
                ) : null}
                <div className="generator-actions no-top-margin">
                  <button type="button" className="secondary-btn small-btn" onClick={() => setEditingId('')}>
                    取消
                  </button>
                  <button type="button" className="primary-btn small-btn" onClick={() => saveDraft(item.id)}>
                    保存修改
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p>{item.excerpt}</p>
                <div className="document-import-question-actions">
                  <button type="button" className="secondary-btn small-btn" onClick={() => startEdit(item)}>
                    编辑
                  </button>
                  <button
                    type="button"
                    className="secondary-btn small-btn"
                    onClick={() => void handleRepair(item.id)}
                    disabled={handlers?.repairingQuestionIds?.includes(item.id)}
                  >
                    {handlers?.repairingQuestionIds?.includes(item.id) ? '重新解析中…' : '重新解析'}
                  </button>
                  <button type="button" className="danger-btn small-btn" onClick={() => handlers?.onRemoveQuestion?.(item.id)}>
                    移除
                  </button>
                </div>
              </>
            )}
          </article>
        ))}
      </div>
      {questionPreviews.length > 8 ? (
        <button
          type="button"
          className="secondary-btn small-btn"
          onClick={() => setExpanded((current) => !current)}
          data-testid="toggle-document-import-question-preview"
        >
          {expanded ? '收起预览' : '展开更多题目'}
        </button>
      ) : null}
    </div>
  )
}

export default function DocumentImportPreview({
  state,
  onRemoveQuestion,
  onUpdateQuestion,
  onRepairQuestion,
}) {
  const {
    status,
    fileMeta,
    documentDraft,
    preview,
    activityEntries,
    progressLog,
    warnings,
    errors,
    invalidReasons,
    failedStage,
  } = state

  const isPreviewReady = ['preview_ready', 'saving', 'launching', 'completed'].includes(status)

  const fallbackEntries = (activityEntries?.length ? activityEntries : progressLog.map((line, index) => ({
    id: `log-${index + 1}`,
    title: `步骤 ${index + 1}`,
    status: index === progressLog.length - 1 && !isPreviewReady ? 'running' : 'completed',
    summary: line,
    detail: line,
  })))

  return (
    <div className="document-import-preview-panel" data-testid="document-import-preview">
      <div className="generator-results-head">
        <span className="generator-section-title">导入进度</span>
        {fileMeta ? (
          <span className="section-header-tip">
            {fileMeta.name} · {Math.max(1, Math.round((fileMeta.size || 0) / 1024))} KB
          </span>
        ) : null}
      </div>

      <ActivityTimeline
        entries={fallbackEntries}
        emptyText="拖入文件后，这里会显示解析进度与导入预览。"
        testId="document-import-timeline"
      />

      {isPreviewReady ? renderPreviewStats(preview) : null}

      {documentDraft?.stats ? (
        <div className="document-import-draft-meta">
          <span>文本 {documentDraft.stats.characterCount} 字</span>
          <span>页数 {documentDraft.stats.pageCount || 0}</span>
          <span>段落 {documentDraft.stats.paragraphCount || 0}</span>
          {documentDraft.ocrUsed ? <span>已启用 OCR</span> : null}
        </div>
      ) : null}

      {failedStage ? (
        <div className="document-import-stage-error" data-testid="document-import-failed-stage">
          失败阶段：{failedStage}
        </div>
      ) : null}

      {renderIssueList('警告', warnings, 'warning')}
      {renderIssueList('错误', errors, 'error')}
      {renderIssueList('无效原因', invalidReasons, 'error')}
      {isPreviewReady
        ? renderQuestionPreviewList(preview, {
            onRemoveQuestion,
            onUpdateQuestion,
            onRepairQuestion,
            repairingQuestionIds: state.repairingQuestionIds || [],
          })
        : null}
    </div>
  )
}
