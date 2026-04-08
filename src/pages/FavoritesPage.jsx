import React from 'react'
import { ArrowLeft, Play, Search, Star, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SUBJECT_REGISTRY, getSubjectMeta } from '../entities/subject/model/subjects'
import { formatFavoriteType, useFavoritesPageState } from '../features/favorites/model/useFavoritesPageState'

export default function FavoritesPage() {
  const {
    filteredEntries,
    query,
    setQuery,
    subjectFilter,
    setSubjectFilter,
    canStartPractice,
    handleRemove,
    handleStartPractice,
  } = useFavoritesPageState()

  return (
    <div className="app-shell">
      <div className="container dashboard-page">
        <section className="dashboard-hero left-hero compact-page-hero">
          <div className="section-header-row no-margin">
            <h1 className="page-title-inline"><Star size={28} /> Favorites</h1>
            <div className="dashboard-action-row">
              <Link className="secondary-btn small-btn" to="/"><ArrowLeft size={16} /> Back home</Link>
              <button className="primary-btn small-btn" onClick={handleStartPractice} disabled={!canStartPractice}><Play size={14} /> Start practice</button>
            </div>
          </div>
        </section>

        <section className="profile-card compact-card">
          <div className="section-header-row">
            <h2><Search size={18} /> Search</h2>
            <span className="section-header-tip">{filteredEntries.length} items</span>
          </div>
          <div className="library-filters-grid">
            <label className="form-field">
              <span>Subject</span>
              <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
                <option value="all">All subjects</option>
                {SUBJECT_REGISTRY.map((subject) => <option key={subject.key} value={subject.key}>{subject.label}</option>)}
              </select>
            </label>
            <label className="form-field grow">
              <span>Keyword</span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search prompt, source, or tags" />
            </label>
          </div>
        </section>

        <section className="record-list-card">
          <div className="section-header-row">
            <h2><Star size={18} /> Favorite list</h2>
          </div>
          {filteredEntries.length === 0 ? (
            <div className="local-library-empty">No favorite items yet.</div>
          ) : (
            <div className="wrongbook-list">
              {filteredEntries.map((entry) => (
                <article key={entry.questionKey} className="wrongbook-card">
                  <div className="wrongbook-card-head">
                    <div>
                      <div className="wrongbook-card-title">{entry.prompt}</div>
                      <div className="wrongbook-meta">
                        <span>{getSubjectMeta(entry.subject).shortLabel}</span>
                        <span>{formatFavoriteType(entry)}</span>
                        <span>{entry.paperTitle || 'Untitled source'}</span>
                      </div>
                    </div>
                    <button className="danger-btn small-btn" onClick={() => handleRemove(entry)}><Trash2 size={14} /> Remove</button>
                  </div>
                  {entry.contextTitle && (
                    <div className="wrongbook-context">
                      <strong>{entry.contextTitle}</strong>
                      {entry.contextSnippet ? `: ${entry.contextSnippet}` : ''}
                    </div>
                  )}
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
