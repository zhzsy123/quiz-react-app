import React from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  BookX,
  CheckCircle2,
  Download,
  Filter,
  Play,
  RotateCcw,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAppContext } from '../app/providers/AppContext'
import { SUBJECT_REGISTRY, getSubjectMeta } from '../entities/subject/model/subjects'
import { exportWrongbookDiagnostics } from '../entities/wrongbook/api/wrongbookDiagnostics'
import { listAllWrongbookEntries } from '../entities/wrongbook/api/wrongbookRepository'
import {
  buildWrongBookEntryDisplayModel,
  formatWrongBookDisplayValue,
  getWrongItemCategoryLabel,
  renderWrongBookOptionLabel,
  useWrongBookPageState,
} from '../features/wrong-book/model/useWrongBookPageState'

function downloadJsonFile(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function WrongBookValueBlock({ value = '', codeLike = false, emptyLabel = '暂无内容' }) {
  if (!value) {
    return <span>{emptyLabel}</span>
  }

  if (codeLike || value.includes('\n')) {
    return <pre className="answer-review-code">{value}</pre>
  }

  return <span>{value}</span>
}

function WrongBookStructuredAnswer({ item }) {
  const display = buildWrongBookEntryDisplayModel(item)

  return (
    <>
      {display.compositePrompt && (
        <div className="wrongbook-context">
          <strong>母题题干</strong>
          {`：${display.compositePrompt}`}
        </div>
      )}

      {display.compositeMaterialText && (
        <div className="analysis-box compact-analysis-box">
          <div className="answer-review-line stacked">
            <strong>{display.compositeMaterialTitle || '题目材料'}</strong>
            <WrongBookValueBlock
              value={display.compositeMaterialText}
              codeLike={display.compositeMaterialCodeLike}
              emptyLabel="暂无材料"
            />
          </div>
        </div>
      )}

      {display.contextText && (
        <div className="wrongbook-context">
          <strong>{display.contextTitle || '作答背景'}</strong>
          <WrongBookValueBlock value={display.contextText} codeLike={display.contextCodeLike} emptyLabel="暂无背景" />
        </div>
      )}

      <div className="analysis-box compact-analysis-box">
        <div className="answer-review-line stacked">
          <strong>你的答案</strong>
          <WrongBookValueBlock value={display.userAnswerText} codeLike={display.codeLike} emptyLabel="未记录" />
        </div>
        <div className="answer-review-line stacked">
          <strong>参考答案</strong>
          <WrongBookValueBlock value={display.correctText} codeLike={display.codeLike} emptyLabel="见题目配置" />
        </div>
        <div className="answer-review-line stacked">
          <strong>解析</strong>
          <WrongBookValueBlock value={display.rationaleText} emptyLabel="暂无解析" />
        </div>
      </div>
    </>
  )
}

function WrongBookRecoveryPanel({ errorMessage = '', componentStack = '' }) {
  const { activeProfileId } = useAppContext()
  const [loading, setLoading] = React.useState(true)
  const [entries, setEntries] = React.useState([])
  const [diagnostics, setDiagnostics] = React.useState(null)
  const [diagnosticError, setDiagnosticError] = React.useState('')

  React.useEffect(() => {
    let disposed = false

    async function load() {
      if (!activeProfileId) {
        if (!disposed) {
          setEntries([])
          setLoading(false)
        }
        return
      }

      try {
        const [rows, nextDiagnostics] = await Promise.all([
          listAllWrongbookEntries(activeProfileId),
          exportWrongbookDiagnostics(activeProfileId),
        ])

        if (!disposed) {
          setEntries(Array.isArray(rows) ? rows : [])
          setDiagnostics(nextDiagnostics)
          setDiagnosticError('')
          setLoading(false)
        }
      } catch (error) {
        console.error('错题本安全模式加载失败', error)
        if (!disposed) {
          setEntries([])
          setDiagnostics(null)
          setDiagnosticError(error?.message || '错题本诊断导出失败')
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      disposed = true
    }
  }, [activeProfileId])

  const handleExportDiagnostics = React.useCallback(() => {
    if (!diagnostics) return
    downloadJsonFile(
      `wrongbook-diagnostics-${activeProfileId || 'unknown'}-${Date.now()}.json`,
      diagnostics
    )
  }, [activeProfileId, diagnostics])

  if (loading) {
    return <div className="local-library-empty">正在以安全模式加载错题本…</div>
  }

  const suspectEntries = Array.isArray(diagnostics?.suspectEntries) ? diagnostics.suspectEntries : []
  const topSuspects = suspectEntries.slice(0, 10)

  return (
    <>
      <div className="analysis-box compact-analysis-box" style={{ marginBottom: 16 }}>
        <div className="section-header-row" style={{ marginBottom: 10 }}>
          <strong>
            <AlertTriangle size={16} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
            错题本真实存量诊断
          </strong>
          <button type="button" className="secondary-btn small-btn" onClick={handleExportDiagnostics} disabled={!diagnostics}>
            <Download size={14} />
            导出异常错题数据
          </button>
        </div>

        {errorMessage ? (
          <div className="wrongbook-context" style={{ marginBottom: 10 }}>
            <strong>主渲染错误</strong>：{errorMessage}
          </div>
        ) : null}

        {componentStack ? (
          <div className="analysis-box compact-analysis-box" style={{ whiteSpace: 'pre-wrap', marginBottom: 10 }}>
            {componentStack.trim()}
          </div>
        ) : null}

        {diagnosticError ? <div className="local-library-empty">{diagnosticError}</div> : null}

        {diagnostics ? (
          <div className="wrongbook-meta">
            <span>错题分组：{diagnostics.summary.entryRecordCount}</span>
            <span>错题总条数：{diagnostics.summary.entryCount}</span>
            <span>可疑记录：{diagnostics.summary.suspectCount}</span>
            <span>掌握记录分组：{diagnostics.summary.masteredRecordCount}</span>
          </div>
        ) : null}

        {topSuspects.length > 0 ? (
          <div className="wrongbook-list" style={{ marginTop: 16 }}>
            {topSuspects.map((item) => (
              <article key={`${item.subject}:${item.questionKey}`} className="wrongbook-item-card">
                <div className="wrongbook-card-head">
                  <span className="wrongbook-card-title">
                    [{item.riskLevel.toUpperCase()}] {item.promptPreview}
                  </span>
                </div>
                <div className="wrongbook-meta">
                  <span>科目：{item.subject}</span>
                  <span>questionKey：{item.questionKey}</span>
                </div>
                <ul style={{ margin: '8px 0 0 18px', padding: 0 }}>
                  {item.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        ) : diagnostics ? (
          <div className="local-library-empty" style={{ marginTop: 12 }}>
            真实存量扫描未发现明显的字段形状异常。
          </div>
        ) : null}
      </div>

      {entries.length === 0 ? (
        <div className="local-library-empty">安全模式下未加载到可显示的错题记录。</div>
      ) : (
        <>
          <div className="wrongbook-meta" style={{ marginBottom: 12 }}>
            <span>安全模式记录数：{entries.length}</span>
            <span>当前为只读降级视图</span>
          </div>
          <div className="wrongbook-list">
            {entries.map((item) => (
              <article key={item.questionKey} className="wrongbook-item-card">
                <div className="wrongbook-card-head">
                  <span className="wrongbook-card-title">{item.prompt}</span>
                </div>
                <div className="wrongbook-meta">
                  <span>{getSubjectMeta(item.subject).shortLabel}</span>
                  <span>题型：{getWrongItemCategoryLabel(item.category)}</span>
                  {item.paperTitle ? <span>来源：{item.paperTitle}</span> : null}
                </div>
                <WrongBookStructuredAnswer item={item} />
              </article>
            ))}
          </div>
        </>
      )}
    </>
  )
}

class WrongBookPageErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, errorMessage: '', componentStack: '' }
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || '未知渲染错误',
    }
  }

  componentDidCatch(error, errorInfo) {
    console.error('错题本页面渲染失败', error)
    this.setState({
      errorMessage: error?.message || '未知渲染错误',
      componentStack: errorInfo?.componentStack || '',
    })
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: '', componentStack: '' })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-shell">
          <div className="container dashboard-page">
            <section className="record-list-card">
              <div className="section-header-row">
                <h2>
                  <BookX size={18} /> 错题本暂时无法渲染
                </h2>
              </div>
              <div className="local-library-empty">
                当前错题本里存在异常数据，页面已阻止白屏。你可以先重试打开；如果问题持续，继续清洗历史错题记录。
              </div>
              <div className="dashboard-action-row">
                <button type="button" className="primary-btn small-btn" onClick={this.handleRetry}>
                  重新加载
                </button>
                <Link className="secondary-btn small-btn" to="/">
                  返回首页
                </Link>
              </div>
              <div style={{ marginTop: 20 }}>
                <WrongBookRecoveryPanel
                  errorMessage={this.state.errorMessage}
                  componentStack={this.state.componentStack}
                />
              </div>
            </section>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

function BlankPracticePanel({
  item,
  blankAnswers,
  blankFeedback,
  isCloze,
  disabled,
  holdSolvedItem,
  feedback,
  onBlankChange,
  onClozeAnswer,
  onCheck,
}) {
  return (
    <>
      <div className="answer-review-grid">
        {(item.blanks || []).map((blank, index) => (
          <article key={blank.blank_id} className="answer-review-card">
            <div className="answer-review-prompt">空 {index + 1}</div>
            {isCloze ? (
              <div className="options compact-options">
                {(blank.options || []).map((option, optionIndex) => {
                  const selected = blankAnswers[blank.blank_id] === option.key
                  let className = 'option'

                  if (selected) className += ' selected'
                  if (feedback) {
                    if (option.key === blank.correct) className += ' correct'
                    else if (selected) className += ' wrong'
                    else className += ' muted'
                  }

                  return (
                    <button
                      key={optionIndex}
                      type="button"
                      className={className}
                      disabled={disabled || Boolean(holdSolvedItem)}
                      onClick={() => onClozeAnswer(blank.blank_id, option.key)}
                    >
                      <span>{renderWrongBookOptionLabel(option)}</span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <input
                className="subjective-textarea"
                value={blankAnswers[blank.blank_id] || ''}
                onChange={(event) => onBlankChange(blank.blank_id, event.target.value)}
                disabled={disabled || Boolean(holdSolvedItem)}
                placeholder="请输入答案"
              />
            )}
          </article>
        ))}
      </div>

      <div className="question-inline-actions">
        <button type="button" className="secondary-btn small-btn" disabled={Boolean(holdSolvedItem)} onClick={onCheck}>
          检查答案
        </button>
      </div>

      {feedback && <div className="practice-feedback">{feedback}</div>}

      {blankFeedback.length > 0 && feedback && (
        <div className="answer-review-grid">
          {blankFeedback.map((blank) => (
            <article
              key={blank.blankId}
              className={`answer-review-card ${blank.matched ? 'correct' : 'wrong'}`}
            >
              <div className="answer-review-prompt">{blank.label}</div>
              <div className="answer-review-line">
                <strong>你的答案</strong>
                {blank.value || '未作答'}
              </div>
              <div className="answer-review-line">
                <strong>参考答案</strong>
                {blank.correctLabel || '暂无'}
              </div>
              <div className="answer-review-line">
                <strong>解析</strong>
                {blank.rationale || '暂无解析'}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  )
}

function MultipleChoicePracticePanel({
  item,
  selectedChoices,
  feedback,
  holdSolvedItem,
  onToggleChoice,
  onCheck,
}) {
  return (
    <>
      <div className="options">
        {(item.options || []).map((option, index) => {
          const selected = selectedChoices.includes(option.key)
          const correctValues = Array.isArray(item.correctAnswer) ? item.correctAnswer : []
          let className = 'option'
          let icon = null

          if (selected) className += ' selected'
          if (feedback) {
            if (correctValues.includes(option.key)) {
              className += ' correct'
              icon = <CheckCircle2 size={18} />
            } else if (selected) {
              className += ' wrong'
              icon = <XCircle size={18} />
            } else {
              className += ' muted'
            }
          }

          return (
            <button
              key={index}
              type="button"
              className={className}
              disabled={Boolean(holdSolvedItem)}
              onClick={() => onToggleChoice(option.key)}
            >
              <span>{renderWrongBookOptionLabel(option)}</span>
              {icon}
            </button>
          )
        })}
      </div>

      <div className="question-inline-actions">
        <button type="button" className="secondary-btn small-btn" disabled={Boolean(holdSolvedItem)} onClick={onCheck}>
          检查答案
        </button>
      </div>

      {feedback && <div className="practice-feedback">{feedback}</div>}

      {feedback && (
        <div className="analysis-box">
          <div>
            正确答案：{' '}
            <strong>
              {Array.isArray(item.correctAnswer)
                ? formatWrongBookDisplayValue(item.correctAnswer, '见题目配置')
                : '见题目配置'}
            </strong>
          </div>
          <div>解析：{formatWrongBookDisplayValue(item.rationale, '暂无解析')}</div>
        </div>
      )}
    </>
  )
}

function WrongBookPageContent() {
  const {
    filteredWrongItems,
    subjectFilter,
    setSubjectFilter,
    typeFilter,
    setTypeFilter,
    typeOptions,
    query,
    setQuery,
    practiceMode,
    setPracticeMode,
    practiceIndex,
    setPracticeIndex,
    selectedAnswer,
    selectedChoices,
    blankAnswers,
    blankFeedback,
    feedback,
    displayPracticeItem,
    holdSolvedItem,
    isBlankPracticeItem,
    isClozePracticeItem,
    isMultipleChoicePracticeItem,
    selectedKeys,
    wrongSummary,
    handleRemove,
    handleToggleSelected,
    handleSelectAllFiltered,
    handleClearSelected,
    handleRemoveSelected,
    handleRemoveAllFiltered,
    handlePracticeAnswer,
    handleTogglePracticeChoice,
    handlePracticeBlankChange,
    handlePracticeClozeAnswer,
    handleCheckPracticeBlank,
    handleCheckPracticeObjective,
    handleAdvanceAfterSolved,
    resetPractice,
  } = useWrongBookPageState()

  const activeSubjectKey =
    subjectFilter !== 'all' ? subjectFilter : filteredWrongItems[0]?.subject || SUBJECT_REGISTRY[0]?.key
  const activeSubjectMeta =
    getSubjectMeta(activeSubjectKey) || getSubjectMeta('english') || { route: '/', shortLabel: '英语' }
  const libraryRoute = activeSubjectMeta.route || '/'

  return (
    <div className="app-shell">
      <div className="container dashboard-page">
        <section className="dashboard-hero left-hero compact-page-hero">
          <div className="section-header-row no-margin">
            <h1 className="page-title-inline">
              <BookX size={28} />
              错题本
            </h1>
            <div className="dashboard-action-row">
              <Link className="secondary-btn small-btn" to="/">
                <ArrowLeft size={16} />
                返回首页
              </Link>
              <Link className="secondary-btn small-btn" to="/history">
                历史记录
              </Link>
              <Link className="secondary-btn small-btn" to={libraryRoute || '/'}>
                <BookOpen size={16} />
                文件列表
              </Link>
            </div>
          </div>
        </section>

        <section className="profile-card compact-card">
          <div className="section-header-row">
            <h2>
              <Filter size={18} />
              筛选与搜索
            </h2>
            <div className="dashboard-action-row">
              {practiceMode ? (
                <button className="secondary-btn small-btn" onClick={() => setPracticeMode(false)}>
                  <RotateCcw size={14} />
                  退出练习
                </button>
              ) : (
                <button
                  className="primary-btn small-btn"
                  onClick={() => {
                    setPracticeMode(true)
                    setPracticeIndex(0)
                  }}
                  disabled={filteredWrongItems.length === 0}
                >
                  <Play size={14} />
                  开始刷错题
                </button>
              )}
              {!practiceMode && (
                <>
                  <button className="secondary-btn small-btn" onClick={handleSelectAllFiltered} disabled={filteredWrongItems.length === 0}>
                    全选当前筛选
                  </button>
                  <button className="secondary-btn small-btn" onClick={handleClearSelected} disabled={selectedKeys.length === 0}>
                    清空选择
                  </button>
                  <button className="danger-btn small-btn" onClick={handleRemoveSelected} disabled={selectedKeys.length === 0}>
                    <Trash2 size={14} />
                    批量删除
                  </button>
                  <button className="danger-btn small-btn" onClick={handleRemoveAllFiltered} disabled={filteredWrongItems.length === 0}>
                    <Trash2 size={14} />
                    全部删除
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="wrongbook-filter-grid">
            <label className="form-field">
              <span>科目</span>
              <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
                <option value="all">全部科目</option>
                {SUBJECT_REGISTRY.map((subject) => (
                  <option key={subject.key} value={subject.key}>
                    {subject.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span>题型</span>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="all">全部题型</option>
                {typeOptions.map((typeMeta) => (
                  <option key={typeMeta.key} value={typeMeta.key}>
                    {typeMeta.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field grow">
              <span>关键词</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索题干、材料标题、标签或上下文"
              />
            </label>
          </div>
        </section>

        <section className="wrongbook-summary-grid">
          <article className="metric-card">
            <div className="metric-head">
              <BookX size={18} /> 错题记录总数
            </div>
            <div className="metric-value">{wrongSummary.totalWrongRecords}</div>
          </article>
          <article className="metric-card">
            <div className="metric-head">
              <Search size={18} /> 唯一错题数
            </div>
            <div className="metric-value">{wrongSummary.uniqueWrongQuestions}</div>
          </article>
          <article className="metric-card">
            <div className="metric-head">
              <Filter size={18} /> 当前筛选结果
            </div>
            <div className="metric-value">{wrongSummary.filteredCount}</div>
          </article>
          <article className="metric-card">
            <div className="metric-head">
              <BookOpen size={18} /> 最近错题时间
            </div>
            <div className="metric-value small-metric-value">
              {wrongSummary.latestWrongAt ? new Date(wrongSummary.latestWrongAt).toLocaleDateString() : '--'}
            </div>
          </article>
        </section>

        {practiceMode && (
          <section className="record-list-card wrongbook-practice-panel">
            <div className="section-header-row">
              <h2>
                <Play size={18} /> 错题练习区
              </h2>
              <span className="section-header-tip">
                {filteredWrongItems.length > 0
                  ? `第 ${Math.min(practiceIndex + 1, Math.max(filteredWrongItems.length, 1))} / ${filteredWrongItems.length}`
                  : '已无待练习错题'}
              </span>
            </div>

            {!displayPracticeItem ? (
              <div className="local-library-empty">当前筛选条件下已经没有待练习错题了。</div>
            ) : (
              <div className="wrongbook-practice-card">
                <div className="wrongbook-card-head">
                  <div>
                    <div className="wrongbook-card-title">{displayPracticeItem.prompt}</div>
                    <div className="wrongbook-meta">
                      <span>{(getSubjectMeta(displayPracticeItem.subject) || activeSubjectMeta).shortLabel}</span>
                      <span>题型：{getWrongItemCategoryLabel(displayPracticeItem.category)}</span>
                      <span>来源：{displayPracticeItem.paperTitle}</span>
                    </div>
                  </div>
                  <button className="danger-btn small-btn" onClick={() => handleRemove(displayPracticeItem)}>
                    <Trash2 size={14} />
                    删除
                  </button>
                </div>

                {displayPracticeItem.contextTitle && (
                  <div className="wrongbook-context">
                    <strong>{displayPracticeItem.contextTitle}</strong>
                    {displayPracticeItem.contextSnippet ? `：${displayPracticeItem.contextSnippet}` : ''}
                  </div>
                )}

                {isBlankPracticeItem || isClozePracticeItem ? (
                  <BlankPracticePanel
                    item={displayPracticeItem}
                    blankAnswers={blankAnswers}
                    blankFeedback={blankFeedback}
                    isCloze={isClozePracticeItem}
                    disabled={false}
                    holdSolvedItem={holdSolvedItem}
                    feedback={feedback}
                    onBlankChange={handlePracticeBlankChange}
                    onClozeAnswer={handlePracticeClozeAnswer}
                    onCheck={handleCheckPracticeBlank}
                  />
                ) : isMultipleChoicePracticeItem ? (
                  <MultipleChoicePracticePanel
                    item={displayPracticeItem}
                    selectedChoices={selectedChoices}
                    feedback={feedback}
                    holdSolvedItem={holdSolvedItem}
                    onToggleChoice={handleTogglePracticeChoice}
                    onCheck={handleCheckPracticeObjective}
                  />
                ) : (
                  <>
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
                          } else {
                            className += ' muted'
                          }
                        }

                        return (
                          <button
                            key={index}
                            type="button"
                            className={className}
                            disabled={lockAnswering}
                            onClick={() => handlePracticeAnswer(option.key)}
                          >
                            <span>{renderWrongBookOptionLabel(option)}</span>
                            {icon}
                          </button>
                        )
                      })}
                    </div>

                    {feedback && <div className="practice-feedback">{feedback}</div>}

                    {selectedAnswer && (
                      <div className="analysis-box">
                        <div>
                          正确答案： <strong>{formatWrongBookDisplayValue(displayPracticeItem.correctAnswer, '见题目配置')}</strong>
                        </div>
                        <div>解析：{formatWrongBookDisplayValue(displayPracticeItem.rationale, '暂无解析')}</div>
                      </div>
                    )}
                  </>
                )}

                <div className="question-actions">
                  <button
                    type="button"
                    className="secondary-btn"
                    disabled={practiceIndex <= 0}
                    onClick={() => {
                      setPracticeIndex((prev) => Math.max(prev - 1, 0))
                      resetPractice()
                    }}
                  >
                    上一题
                  </button>

                  {holdSolvedItem ? (
                    <button type="button" className="primary-btn" onClick={handleAdvanceAfterSolved}>
                      下一题
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="secondary-btn"
                      disabled={practiceIndex >= filteredWrongItems.length - 1}
                      onClick={() => {
                        setPracticeIndex((prev) => Math.min(prev + 1, filteredWrongItems.length - 1))
                        resetPractice()
                      }}
                    >
                      下一题
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {!practiceMode && (
          <section className="record-list-card">
            <div className="section-header-row">
              <h2>
                <BookOpen size={18} /> 错题列表
              </h2>
            </div>

            {filteredWrongItems.length === 0 ? (
              <div className="local-library-empty">当前筛选条件下没有错题。</div>
            ) : (
              <div className="wrongbook-list">
                {filteredWrongItems.map((item) => {
                  const checked = selectedKeys.includes(item.questionKey)
                  return (
                    <article key={item.questionKey} className="wrongbook-item-card">
                      <div className="wrongbook-card-head">
                        <label className="wrongbook-select-row">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleToggleSelected(item.questionKey)}
                          />
                          <span className="wrongbook-card-title">{item.prompt}</span>
                        </label>
                        <button className="danger-btn small-btn" onClick={() => handleRemove(item)}>
                          <Trash2 size={14} />
                          删除
                        </button>
                      </div>

                      <div className="wrongbook-meta">
                        <span>{(getSubjectMeta(item.subject) || activeSubjectMeta).shortLabel}</span>
                        <span>题型：{getWrongItemCategoryLabel(item.category)}</span>
                        <span>错题次数：{item.wrongTimes || 1}</span>
                        {item.paperTitle ? <span>来源：{item.paperTitle}</span> : null}
                      </div>

                      <WrongBookStructuredAnswer item={item} />
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

export default function WrongBookPage() {
  return (
    <WrongBookPageErrorBoundary>
      <WrongBookPageContent />
    </WrongBookPageErrorBoundary>
  )
}
