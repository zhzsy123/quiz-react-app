import React, { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Play, Search, Star, Trash2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppContext } from '../app/providers/AppContext'
import { loadFavoriteEntries, removeFavoriteEntry } from '../shared/lib/storage/storageFacade'
import { SUBJECT_REGISTRY, getSubjectMeta } from '../entities/subject/model/subjects'

function formatType(entry) {
  if (entry.itemType === 'reading') return '阅读理解'
  if (entry.itemType === 'translation') return '翻译题'
  if (entry.itemType === 'short_answer') return '简答题'
  if (entry.itemType === 'case_analysis') return '案例分析'
  if (entry.itemType === 'calculation') return '计算题'
  if (entry.itemType === 'operation') return '操作题'
  if (entry.itemType === 'essay') return '作文题'
  if (entry.sourceType === 'cloze') return '完形填空'
  return '单项选择'
}

export default function FavoritesPage() {
  const { activeProfile, activeProfileId } = useAppContext()
  const navigate = useNavigate()
  const [entries, setEntries] = useState([])
  const [query, setQuery] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('all')

  const refreshEntries = async () => {
    if (!activeProfileId) return
    const groups = await Promise.all(SUBJECT_REGISTRY.map((subject) => loadFavoriteEntries(activeProfileId, subject.key)))
    setEntries(groups.flat().sort((a, b) => (b.favoritedAt || 0) - (a.favoritedAt || 0)))
  }

  useEffect(() => {
    void refreshEntries()
  }, [activeProfileId])

  const filteredEntries = useMemo(() => {
    const lowered = query.trim().toLowerCase()
    return entries.filter((entry) => {
      const subjectMatched = subjectFilter === 'all' || entry.subject === subjectFilter
      if (!subjectMatched) return false
      if (!lowered) return true
      const bucket = [entry.prompt, entry.paperTitle, entry.contextTitle, ...(entry.tags || [])].join(' ').toLowerCase()
      return bucket.includes(lowered)
    })
  }, [entries, query, subjectFilter])

  const handleRemove = async (entry) => {
    if (!activeProfileId) return
    await removeFavoriteEntry(activeProfileId, entry.subject, entry.questionKey)
    await refreshEntries()
  }

  const handleStartPractice = () => {
    const targetSubjectKey = subjectFilter !== 'all' ? subjectFilter : filteredEntries[0]?.subject
    if (!targetSubjectKey) return
    const subjectMeta = getSubjectMeta(targetSubjectKey)
    navigate(`/workspace/${subjectMeta.routeSlug}?source=favorites&mode=practice`)
  }

  return (
    <div className="app-shell">
      <div className="container dashboard-page">
        <section className="dashboard-hero left-hero compact-page-hero">
          <div className="section-header-row no-margin">
            <h1 className="page-title-inline"><Star size={28} /> 收藏夹</h1>
            <div className="dashboard-action-row">
              <Link className="secondary-btn small-btn" to="/"><ArrowLeft size={16} /> 返回首页</Link>
              <button className="primary-btn small-btn" onClick={handleStartPractice} disabled={filteredEntries.length === 0}><Play size={14} /> 刷收藏</button>
            </div>
          </div>
        </section>

        <section className="profile-card compact-card">
          <div className="section-header-row">
            <h2><Search size={18} /> 检索</h2>
            <span className="section-header-tip">{filteredEntries.length} 题</span>
          </div>
          <div className="library-filters-grid">
            <label className="form-field">
              <span>科目</span>
              <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
                <option value="all">全部科目</option>
                {SUBJECT_REGISTRY.map((subject) => <option key={subject.key} value={subject.key}>{subject.label}</option>)}
              </select>
            </label>
            <label className="form-field grow">
              <span>关键词</span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索题干、来源或标签" />
            </label>
          </div>
        </section>

        <section className="record-list-card">
          <div className="section-header-row">
            <h2><Star size={18} /> 收藏列表</h2>
          </div>
          {filteredEntries.length === 0 ? (
            <div className="local-library-empty">当前还没有收藏题目。</div>
          ) : (
            <div className="wrongbook-list">
              {filteredEntries.map((entry) => (
                <article key={entry.questionKey} className="wrongbook-card">
                  <div className="wrongbook-card-head">
                    <div>
                      <div className="wrongbook-card-title">{entry.prompt}</div>
                      <div className="wrongbook-meta">
                        <span>{getSubjectMeta(entry.subject).shortLabel}</span>
                        <span>{formatType(entry)}</span>
                        <span>{entry.paperTitle || '未命名来源'}</span>
                      </div>
                    </div>
                    <button className="danger-btn small-btn" onClick={() => handleRemove(entry)}><Trash2 size={14} /> 移除</button>
                  </div>
                  {entry.contextTitle && <div className="wrongbook-context"><strong>{entry.contextTitle}</strong>{entry.contextSnippet ? `：${entry.contextSnippet}` : ''}</div>}
                  {Array.isArray(entry.tags) && entry.tags.length > 0 && (
                    <div className="wrongbook-tags">
                      {entry.tags.slice(0, 5).map((tag) => <span key={tag} className="tag blue">{tag}</span>)}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
