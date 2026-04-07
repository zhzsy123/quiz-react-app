import React, { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Play, Search, Star, Trash2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import { loadFavoriteEntries, removeFavoriteEntry } from '../boundaries/storageFacade'

const SUBJECT_KEY = 'english'

function formatType(entry) {
  if (entry.itemType === 'reading') return '阅读理解'
  if (entry.itemType === 'translation') return '翻译题'
  if (entry.itemType === 'essay') return '作文题'
  if (entry.sourceType === 'cloze') return '完形填空'
  return '单项选择'
}

export default function FavoritesPage() {
  const { activeProfile, activeProfileId } = useAppContext()
  const navigate = useNavigate()
  const [entries, setEntries] = useState([])
  const [query, setQuery] = useState('')

  const refreshEntries = async () => {
    if (!activeProfileId) return
    const rows = await loadFavoriteEntries(activeProfileId, SUBJECT_KEY)
    setEntries(rows)
  }

  useEffect(() => {
    void refreshEntries()
  }, [activeProfileId])

  const filteredEntries = useMemo(() => {
    const lowered = query.trim().toLowerCase()
    return entries.filter((entry) => {
      if (!lowered) return true
      const bucket = [entry.prompt, entry.paperTitle, entry.contextTitle, ...(entry.tags || [])].join(' ').toLowerCase()
      return bucket.includes(lowered)
    })
  }, [entries, query])

  const handleRemove = async (entry) => {
    if (!activeProfileId) return
    await removeFavoriteEntry(activeProfileId, SUBJECT_KEY, entry.questionKey)
    await refreshEntries()
  }

  const handleStartPractice = () => {
    navigate('/workspace/english?source=favorites&mode=practice')
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
          <div className="library-filters-grid single-search-grid">
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
