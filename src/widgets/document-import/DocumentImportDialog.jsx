import React from 'react'
import { FileText, X } from 'lucide-react'
import DocumentDropzone from './DocumentDropzone.jsx'
import DocumentImportPreview from './DocumentImportPreview.jsx'

const BUSY_STATUSES = new Set([
  'reading_file',
  'extracting_text',
  'calling_ai',
  'validating',
  'saving',
  'launching',
])

export default function DocumentImportDialog({
  open,
  state,
  subjectOptions = [],
  onClose,
  onFileSelect,
  onSubjectChange,
  onStartImport,
  onCancelImport,
  onReset,
  onSaveImportedPaper,
  onStartPracticeWithImportedPaper,
  onRemoveQuestion,
  onUpdateQuestion,
  onRepairQuestion,
}) {
  if (!open) return null

  const isBusy = BUSY_STATUSES.has(state.status)
  const canStartImport = !!state.file && !!state.subject && !isBusy

  return (
    <div className="ai-modal-backdrop" onClick={onClose}>
      <div className="ai-modal-card document-import-dialog-card" onClick={(event) => event.stopPropagation()}>
        <div className="ai-modal-head">
          <div className="download-dialog-copy">
            <span className="dashboard-eyebrow">Direct Import</span>
            <h3>导入 PDF / DOCX</h3>
            <p>拖入试卷文件后，系统会先提取文本，再调用 AI 解析成题库结构。</p>
          </div>

          <button type="button" className="secondary-btn small-btn" onClick={onClose} aria-label="关闭导入对话框">
            <X size={16} />
            关闭
          </button>
        </div>

        <div className="generator-layout document-import-layout">
          <section className="generator-config-panel document-import-config-panel">
            <div className="document-import-privacy-tip">
              <FileText size={16} />
              <span>文档内容会发送给 AI 解析。请勿上传不应外发的内部资料。</span>
            </div>

            <DocumentDropzone file={state.file} disabled={isBusy} onFileSelect={onFileSelect} />

            <label className="form-field grow">
              <span>科目</span>
              <select
                value={state.subject || ''}
                onChange={(event) => onSubjectChange?.(event.target.value)}
                disabled={isBusy}
                data-testid="document-import-subject"
              >
                <option value="">请选择科目</option>
                {subjectOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.shortLabel || option.label || option.key}
                  </option>
                ))}
              </select>
            </label>

            <div className="generator-summary-row">
              <span>状态：{state.status}</span>
              {state.fileMeta ? <span>文件：{state.fileMeta.name}</span> : null}
            </div>
          </section>

          <section className="generator-results-panel document-import-results-panel">
            <DocumentImportPreview
              state={state}
              onRemoveQuestion={onRemoveQuestion}
              onUpdateQuestion={onUpdateQuestion}
              onRepairQuestion={onRepairQuestion}
            />
          </section>
        </div>

        <div className="generator-actions">
          <button
            type="button"
            className="primary-btn"
            onClick={onStartImport}
            disabled={!canStartImport}
            data-testid="document-import-start"
          >
            开始解析
          </button>
          <button
            type="button"
            className="secondary-btn"
            onClick={onCancelImport}
            disabled={!isBusy}
            data-testid="document-import-cancel"
          >
            取消解析
          </button>
          <button
            type="button"
            className="secondary-btn"
            onClick={onReset}
            disabled={isBusy}
            data-testid="document-import-reset"
          >
            重置
          </button>
          <button
            type="button"
            className="secondary-btn"
            onClick={onSaveImportedPaper}
            disabled={!state.canSave || isBusy}
            data-testid="document-import-save"
          >
            保存到题库
          </button>
          <button
            type="button"
            className="primary-btn"
            onClick={onStartPracticeWithImportedPaper}
            disabled={!state.canStartPractice || isBusy}
            data-testid="document-import-launch"
          >
            立即开始练习
          </button>
        </div>
      </div>
    </div>
  )
}
