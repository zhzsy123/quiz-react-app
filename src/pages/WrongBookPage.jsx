import React, { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, BookOpen, BookX, Filter, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import { listAttempts } from '../utils/indexedDb'
import { SUBJECT_REGISTRY, getSubjectMeta } from '../config/subjects'

function attemptDisplayTitle(attempt) {
  return attempt.customTitle?.trim() || attempt.title || '未命名试卷'
}

export default function WrongBookPage() {
  const { activeProfile, activeProfileId } = useAppContext()
  const [attempts, setAttempts] = useState([])
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadAttempts() {
      if (!activeProfileId) return
      const rows = await listAttempts(activeProfileId)
      if (!cancelled) setAttempts(rows)
    }

    loadAttempts()
    return () => {
      cancelled = true
    }
  }, [activeProfileId])

  const wrongSourceItems = useMemo(() => {
    return attempts.flatMap((attempt) => {
      const rows = Array.isArray(attempt.wrongItems) ? attempt.wrongItems : []
      return rows.map((row) => ({
        ...row,
        attemptId: attempt.id,
        attemptTitle: attemptDisplayTitle(attempt),
        lastWrongAt: attempt.submittedAt,
      }))
    })
  }, [attempts])

  const aggregatedWrongItems = useMemo(() => {
    const map = new Map()

    wrongSourceItems.forEach((item) => {
      const key = item.questionKey || `${item.subject}:${item.paperId}:${item.questionId || item.prompt}`
      const existing = map.get(key)

      if (!existing) {
        map.set(key, {
          ...item,
          wrongTimes: 1,
          latestAttemptTitle: item.attemptTitle,
        })
        return
      }

      existing.wrongTimes += 1
      if (item.lastWrongAt > existing.lastWrongAt) {
        Object.assign(existing, {
          ...existing,
          ...item,
          wrongTimes: existing.wrongTimes,
          latestAttemptTitle: item.attemptTitle,
        })
      }
    })

    return Array.from(map.values()).sort((a, b) => b.lastWrongAt - a.lastWrongAt)
  }, [wrongSourceItems])

  const filteredWrongItems = useMemo(() => {
    const lowered = query.trim().toLowerCase()
    return aggregatedWrongItems.filter((item) => {
      const subjectMatched = subjectFilter === 'all' || item.subject === subjectFilter
      const bucket = [item.prompt, item.contextTitle, item.contextSnippet, ...(item.tags || [])]
        .join(' ')
        .toLowerCase()
      const queryMatched = !lowered || bucket.includes(lowered)
      return subjectMatched && queryMatched
    })
  }, [aggregatedWrongItems, subjectFilter, query])

  const wrongSummary = useMemo(() => {
    return {
      totalWrongRecords: wrongSourceItems.length,
      uniqueWrongQuestions: aggregatedWrongItems.length,
      filteredCount: filteredWrongItems.length,
      latestWrongAt: filteredWrongItems[0]?.lastWrongAt || null,
    }
  }, [wrongSourceItems, aggregatedWrongItems, filteredWrongItems])

  return (
    <div className="app-shell">
      <div className="container dashboard-page">
        <section className="dashboard-hero left-hero">
          <div className="section-header-row no-margin">
            <h1 className="page-title-inline"><BookX size={28} /> 错题本</h1>
            <div className="dashboard-action-row">
              <Link className="secondary-btn small-btn" to="/"><ArrowLeft size={16} /> 返回仪表盘</Link>
              <Link className="secondary-btn small-btn" to="/history">历史考试记录</Link>
              <Link className="secondary-btn small-btn" to="/exam/english"><BookOpen size={16} /> 进入英语模块</Link>
            </div>
          </div>
          <p>当前档案：{activeProfile?.name || '未命名档案'}。这里聚合了本地考试记录中的客观题错题。之后的新考试会自动写入完整作答快照与错题明细。</p>
        </section>

        <section className="profile-card compact-card">
          <div className="section-header-row">
            <h2><Filter size={18} /> 筛选与搜索</h2>
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
                placeholder="搜索题干、阅读标题、标签或上下文"
              />
            </label>
          </div>
        </section>

        <section className="wrongbook-summary-grid">
          <article className="metric-card">
            <div className="metric-head"><BookX size={18} /> 错题记录总数</div>
            <div className="metric-value">{wrongSummary.totalWrongRecords}</div>
            <div className="metric-subtext">所有历史考试中累计产生的错题条目数</div>
          </article>
          <article className="metric-card">
            <div className="metric-head"><Search size={18} /> 唯一错题数</div>
            <div className="metric-value">{wrongSummary.uniqueWrongQuestions}</div>
            <div className="metric-subtext">按题目键聚合后的唯一错题数</div>
          </article>
          <article className="metric-card">
            <div className="metric-head"><Filter size={18} /> 当前筛选结果</div>
            <div className="metric-value">{wrongSummary.filteredCount}</div>
            <div className="metric-subtext">当前筛选条件下展示的错题数</div>
          </article>
          <article className="metric-card">
            <div className="metric-head"><BookOpen size={18} /> 最近错题时间</div>
            <div className="metric-value small-metric-value">
              {wrongSummary.latestWrongAt ? new Date(wrongSummary.latestWrongAt).toLocaleDateString() : '--'}
            </div>
            <div className="metric-subtext">错题本中最近一次产生错题的时间</div>
          </article>
        </section>

        <section className="record-list-card">
          <div className="section-header-row">
            <h2><BookX size={18} /> 错题列表</h2>
            <span className="section-header-tip">按最近出错时间倒序排列</span>
          </div>

          {filteredWrongItems.length === 0 ? (
            <div className="local-library-empty">当前还没有可展示的错题。若你之前的考试记录还没有保存错题快照，之后的新考试会自动补齐。</div>
          ) : (
            <div className="wrongbook-list">
              {filteredWrongItems.map((item) => {
                const subjectMeta = getSubjectMeta(item.subject)
                return (
                  <article key={item.questionKey} className="wrongbook-card">
                    <div className="wrongbook-card-head">
                      <div>
                        <div className="wrongbook-card-title">{item.prompt}</div>
                        <div className="wrongbook-meta">
                          <span>{subjectMeta.shortLabel}</span>
                          <span>错题次数 {item.wrongTimes}</span>
                          <span>最近出错：{new Date(item.lastWrongAt).toLocaleString()}</span>
                          <span>来源：{item.latestAttemptTitle || item.paperTitle}</span>
                        </div>
                      </div>
                      {Array.isArray(item.tags) && item.tags.length > 0 && (
                        <div className="wrongbook-tags">
                          {item.tags.slice(0, 4).map((tag) => (
                            <span key={tag} className="tag blue">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    {item.contextTitle && (
                      <div className="wrongbook-context">
                        <strong>{item.contextTitle}</strong>
                        {item.contextSnippet ? `：${item.contextSnippet}` : ''}
                      </div>
                    )}

                    <div className="wrongbook-answer-compare">
                      <div className="wrongbook-answer-pill wrong">
                        <span>你的答案</span>
                        <strong>{item.userAnswerLabel || '未作答'}</strong>
                      </div>
                      <div className="wrongbook-answer-pill correct">
                        <span>正确答案</span>
                        <strong>{item.correctAnswerLabel || item.correctAnswer || '--'}</strong>
                      </div>
                    </div>

                    <div className="wrongbook-rationale">解析：{item.rationale || '暂无解析'}</div>
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
