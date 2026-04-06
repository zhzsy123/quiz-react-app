import React, { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, BarChart3, BookOpen, Clock3, Filter, ListChecks } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import { listAttempts } from '../utils/indexedDb'
import { SUBJECT_REGISTRY, getSubjectMeta } from '../config/subjects'

function Sparkline({ values }) {
  if (!values.length) {
    return <div className="sparkline-empty">暂无历史成绩</div>
  }

  const width = 260
  const height = 64
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const points = values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width
      const y = height - ((value - min) / range) * (height - 8) - 4
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function HistoryPage() {
  const { activeProfile, activeProfileId } = useAppContext()
  const [attempts, setAttempts] = useState([])
  const [subjectFilter, setSubjectFilter] = useState('all')

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

  const filteredAttempts = useMemo(() => {
    if (subjectFilter === 'all') return attempts
    return attempts.filter((item) => item.subject === subjectFilter)
  }, [attempts, subjectFilter])

  const trendValues = useMemo(() => {
    return filteredAttempts
      .slice()
      .reverse()
      .map((item) => (item.objectiveTotal ? Math.round((item.objectiveScore / item.objectiveTotal) * 100) : 0))
  }, [filteredAttempts])

  const summary = useMemo(() => {
    const totalAttempts = filteredAttempts.length
    const totalQuestions = filteredAttempts.reduce((sum, item) => sum + (item.questionCount || 0), 0)
    const totalWrong = filteredAttempts.reduce((sum, item) => sum + (item.wrongCount || 0), 0)
    const averageRate = totalAttempts
      ? Math.round(
          filteredAttempts.reduce((sum, item) => {
            if (!item.objectiveTotal) return sum
            return sum + (item.objectiveScore / item.objectiveTotal) * 100
          }, 0) / totalAttempts
        )
      : 0

    return { totalAttempts, totalQuestions, totalWrong, averageRate }
  }, [filteredAttempts])

  return (
    <div className="app-shell">
      <div className="container dashboard-page">
        <section className="dashboard-hero left-hero">
          <div className="section-header-row no-margin">
            <h1 className="page-title-inline"><ListChecks size={28} /> 历史考试记录</h1>
            <div className="dashboard-action-row">
              <Link className="secondary-btn small-btn" to="/"><ArrowLeft size={16} /> 返回仪表盘</Link>
              <Link className="secondary-btn small-btn" to="/exam/english"><BookOpen size={16} /> 进入英语模块</Link>
            </div>
          </div>
          <p>当前档案：{activeProfile?.name || '未命名档案'}。本页展示本地持久化的历史考试记录、趋势和分科目概览。</p>
        </section>

        <section className="profile-card compact-card">
          <div className="section-header-row">
            <h2><Filter size={18} /> 筛选</h2>
          </div>
          <div className="profile-controls one-row-controls">
            <label className="form-field filter-field">
              <span>科目</span>
              <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
                <option value="all">全部科目</option>
                {SUBJECT_REGISTRY.map((subject) => (
                  <option key={subject.key} value={subject.key}>{subject.label}</option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="stats-grid">
          <article className="metric-card">
            <div className="metric-head"><Clock3 size={18} /> 历史考试次数</div>
            <div className="metric-value">{summary.totalAttempts}</div>
            <div className="metric-subtext">当前筛选条件下的总记录数</div>
          </article>
          <article className="metric-card">
            <div className="metric-head"><BarChart3 size={18} /> 平均正确率</div>
            <div className="metric-value">{summary.averageRate}%</div>
            <div className="metric-subtext">按客观题得分率统计</div>
          </article>
          <article className="metric-card">
            <div className="metric-head"><BookOpen size={18} /> 累计刷题量</div>
            <div className="metric-value">{summary.totalQuestions}</div>
            <div className="metric-subtext">当前筛选条件下的题量总和</div>
          </article>
          <article className="metric-card">
            <div className="metric-head"><ListChecks size={18} /> 累计错题</div>
            <div className="metric-value">{summary.totalWrong}</div>
            <div className="metric-subtext">当前筛选条件下的客观题错题总数</div>
          </article>
        </section>

        <section className="trend-card">
          <div className="section-header-row">
            <h2><BarChart3 size={18} /> 历史趋势</h2>
            <span className="section-header-tip">最近 {filteredAttempts.length} 次记录</span>
          </div>
          <div className="trend-body">
            <Sparkline values={trendValues} />
          </div>
        </section>

        <section className="record-list-card">
          <div className="section-header-row">
            <h2><ListChecks size={18} /> 明细记录</h2>
            <span className="section-header-tip">按时间倒序排列</span>
          </div>

          {filteredAttempts.length === 0 ? (
            <div className="local-library-empty">当前筛选条件下还没有历史考试记录。</div>
          ) : (
            <div className="record-list">
              {filteredAttempts.map((attempt) => {
                const subjectMeta = getSubjectMeta(attempt.subject)
                const rate = attempt.objectiveTotal
                  ? Math.round((attempt.objectiveScore / attempt.objectiveTotal) * 100)
                  : 0

                return (
                  <article key={attempt.id} className="record-item">
                    <div className="record-main">
                      <div className="record-title-row">
                        <div className="record-title">{attempt.title || '未命名试卷'}</div>
                        <span className="tag blue">{subjectMeta.shortLabel}</span>
                      </div>
                      <div className="record-meta-grid">
                        <span>提交时间：{new Date(attempt.submittedAt).toLocaleString()}</span>
                        <span>客观题得分：{attempt.objectiveScore}/{attempt.objectiveTotal}</span>
                        <span>正确率：{rate}%</span>
                        <span>错题数：{attempt.wrongCount || 0}</span>
                        <span>总题量：{attempt.questionCount || 0}</span>
                      </div>
                    </div>
                    {subjectMeta.route && (
                      <Link className="secondary-btn small-btn" to={subjectMeta.route}>进入该模块</Link>
                    )}
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
