import React, { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, FolderOpen, Pencil, Search, Tags, Trash2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import {
  deleteLibraryEntry,
  listLibraryEntries,
  saveLastOpenedPaper,
  updateLibraryEntry,
} from '../utils/indexedDb'
import { SUBJECT_REGISTRY, getSubjectMeta } from '../config/subjects'

export default function LibraryPage() {
  const { activeProfile, activeProfileId } = useAppContext()
  const navigate = useNavigate()
  const [libraryEntries, setLibraryEntries] = useState([])
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)

  const refreshLibrary = async () => {
    if (!activeProfileId) return
    setLoading(true)
    try {
      const grouped = await Promise.all(
        SUBJECT_REGISTRY.map(async (subject) => {
          const rows = await listLibraryEntries(activeProfileId, subject.key)
          return rows
        })
      )
      setLibraryEntries(grouped.flat().sort((a, b) => b.updatedAt - a.updatedAt))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshLibrary()
  }, [activeProfileId])

  const filteredEntries = useMemo(() => {
    const lowered = query.trim().toLowerCase()
    return libraryEntries.filter((entry) => {
      const subjectMatched = subjectFilter === 'all' || entry.subject === subjectFilter
      const textBucket = [entry.title, ...(entry.tags || []), entry.schemaVersion || '']
        .join(' ')
        .toLowerCase()
      const queryMatched = !lowered || textBucket.includes(lowered)
      return subjectMatched && queryMatched
    })
  }, [libraryEntries, subjectFilter, query])

  const handleOpenEntry = async (entry) => {
    const subjectMeta = getSubjectMeta(entry.subject)
    if (!subjectMeta.route) return
    await saveLastOpenedPaper(activeProfileId, entry.subject, entry.rawText)
    navigate(subjectMeta.route)
  }

  const handleRename = async (entry) => {
    const nextTitle = window.prompt('请输入新的题库名称：', entry.title)
    if (!nextTitle) return
    await updateLibraryEntry(entry.id, { title: nextTitle })
    await refreshLibrary()
  }

  const handleTags = async (entry) => {
    const initialTags = Array.isArray(entry.tags) ? entry.tags.join(', ') : ''
    const rawTags = window.prompt('请输入标签，使用英文逗号分隔：', initialTags)
    if (rawTags === null) return
    const nextTags = rawTags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
    await updateLibraryEntry(entry.id, { tags: nextTags })
    await refreshLibrary()
  }

  const handleDelete = async (entry) => {
    const ok = window.confirm(`确定删除本地题库《${entry.title}》吗？`)
    if (!ok) return
    await deleteLibraryEntry(entry.id)
    await refreshLibrary()
  }

  return (
    <div className="app-shell">
      <div className="container dashboard-page">
        <section className="dashboard-hero left-hero">
          <div className="section-header-row no-margin">
            <h1 className="page-title-inline"><FolderOpen size={28} /> 本地题库库</h1>
            <div className="dashboard-action-row">
              <Link className="secondary-btn small-btn" to="/"><ArrowLeft size={16} /> 返回仪表盘</Link>
              <Link className="secondary-btn small-btn" to="/exam/english">进入英语模块</Link>
            </div>
          </div>
          <p>当前档案：{activeProfile?.name || '未命名档案'}。这里集中管理该档案下的本地题库文件，支持筛选、搜索、重命名、打标签和删除。</p>
        </section>

        <section className="profile-card compact-card">
          <div className="section-header-row">
            <h2><Search size={18} /> 筛选与搜索</h2>
          </div>
          <div className="library-filters-grid">
            <label className="form-field">
              <span>科目</span>
              <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
                <option value="all">全部科目</option>
                {SUBJECT_REGISTRY.map((subject) => (
                  <option key={subject.key} value={subject.key}>{subject.label}</option>
                ))}
              </select>
            </label>

            <label className="form-field grow">
              <span>关键词</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索题库名称、标签或 schema 版本"
              />
            </label>
          </div>
        </section>

        <section className="local-library-panel">
          <div className="section-header-row">
            <h2><FolderOpen size={18} /> 本地题库列表</h2>
            <span className="section-header-tip">{filteredEntries.length} 份</span>
          </div>

          {loading ? (
            <div className="local-library-empty">正在加载本地题库...</div>
          ) : filteredEntries.length === 0 ? (
            <div className="local-library-empty">当前筛选条件下没有本地题库。</div>
          ) : (
            <div className="local-library-list">
              {filteredEntries.map((entry) => {
                const subjectMeta = getSubjectMeta(entry.subject)
                return (
                  <article key={entry.id} className="local-library-item">
                    <div className="local-library-main">
                      <div className="record-title-row">
                        <div className="local-library-title">{entry.title}</div>
                        <span className="tag blue">{subjectMeta.shortLabel}</span>
                      </div>
                      <div className="local-library-meta">
                        <span>更新时间：{new Date(entry.updatedAt).toLocaleString()}</span>
                        <span>题量：{entry.questionCount || '--'}</span>
                        <span>Schema：{entry.schemaVersion || 'unknown'}</span>
                      </div>
                      {Array.isArray(entry.tags) && entry.tags.length > 0 && (
                        <div className="local-library-tags">
                          {entry.tags.map((tag) => (
                            <span key={tag} className="tag blue">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="local-library-actions">
                      {subjectMeta.route ? (
                        <button className="primary-btn small-btn" onClick={() => handleOpenEntry(entry)}>打开并导入</button>
                      ) : (
                        <button className="secondary-btn small-btn" disabled>暂不可打开</button>
                      )}
                      <button className="secondary-btn small-btn" onClick={() => handleRename(entry)}><Pencil size={14} /> 重命名</button>
                      <button className="secondary-btn small-btn" onClick={() => handleTags(entry)}><Tags size={14} /> 标签</button>
                      <button className="danger-btn small-btn" onClick={() => handleDelete(entry)}><Trash2 size={14} /> 删除</button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
