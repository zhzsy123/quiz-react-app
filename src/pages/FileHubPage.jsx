import React from 'react'
import {
  ArrowLeft,
  FileText,
  FolderOpen,
  Pencil,
  Play,
  Search,
  Sparkles,
  Tags,
  Timer,
  Trash2,
  UserCircle2,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useFileHubPageState } from '../features/file-hub/model/useFileHubPageState'
import DocumentImportDialog from '../widgets/document-import/DocumentImportDialog.jsx'
import QuizImporter from '../widgets/quiz-importer/QuizImporter'
import AiQuestionGeneratorDialog from '../widgets/question-generator/AiQuestionGeneratorDialog.jsx'

export default function FileHubPage() {
  const {
    activeProfile,
    subjectMeta,
    loading,
    query,
    setQuery,
    showJsonImporter,
    setShowJsonImporter,
    filteredEntries,
    handleQuizLoaded,
    handleRename,
    handleTags,
    handleDelete,
    openWorkspace,
    generator,
    documentImport,
    availableSubjectOptions,
    openDocumentImportDialog,
    openGeneratorDialog,
    startGenerator,
    saveGeneratedPaper,
    startPracticeWithGeneratedPaper,
    saveImportedPaper,
    startPracticeWithImportedPaper,
  } = useFileHubPageState()

  return (
    <div className="app-shell">
      <div className="container dashboard-page">
        <section className="dashboard-hero left-hero compact-page-hero">
          <div className="section-header-row no-margin">
            <h1 className="page-title-inline">
              <FileText size={28} />
              {subjectMeta.shortLabel}本地题库
            </h1>
            <div className="dashboard-action-row">
              <button
                type="button"
                className="primary-btn small-btn"
                onClick={openDocumentImportDialog}
                data-testid="open-document-import"
              >
                <FileText size={14} />
                导入 PDF / DOCX
              </button>
              <button
                type="button"
                className="secondary-btn small-btn"
                onClick={openGeneratorDialog}
                data-testid="open-ai-generator"
              >
                <Sparkles size={14} />
                AI 生成题目
              </button>
              <button
                type="button"
                className="secondary-btn small-btn"
                onClick={() => setShowJsonImporter((current) => !current)}
                data-testid="toggle-json-importer"
              >
                <FileText size={14} />
                高级导入（JSON）
              </button>
              <Link className="secondary-btn small-btn" to="/">
                <ArrowLeft size={16} />
                返回首页
              </Link>
            </div>
          </div>

          <div className="hub-topbar-meta">
            <div className="profile-inline-badge">
              <UserCircle2 size={16} />
              {activeProfile?.name || '未命名档案'}
            </div>
            <div className="hub-mode-pill">{subjectMeta.label}</div>
          </div>

          {showJsonImporter ? (
            <div className="document-import-inline-panel" data-testid="json-importer-panel">
              <div className="document-import-inline-copy">
                <strong>高级导入（JSON）</strong>
                <p>适合手动维护题库结构，或导入已经通过 AI 清洗好的 JSON 文件。</p>
              </div>
              <QuizImporter onQuizLoaded={handleQuizLoaded} />
            </div>
          ) : (
            <div className="document-import-inline-copy" data-testid="document-import-primary-hint">
              <strong>推荐直接导入 PDF / DOCX</strong>
              <p>拖入试卷文件，系统会先提取文本，再调用 AI 解析成题库结构。</p>
            </div>
          )}
        </section>

        <section className="profile-card compact-card">
          <div className="section-header-row">
            <h2>
              <Search size={18} />
              文件搜索
            </h2>
            <span className="section-header-tip">{filteredEntries.length} 份文件</span>
          </div>

          <div className="library-filters-grid single-search-grid">
            <label className="form-field grow">
              <span>关键词</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`搜索${subjectMeta.shortLabel}文件名称、标签或 schema 版本`}
              />
            </label>
          </div>
        </section>

        <section className="local-library-panel">
          <div className="section-header-row">
            <h2>
              <FolderOpen size={18} />
              文件列表
            </h2>
          </div>

          {loading ? (
            <div className="local-library-empty">正在加载...</div>
          ) : filteredEntries.length === 0 ? (
            <div className="local-library-empty">当前还没有已加载的 {subjectMeta.shortLabel} 试卷或练习文件。</div>
          ) : (
            <div className="local-library-list">
              {filteredEntries.map((entry, index) => (
                <article key={entry.id || `${entry.paperId}-${index}`} className="local-library-item hub-file-item">
                  <div className="local-library-main">
                    <div className="record-title-row">
                      <div className="local-library-title">{entry.title}</div>
                      <span className="tag blue">{entry.questionCount || '--'} 题</span>
                    </div>
                    <div className="local-library-meta">
                      <span>更新时间：{entry.updatedAt ? new Date(entry.updatedAt).toLocaleString() : '--'}</span>
                      <span>Schema：{entry.schemaVersion || 'unknown'}</span>
                    </div>
                    {Array.isArray(entry.tags) && entry.tags.length > 0 && (
                      <div className="local-library-tags">
                        {entry.tags.map((tag) => (
                          <span key={tag} className="tag blue">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="local-library-actions hub-file-actions">
                    <button className="primary-btn small-btn" onClick={() => openWorkspace(entry, 'practice')}>
                      <Play size={14} />
                      刷题模式
                    </button>
                    <button className="primary-btn small-btn" onClick={() => openWorkspace(entry, 'exam')}>
                      <Timer size={14} />
                      考试模式
                    </button>
                    <button className="secondary-btn small-btn" onClick={() => handleRename(entry)}>
                      <Pencil size={14} />
                      重命名
                    </button>
                    <button className="secondary-btn small-btn" onClick={() => handleTags(entry)}>
                      <Tags size={14} />
                      标签
                    </button>
                    <button className="danger-btn small-btn" onClick={() => handleDelete(entry)}>
                      <Trash2 size={14} />
                      删除
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <AiQuestionGeneratorDialog
        open={generator.open}
        subjectMeta={subjectMeta}
        config={generator.config}
        status={generator.status}
        error={generator.error}
        summary={generator.summary}
        draftQuestions={generator.draftQuestions}
        activityEntries={generator.activityEntries}
        onClose={() => generator.setOpen(false)}
        onConfigChange={(patch) => generator.setConfig((current) => ({ ...current, ...patch }))}
        onStartGeneration={startGenerator}
        onStopGeneration={generator.stopGeneration}
        onResetGenerator={generator.resetGenerator}
        onSaveGeneratedPaper={saveGeneratedPaper}
        onStartPracticeWithGeneratedPaper={startPracticeWithGeneratedPaper}
        onRemoveQuestion={generator.removeQuestion}
      />

      <DocumentImportDialog
        open={documentImport.state.open}
        state={documentImport.state}
        subjectOptions={availableSubjectOptions}
        onClose={() => documentImport.setOpen(false)}
        onFileSelect={documentImport.selectFile}
        onSubjectChange={documentImport.setSubject}
        onStartImport={documentImport.startImport}
        onCancelImport={documentImport.cancelImport}
        onReset={documentImport.resetImport}
        onSaveImportedPaper={saveImportedPaper}
        onStartPracticeWithImportedPaper={startPracticeWithImportedPaper}
        onRemoveQuestion={documentImport.removeQuestion}
        onUpdateQuestion={documentImport.updateQuestion}
        onRepairQuestion={documentImport.repairQuestion}
      />
    </div>
  )
}
