import React, { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, BookOpen, BookX, CheckCircle2, Filter, Play, RotateCcw, Search, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import { listAttempts } from '../utils/indexedDb'
import { loadMasteredWrongMap, markWrongQuestionMastered } from '../utils/wrongBookStore'
import { SUBJECT_REGISTRY, getSubjectMeta } from '../config/subjects'

function attemptDisplayTitle(attempt) {
  return attempt.customTitle?.trim() || attempt.title || '未命名试卷'
}

function getWrongItemCategory(item) {
  if (item.parentType === 'reading' || item.sourceType === 'reading') return 'reading'
  if (item.sourceType === 'cloze' || item.source_type === 'cloze' || String(item.contextTitle || '').includes('完形') || (item.tags || []).some((tag) => String(tag).toLowerCase() === 'cloze')) {
    return 'cloze'
  }
  return 'single_choice'
}

function renderOptionLabel(option) {
  if (typeof option === 'string') return option
  return `${option.key}. ${option.text}`
}

export default function WrongBookPage() {
  const { activeProfileId } = useAppContext()
  const [attempts, setAttempts] = useState([])
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [masteredMap, setMasteredMap] = useState({})
  const [practiceMode, setPracticeMode] = useState(false)
  const [practiceIndex, setPracticeIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState('')
  const [feedback, setFeedback] = useState('')
  const [holdSolvedItem, setHoldSolvedItem] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function loadData() {
      if (!activeProfileId) return
      const [rows, mastered] = await Promise.all([listAttempts(activeProfileId), loadMasteredWrongMap(activeProfileId, 'english')])
      if (!cancelled) {
        setAttempts(rows)
        setMasteredMap(mastered)
      }
    }
    loadData()
    return () => { cancelled = true }
  }, [activeProfileId])

  const wrongSourceItems = useMemo(() => attempts.flatMap((attempt) => {
    const rows = Array.isArray(attempt.wrongItems) ? attempt.wrongItems : []
    return rows.map((row) => ({ ...row, attemptId: attempt.id, attemptTitle: attemptDisplayTitle(attempt), lastWrongAt: attempt.submittedAt, category: getWrongItemCategory(row) }))
  }), [attempts])

  const aggregatedWrongItems = useMemo(() => {
    const map = new Map()
    wrongSourceItems.forEach((item) => {
      const key = item.questionKey || `${item.subject}:${item.paperId}:${item.questionId || item.prompt}`
      const existing = map.get(key)
      if (!existing) {
        map.set(key, { ...item, wrongTimes: 1, latestAttemptTitle: item.attemptTitle })
        return
      }
      existing.wrongTimes += 1
      if (item.lastWrongAt > existing.lastWrongAt) {
        Object.assign(existing, { ...existing, ...item, wrongTimes: existing.wrongTimes, latestAttemptTitle: item.attemptTitle })
      }
    })
    return Array.from(map.values()).filter((item) => !masteredMap[item.questionKey] || masteredMap[item.questionKey] < item.lastWrongAt).sort((a, b) => b.lastWrongAt - a.lastWrongAt)
  }, [wrongSourceItems, masteredMap])

  const filteredWrongItems = useMemo(() => {
    const lowered = query.trim().toLowerCase()
    return aggregatedWrongItems.filter((item) => {
      const subjectMatched = subjectFilter === 'all' || item.subject === subjectFilter
      const typeMatched = typeFilter === 'all' || item.category === typeFilter
      const bucket = [item.prompt, item.contextTitle, item.contextSnippet, ...(item.tags || [])].join(' ').toLowerCase()
      const queryMatched = !lowered || bucket.includes(lowered)
      return subjectMatched && typeMatched && queryMatched
    })
  }, [aggregatedWrongItems, subjectFilter, typeFilter, query])

  const currentPracticeItem = practiceMode ? filteredWrongItems[practiceIndex] || null : null
  const displayPracticeItem = holdSolvedItem || currentPracticeItem

  useEffect(() => {
    if (!practiceMode) return
    if (practiceIndex >= filteredWrongItems.length) {
      setPracticeIndex(Math.max(filteredWrongItems.length - 1, 0))
    }
  }, [filteredWrongItems.length, practiceIndex, practiceMode])

  useEffect(() => {
    setSelectedAnswer('')
    setFeedback('')
    if (!holdSolvedItem) return
  }, [practiceIndex, practiceMode])

  const handleMarkMastered = async (item) => {
    if (!activeProfileId) return
    const next = await markWrongQuestionMastered(activeProfileId, item.subject, item.questionKey)
    setMasteredMap(next)
  }

  const handlePracticeAnswer = async (optionKey) => {
    if (!displayPracticeItem || holdSolvedItem) return
    setSelectedAnswer(optionKey)
    if (optionKey === displayPracticeItem.correctAnswer) {
      setFeedback('回答正确，已从错题本移除。')
      setHoldSolvedItem(displayPracticeItem)
      await handleMarkMastered(displayPracticeItem)
      return
    }
    setFeedback('回答错误，可以继续尝试。')
  }

  const handleAdvanceAfterSolved = () => {
    setHoldSolvedItem(null)
    setSelectedAnswer('')
    setFeedback('')
    if (practiceIndex >= filteredWrongItems.length && filteredWrongItems.length > 0) {
      setPracticeIndex(filteredWrongItems.length - 1)
    }
  }

  const resetPractice = () => {
    setPracticeIndex(0)
    setSelectedAnswer('')
    setFeedback('')
    setHoldSolvedItem(null)
  }

  const wrongSummary = {
    totalWrongRecords: wrongSourceItems.length,
    uniqueWrongQuestions: aggregatedWrongItems.length,
    filteredCount: filteredWrongItems.length,
    latestWrongAt: filteredWrongItems[0]?.lastWrongAt || null,
  }

  return (
    <div className="app-shell">
      <div className="container dashboard-page">
        <section className="dashboard-hero left-hero compact-page-hero">
          <div className="section-header-row no-margin">
            <h1 className="page-title-inline"><BookX size={28} /> 错题本</h1>
            <div className="dashboard-action-row">
              <Link className="secondary-btn small-btn" to="/"><ArrowLeft size={16} /> 返回首页</Link>
              <Link className="secondary-btn small-btn" to="/history">历史记录</Link>
              <Link className="secondary-btn small-btn" to="/exam/english"><BookOpen size={16} /> 文件列表</Link>
            </div>
          </div>
        </section>

        <section className="profile-card compact-card">
          <div className="section-header-row">
            <h2><Filter size={18} /> 筛选与搜索</h2>
            <div className="dashboard-action-row">
              {practiceMode ? <button className="secondary-btn small-btn" onClick={() => setPracticeMode(false)}><RotateCcw size={14} /> 退出练习</button> : <button className="primary-btn small-btn" onClick={() => { setPracticeMode(true); setPracticeIndex(0) }} disabled={filteredWrongItems.length === 0}><Play size={14} /> 开始刷错题</button>}
            </div>
          </div>
          <div className="wrongbook-filter-grid">
            <label className="form-field"><span>科目</span><select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}><option value="all">全部科目</option>{SUBJECT_REGISTRY.map((subject) => <option key={subject.key} value={subject.key}>{subject.label}</option>)}</select></label>
            <label className="form-field"><span>题型</span><select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}><option value="all">全部题型</option><option value="single_choice">单项选择</option><option value="cloze">完形填空</option><option value="reading">阅读理解</option></select></label>
            <label className="form-field grow"><span>关键词</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索题干、阅读标题、标签或上下文" /></label>
          </div>
        </section>

        <section className="wrongbook-summary-grid">
          <article className="metric-card"><div className="metric-head"><BookX size={18} /> 错题记录总数</div><div className="metric-value">{wrongSummary.totalWrongRecords}</div></article>
          <article className="metric-card"><div className="metric-head"><Search size={18} /> 唯一错题数</div><div className="metric-value">{wrongSummary.uniqueWrongQuestions}</div></article>
          <article className="metric-card"><div className="metric-head"><Filter size={18} /> 当前筛选结果</div><div className="metric-value">{wrongSummary.filteredCount}</div></article>
          <article className="metric-card"><div className="metric-head"><BookOpen size={18} /> 最近错题时间</div><div className="metric-value small-metric-value">{wrongSummary.latestWrongAt ? new Date(wrongSummary.latestWrongAt).toLocaleDateString() : '--'}</div></article>
        </section>

        {practiceMode && (
          <section className="record-list-card wrongbook-practice-panel">
            <div className="section-header-row"><h2><Play size={18} /> 错题练习器</h2><span className="section-header-tip">{filteredWrongItems.length > 0 ? `第 ${Math.min(practiceIndex + 1, Math.max(filteredWrongItems.length, 1))} / ${filteredWrongItems.length}` : '已无待练习错题'}</span></div>
            {!displayPracticeItem ? (
              <div className="local-library-empty">当前筛选条件下已经没有待练习错题了。</div>
            ) : (
              <div className="wrongbook-practice-card">
                <div className="wrongbook-card-head"><div><div className="wrongbook-card-title">{displayPracticeItem.prompt}</div><div className="wrongbook-meta"><span>{getSubjectMeta(displayPracticeItem.subject).shortLabel}</span><span>题型：{displayPracticeItem.category === 'reading' ? '阅读理解' : displayPracticeItem.category === 'cloze' ? '完形填空' : '单项选择'}</span><span>来源：{displayPracticeItem.latestAttemptTitle || displayPracticeItem.paperTitle}</span></div></div></div>
                {displayPracticeItem.contextTitle && <div className="wrongbook-context"><strong>{displayPracticeItem.contextTitle}</strong>{displayPracticeItem.contextSnippet ? `：${displayPracticeItem.contextSnippet}` : ''}</div>}
                <div className="options">
                  {(displayPracticeItem.options || []).map((option, index) => {
                    const selected = selectedAnswer === option.key
                    let className = 'option'
                    let icon = null
                    const lockAnswering = Boolean(holdSolvedItem)
                    if (selected) className += ' selected'
                    if (selectedAnswer) {
                      if (option.key === displayPracticeItem.correctAnswer) {
                        className += ' correct'
                        icon = <CheckCircle2 size={18} />
                      } else if (selected) {
                        className += ' wrong'
                        icon = <XCircle size={18} />
                      }
                    }
                    return <button key={index} className={className} disabled={lockAnswering} onClick={() => handlePracticeAnswer(option.key)}><span>{renderOptionLabel(option)}</span>{icon}</button>
                  })}
                </div>
                {feedback && <div className="practice-feedback">{feedback}</div>}
                {selectedAnswer && selectedAnswer !== displayPracticeItem.correctAnswer && <div className="analysis-box"><div><strong>正确答案：</strong>{displayPracticeItem.correctAnswerLabel || displayPracticeItem.correctAnswer || '--'}</div><div><strong>解析：</strong>{displayPracticeItem.rationale || '暂无解析'}</div></div>}
                <div className="question-actions">
                  <button className="secondary-btn" onClick={() => setPracticeIndex((value) => Math.max(value - 1, 0))} disabled={practiceIndex <= 0 || Boolean(holdSolvedItem)}>上一题</button>
                  {holdSolvedItem ? (
                    <button className="secondary-btn" onClick={handleAdvanceAfterSolved}>下一题</button>
                  ) : (
                    <button className="secondary-btn" onClick={() => setPracticeIndex((value) => Math.min(value + 1, Math.max(filteredWrongItems.length - 1, 0)))} disabled={practiceIndex >= filteredWrongItems.length - 1}>下一题</button>
                  )}
                  <button className="secondary-btn" onClick={resetPractice}><RotateCcw size={14} /> 重新开始</button>
                </div>
              </div>
            )}
          </section>
        )}

        {!practiceMode && (
          <section className="record-list-card">
            <div className="section-header-row"><h2><BookX size={18} /> 错题列表</h2><span className="section-header-tip">按最近出错时间倒序排列</span></div>
            {filteredWrongItems.length === 0 ? (
              <div className="local-library-empty">当前还没有可展示的错题。</div>
            ) : (
              <div className="wrongbook-list">
                {filteredWrongItems.map((item) => {
                  const subjectMeta = getSubjectMeta(item.subject)
                  return (
                    <article key={item.questionKey} className="wrongbook-card">
                      <div className="wrongbook-card-head"><div><div className="wrongbook-card-title">{item.prompt}</div><div className="wrongbook-meta"><span>{subjectMeta.shortLabel}</span><span>题型：{item.category === 'reading' ? '阅读理解' : item.category === 'cloze' ? '完形填空' : '单项选择'}</span><span>错题次数 {item.wrongTimes}</span><span>最近出错：{new Date(item.lastWrongAt).toLocaleString()}</span><span>来源：{item.latestAttemptTitle || item.paperTitle}</span></div></div>{Array.isArray(item.tags) && item.tags.length > 0 && <div className="wrongbook-tags">{item.tags.slice(0, 4).map((tag) => <span key={tag} className="tag blue">{tag}</span>)}</div>}</div>
                      {item.contextTitle && <div className="wrongbook-context"><strong>{item.contextTitle}</strong>{item.contextSnippet ? `：${item.contextSnippet}` : ''}</div>}
                      <div className="wrongbook-answer-compare"><div className="wrongbook-answer-pill wrong"><span>你的答案</span><strong>{item.userAnswerLabel || '未作答'}</strong></div><div className="wrongbook-answer-pill correct"><span>正确答案</span><strong>{item.correctAnswerLabel || item.correctAnswer || '--'}</strong></div></div>
                      <div className="wrongbook-rationale">解析：{item.rationale || '暂无解析'}</div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
