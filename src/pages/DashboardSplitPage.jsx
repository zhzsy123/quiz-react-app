import React, { useRef } from 'react'
import {
  ArrowRight,
  Bot,
  BookOpen,
  Download,
  FileJson,
  History,
  LayoutDashboard,
  Pencil,
  Plus,
  Star,
  Upload,
  User2,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useDashboardSplitPageState } from '../features/dashboard/model/useDashboardSplitPageState'

function WorkflowBand({ onOpenDownloads }) {
  return (
    <section className="dashboard-band-card">
      <div className="dashboard-band-copy">
        <span className="dashboard-eyebrow">JSON Workflow</span>
        <h2>先下载规范，再让 AI 清洗成可导入 JSON</h2>
        <p>把试卷原文和对应科目的 JSON 解析规范一起交给 AI，再把结果导入本站，可以显著减少手工整理题库的时间成本。</p>
      </div>

      <div className="dashboard-band-steps">
        <span>试卷原文</span>
        <ArrowRight size={14} />
        <span>AI 输出 JSON</span>
        <ArrowRight size={14} />
        <span>导入练习</span>
      </div>

      <div className="dashboard-band-actions">
        <button type="button" className="secondary-btn small-btn" onClick={onOpenDownloads}>
          <Download size={14} />
          下载资料
        </button>
      </div>
    </section>
  )
}

function DownloadDialog({ open, onClose, groups }) {
  if (!open) return null

  return (
    <div className="ai-modal-backdrop" onClick={onClose}>
      <div className="ai-modal-card download-dialog-card-shell" onClick={(event) => event.stopPropagation()}>
        <div className="ai-modal-head">
          <div className="download-dialog-copy">
            <span className="dashboard-eyebrow">Downloads</span>
            <h3>选择下载资料</h3>
            <p>每个科目都对应自己的 JSON 解析规范；如果某个科目提供样卷示例，也会在这里一并列出。</p>
          </div>

          <button type="button" className="secondary-btn small-btn" onClick={onClose} aria-label="关闭下载对话框">
            <X size={16} />
            关闭
          </button>
        </div>

        <div className="download-dialog-groups">
          {groups.map((group) => (
            <section key={group.subjectKey} className="download-dialog-group">
              <div className="download-dialog-group-head">
                <div>
                  <strong>{group.subjectLabel}</strong>
                  <p>{group.questionTypeSummary}</p>
                </div>
              </div>

              <div className="download-dialog-list">
                {group.items.map((item) => (
                  <a
                    key={item.key}
                    className="download-dialog-item"
                    href={item.href}
                    download={item.filename}
                    onClick={onClose}
                  >
                    <div className="download-dialog-meta">
                      <strong>{item.title}</strong>
                      <p>{item.description}</p>
                    </div>
                    <span className="download-dialog-action">
                      <FileJson size={16} />
                      立即下载
                    </span>
                  </a>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function DashboardSplitPage() {
  const importInputRef = useRef(null)
  const {
    profiles,
    activeProfile,
    activeProfileId,
    loading,
    newProfileName,
    setNewProfileName,
    showCreateProfile,
    setShowCreateProfile,
    showDownloadDialog,
    setShowDownloadDialog,
    dashboardState,
    subjectSummaries,
    latestAttempt,
    spotlightStats,
    downloadGroups,
    switchProfile,
    handleCreateProfile,
    handleRenameProfile,
    handleExportLocalBackup,
    handleImportBackupFile,
    backupFeedback,
    isBackupBusy,
  } = useDashboardSplitPageState()

  if (loading) {
    return (
      <div className="app-shell">
        <div className="container">
          <section className="dashboard-hero">
            <div className="hero-icon">
              <LayoutDashboard size={30} />
            </div>
            <h1>智能在线模考系统 V2.0</h1>
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <div className="container dashboard-minimal-shell">
        <section className="dashboard-showcase">
          <div className="dashboard-showcase-copy">
            <span className="dashboard-eyebrow">Study Workspace</span>
            <h1>智能在线模考系统 V2.0</h1>
            <p>统一管理题库导入、刷题、模考、错题复习和 AI 辅助，把你最常用的入口稳定留在首页。</p>

            <div className="dashboard-showcase-actions">
              <Link className="primary-btn" to="/exam/english">
                进入主科目
              </Link>
              <button type="button" className="secondary-btn" onClick={() => setShowDownloadDialog(true)}>
                下载资料
              </button>
              <Link className="secondary-btn" to="/ai-center">
                <Bot size={16} />
                AI 控制中心
              </Link>
            </div>

            <div className="dashboard-stat-strip">
              {spotlightStats.map((item) => (
                <article key={item.label} className="dashboard-stat-pill">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </article>
              ))}
            </div>
          </div>

          <div className="dashboard-showcase-panel">
            <div className="dashboard-profile-panel">
              <div className="dashboard-panel-head">
                <span className="dashboard-panel-title">
                  <User2 size={16} />
                  当前档案
                </span>
                {activeProfile && (
                  <button className="secondary-btn small-btn" onClick={handleRenameProfile}>
                    <Pencil size={14} />
                    重命名
                  </button>
                )}
              </div>

              <strong>{activeProfile?.name || '未命名档案'}</strong>
              <p>本地记录保存在当前浏览器。导出备份包后，可以在另一台设备上导入恢复。</p>

              <label className="form-field">
                <span>切换档案</span>
                <select value={activeProfileId || ''} onChange={(event) => switchProfile(event.target.value)}>
                  {profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="profile-create-panel">
                <button className="ghost-btn" onClick={() => setShowCreateProfile((value) => !value)}>
                  {showCreateProfile ? '收起新建档案' : '新建档案'}
                </button>

                <button className="secondary-btn small-btn" onClick={handleExportLocalBackup} disabled={isBackupBusy}>
                  <Download size={14} />
                  导出本地记录
                </button>

                <button
                  className="secondary-btn small-btn"
                  onClick={() => importInputRef.current?.click()}
                  disabled={isBackupBusy}
                >
                  <Upload size={14} />
                  导入本地记录
                </button>

                <input
                  ref={importInputRef}
                  type="file"
                  accept="application/json"
                  style={{ display: 'none' }}
                  onChange={async (event) => {
                    const file = event.target.files?.[0]
                    await handleImportBackupFile(file)
                    event.target.value = ''
                  }}
                />
              </div>

              {backupFeedback ? <p className="profile-backup-feedback">{backupFeedback}</p> : null}

              {showCreateProfile && (
                <div className="profile-create-panel">
                  <label className="form-field grow">
                    <span>新档案名称</span>
                    <input
                      value={newProfileName}
                      onChange={(event) => setNewProfileName(event.target.value)}
                      placeholder="输入新的本地用户名称"
                    />
                  </label>
                  <button className="primary-btn profile-create-btn" onClick={handleCreateProfile}>
                    <Plus size={16} />
                    创建并切换
                  </button>
                </div>
              )}
            </div>

            <div className="dashboard-quick-panel">
              <Link className="dashboard-quick-link" to="/wrong-book">
                <BookOpen size={16} />
                <span>错题复习</span>
              </Link>
              <Link className="dashboard-quick-link" to="/favorites">
                <Star size={16} />
                <span>收藏夹</span>
              </Link>
              <Link className="dashboard-quick-link" to="/history">
                <History size={16} />
                <span>历史记录</span>
              </Link>
            </div>
          </div>
        </section>

        <section className="dashboard-section-block">
          <div className="dashboard-section-head">
            <div>
              <span className="dashboard-eyebrow">Modules</span>
              <h2>科目模块</h2>
            </div>
          </div>

          <div className="dashboard-module-grid">
            {subjectSummaries.map((subject) => (
              <Link key={subject.key} className="dashboard-module-card" to={subject.route}>
                <div className="dashboard-module-top">
                  <strong>{subject.shortLabel}</strong>
                  <span className="dashboard-module-tag">可用</span>
                </div>
                <p>{subject.description}</p>
                <div className="dashboard-module-meta">
                  <span>总考试次数 {subject.attemptCount}</span>
                  <span>平均正确率 {subject.averageRate}%</span>
                </div>
                <div className="dashboard-module-entry">
                  <span>进入模块</span>
                  <ArrowRight size={16} />
                </div>
              </Link>
            ))}
          </div>
        </section>

        <WorkflowBand onOpenDownloads={() => setShowDownloadDialog(true)} />

        <section className="dashboard-summary-row">
          <article className="dashboard-summary-card">
            <span className="dashboard-summary-label">最近一次考试</span>
            <strong>{latestAttempt ? `${latestAttempt.objectiveScore}/${latestAttempt.objectiveTotal}` : '--'}</strong>
            <p>{latestAttempt?.title || '当前还没有提交记录'}</p>
          </article>

          <article className="dashboard-summary-card">
            <span className="dashboard-summary-label">总刷题量</span>
            <strong>{dashboardState.totalQuestionVolume}</strong>
            <p>累计参与练习和考试的题目数量。</p>
          </article>

          <article className="dashboard-summary-card">
            <span className="dashboard-summary-label">当前重点</span>
            <strong>{dashboardState.totalWrong} 道错题</strong>
            <p>如果今天只做一件事，优先从错题本开始。</p>
          </article>
        </section>
      </div>

      <DownloadDialog
        open={showDownloadDialog}
        onClose={() => setShowDownloadDialog(false)}
        groups={downloadGroups}
      />
    </div>
  )
}
