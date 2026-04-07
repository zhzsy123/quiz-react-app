import React, { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, FileText, FolderOpen, Pencil, Play, Search, Tags, Timer, Trash2, UserCircle2 } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import QuizImporter from '../components/QuizImporter'
import { getQuizScoreBreakdown } from '../boundaries/quizSchema'
import { buildPaperId } from '../utils/storage'
import { useAppContext } from '../context/AppContext'
import { deleteLibraryEntry, listLibraryEntries, updateLibraryEntry, upsertLibraryEntry } from '../boundaries/storageFacade'
import { getSubjectMetaByRouteParam } from '../config/subjects'

export default function FileHubPage() {
  const { subjectParam = 'english' } = useParams()
  const subjectMeta = getSubjectMetaByRouteParam(subjectParam)
  const SUBJECT_KEY = subjectMeta.key

  const { activeProfile, activeProfileId } = useAppContext()
  const navigate = useNavigate()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')

  const refreshEntries = async () => {
    if (!activeProfileId) return
    setLoading(true)
    try {
      const rows = await listLibraryEntries(activeProfileId, SUBJECT_KEY)
      setEntries(rows)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refreshEntries()
  }, [activeProfileId, SUBJECT_KEY])

  const filteredEntries = useMemo(() => {
    const lowered = query.trim().toLowerCase()
    return entries.filter((entry) => {
      if (!lowered) return true
      const bucket = [entry.title, ...(entry.tags || []), entry.schemaVersion || ''].join(' ').toLowerCase()
      return bucket.includes(lowered)
    })
  }, [entries, query])

  const handleQuizLoaded = async ({ parsed, rawText }) => {
    if (!activeProfile?.id) return
    const scoreBreakdown = getQuizScoreBreakdown(parsed.items || [])

    if (SUBJECT_KEY === 'english' && scoreBreakdown.paperTotal !== 150) {
      const shouldContinue = window.confirm(
        `当前英语试卷总分为 ${scoreBreakdown.paperTotal} 分，不是 150 分。可能是 JSON 缺少 score 或题型分值异常，是否继续导入？`
      )
      if (!shouldContinue) return false
    }

    const nextPaperId = buildPaperId(rawText)
    await upsertLibraryEntry({
      profileId: activeProfile.id,
      subject: SUBJECT_KEY,
      paperId: nextPaperId,
      title: parsed.title || '未命名文件',
      rawText,
      tags: parsed.compatibility?.skippedTypes?.length ? ['兼容导入'] : [],
      schemaVersion: parsed.compatibility?.sourceSchema || 'unknown',
      questionCount: parsed.items?.length || 0,
    })
    await refreshEntries()
    return true
  }

  const handleRename = async (entry) => {
    const nextTitle = window.prompt('请输入新的文件名称：', entry.title)
    if (!nextTitle) return
    await updateLibraryEntry(entry.id, { title: nextTitle })
    await refreshEntries()
  }

  const handleTags = async (entry) => {
    const raw = window.prompt('请输入标签，使用英文逗号分隔：', Array.isArray(entry.tags) ? entry.tags.join(', ') : '')
    if (raw === null) return
    const nextTags = raw.split(',').map((tag) => tag.trim()).filter(Boolean)
    await updateLibraryEntry(entry.id, { tags: nextTags })
    await refreshEntries()
  }

  const handleDelete = async (entry) => {
    const ok = window.confirm(`确定删除《${entry.title}》吗？`)
    if (!ok) return
    await deleteLibraryEntry(entry.id)
    await refreshEntries()
  }

  const openWorkspace = (entry, mode) => {
    navigate(`/workspace/${subjectMeta.routeSlug}?paper=${encodeURIComponent(entry.paperId)}&mode=${mode}`)
  }

  return (
    <div className="app-shell">
      <div className="container dashboard-page">
        <section className="dashboard-hero left-hero compact-page-hero">
          <div className="section-header-row no-margin">
            <h1 className="page-title-inline"><FileText size={28} /> {subjectMeta.shortLabel}本地题库</h1>
            <div className="dashboard-action-row">
              <Link className="secondary-btn small-btn" to="/"><ArrowLeft size={16} /> 返回首页</Link>
            </div>
          </div>
          <div className="hub-topbar-meta">
            <div className="profile-inline-badge"><UserCircle2 size={16} /> {activeProfile?.name || '未命名档案'}</div>
            <div className="hub-mode-pill">{subjectMeta.label}</div>
          </div>
          <QuizImporter onQuizLoaded={handleQuizLoaded} />
        </section>

        <section className="profile-card compact-card">
          <div className="section-header-row">
            <h2><Search size={18} /> 文件检索</h2>
            <span className="section-header-tip">{filteredEntries.length} 份文件</span>
          </div>
          <div className="library-filters-grid single-search-grid">
            <label className="form-field grow">
              <span>关键词</span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`搜索${subjectMeta.shortLabel}文件名称、标签或 schema 版本`} />
            </label>
          </div>
        </section>

        <section className="local-library-panel">
          <div className="section-header-row"><h2><FolderOpen size={18} /> 文件列表</h2></div>
          {loading ? (
            <div className="local-library-empty">正在加载...</div>
          ) : filteredEntries.length === 0 ? (
            <div className="local-library-empty">当前还没有已加载的{subjectMeta.shortLabel}考试/练习文件。</div>
          ) : (
            <div className="local-library-list">
              {filteredEntries.map((entry) => (
                <article key={entry.id} className="local-library-item hub-file-item">
                  <div className="local-library-main">
                    <div className="record-title-row"><div className="local-library-title">{entry.title}</div><span className="tag blue">{entry.questionCount || '--'} 题</span></div>
                    <div className="local-library-meta"><span>更新时间：{new Date(entry.updatedAt).toLocaleString()}</span><span>Schema：{entry.schemaVersion || 'unknown'}</span></div>
                    {Array.isArray(entry.tags) && entry.tags.length > 0 && <div className="local-library-tags">{entry.tags.map((tag) => <span key={tag} className="tag blue">{tag}</span>)}</div>}
                  </div>
                  <div className="local-library-actions hub-file-actions">
                    <button className="primary-btn small-btn" onClick={() => openWorkspace(entry, 'practice')}><Play size={14} /> 刷题模式</button>
                    <button className="primary-btn small-btn" onClick={() => openWorkspace(entry, 'exam')}><Timer size={14} /> 考试模式</button>
                    <button className="secondary-btn small-btn" onClick={() => handleRename(entry)}><Pencil size={14} /> 重命名</button>
                    <button className="secondary-btn small-btn" onClick={() => handleTags(entry)}><Tags size={14} /> 标签</button>
                    <button className="danger-btn small-btn" onClick={() => handleDelete(entry)}><Trash2 size={14} /> 删除</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
