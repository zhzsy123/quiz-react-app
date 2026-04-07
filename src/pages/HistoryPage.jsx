import React from 'react'
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  BookX,
  Clock3,
  Eye,
  EyeOff,
  Filter,
  ListChecks,
  Pencil,
  Trash2,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { SUBJECT_REGISTRY, getSubjectMeta } from '../entities/subject/model/subjects'
import { useHistoryPageState } from '../features/history/model/useHistoryPageState'

function Sparkline({ values }) {
  if (!values.length) return <div className="sparkline-empty">暂无历史成绩</div>

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
  const {
    filteredAttempts,
    summary,
    trendValues,
    subjectFilter,
    setSubjectFilter,
    expandedAttemptId,
    setExpandedAttemptId,
    handleEditAttempt,
    handleDeleteAttempt,
    attemptDisplayTitle,
    buildAnswerRows,
  } = useHistoryPageState()

  return (
    <div className="app-shell">
      <div className="container dashboard-page">
        <section className="dashboard-hero left-hero compact-page-hero">
          <div className="section-header-row no-margin">
            <h1 className="page-title-inline">
              <ListChecks size={28} />
              历史考试记录
            </h1>
            <div className="dashboard-action-row">
              <Link className="secondary-btn small-btn" to="/">
                <ArrowLeft size={16} />
                返回首页
              </Link>
              <Link className="secondary-btn small-btn" to="/exam/english">
                <BookOpen size={16} />
                文件列表
              </Link>
              <Link className="secondary-btn small-btn" to="/wrong-book">
                <BookX size={16} />
                错题本
              </Link>
            </div>
          </div>
        </section>

        <section className="profile-card compact-card">
          <div className="section-header-row">
            <h2>
              <Filter size={18} />
              筛选
            </h2>
          </div>
          <div className="profile-controls one-row-controls">
            <label className="form-field filter-field">
              <span>科目</span>
              <select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)}>
                <option value="all">全部科目</option>
                {SUBJECT_REGISTRY.map((subject) => (
                  <option key={subject.key} value={subject.key}>
                    {subject.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="stats-grid">
          <article className="metric-card">
            <div className="metric-head">
              <Clock3 size={18} />
              历史考试次数
            </div>
            <div className="metric-value">{summary.totalAttempts}</div>
          </article>
          <article className="metric-card">
            <div className="metric-head">
              <BarChart3 size={18} />
              平均正确率
            </div>
            <div className="metric-value">{summary.averageRate}%</div>
          </article>
          <article className="metric-card">
            <div className="metric-head">
              <BookOpen size={18} />
              累计刷题量
            </div>
            <div className="metric-value">{summary.totalQuestions}</div>
          </article>
          <article className="metric-card">
            <div className="metric-head">
              <ListChecks size={18} />
              累计错题
            </div>
            <div className="metric-value">{summary.totalWrong}</div>
          </article>
        </section>

        <section className="trend-card">
          <div className="section-header-row">
            <h2>
              <BarChart3 size={18} />
              历史趋势
            </h2>
            <span className="section-header-tip">最近 {filteredAttempts.length} 次记录</span>
          </div>
          <div className="trend-body">
            <Sparkline values={trendValues} />
          </div>
        </section>

        <section className="record-list-card">
          <div className="section-header-row">
            <h2>
              <ListChecks size={18} />
              明细记录
            </h2>
            <span className="section-header-tip">按时间倒序排列</span>
          </div>

          {filteredAttempts.length === 0 ? (
            <div className="local-library-empty">暂无记录。</div>
          ) : (
            <div className="record-list">
              {filteredAttempts.map((attempt) => {
                const subjectMeta = getSubjectMeta(attempt.subject)
                const rate = attempt.objectiveTotal ? Math.round((attempt.objectiveScore / attempt.objectiveTotal) * 100) : 0
                const answerRows = buildAnswerRows(attempt)
                const expanded = expandedAttemptId === attempt.id

                return (
                  <article key={attempt.id} className="record-item record-item-expanded-shell">
                    <div className="record-main">
                      <div className="record-title-row">
                        <div className="record-title">{attemptDisplayTitle(attempt)}</div>
                        <span className="tag blue">{subjectMeta.shortLabel}</span>
                        {attempt.customTitle?.trim() && <span className="tag spoiler-tag">已改名</span>}
                      </div>
                      <div className="record-meta-grid">
                        <span>提交时间：{new Date(attempt.submittedAt).toLocaleString()}</span>
                        <span>客观题得分：{attempt.objectiveScore}/{attempt.objectiveTotal}</span>
                        <span>正确率：{rate}%</span>
                        <span>错题数：{attempt.wrongCount || 0}</span>
                        <span>总题量：{attempt.questionCount || 0}</span>
                      </div>
                      {attempt.notes && <div className="attempt-note">备注：{attempt.notes}</div>}
                    </div>

                    <div className="local-library-actions attempt-action-row">
                      <button className="secondary-btn small-btn" onClick={() => handleEditAttempt(attempt)}>
                        <Pencil size={14} />
                        编辑记录
                      </button>
                      <button className="secondary-btn small-btn" onClick={() => setExpandedAttemptId(expanded ? null : attempt.id)}>
                        {expanded ? <EyeOff size={14} /> : <Eye size={14} />}
                        {expanded ? '收起作答' : '查看作答'}
                      </button>
                      <button className="danger-btn small-btn" onClick={() => handleDeleteAttempt(attempt)}>
                        <Trash2 size={14} />
                        删除记录
                      </button>
                    </div>

                    {expanded && (
                      <div className="attempt-answer-panel">
                        {answerRows.length === 0 ? (
                          <div className="local-library-empty">这条旧记录还没有保存完整作答快照。</div>
                        ) : (
                          <div className="answer-review-grid">
                            {answerRows.map((row) => (
                              <article
                                key={row.key}
                                className={`answer-review-card ${row.type === 'subjective' ? 'subjective' : row.isCorrect ? 'correct' : 'wrong'}`}
                              >
                                {row.parentTitle && <div className="answer-review-parent">{row.parentTitle}</div>}
                                <div className="answer-review-prompt">{row.prompt}</div>
                                {row.type === 'subjective' ? (
                                  <>
                                    <div className="answer-review-line">
                                      <strong>你的作答：</strong>
                                      {row.userText || '未作答'}
                                    </div>
                                    <div className="answer-review-line">
                                      <strong>参考答案：</strong>
                                      {row.referenceText || '暂无参考答案'}
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="answer-review-line">
                                      <strong>你的答案：</strong>
                                      {row.userLabel}
                                    </div>
                                    <div className="answer-review-line">
                                      <strong>正确答案：</strong>
                                      {row.correctLabel}
                                    </div>
                                    <div className="answer-review-line">
                                      <strong>解析：</strong>
                                      {row.rationale}
                                    </div>
                                  </>
                                )}
                              </article>
                            ))}
                          </div>
                        )}
                      </div>
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
