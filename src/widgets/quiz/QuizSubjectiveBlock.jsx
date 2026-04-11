import React, { useEffect, useRef, useState } from 'react'
import {
  CheckCircle2,
  FileText,
  Languages,
  Maximize2,
  Minimize2,
  XCircle,
} from 'lucide-react'
import {
  evaluateFillBlankResponse,
  formatObjectiveCorrectAnswerLabel,
  isFillBlankOrderSensitive,
  isObjectiveAnswered,
  isObjectiveGradable,
  normalizeChoiceArray,
  renderOptionLabel,
} from '../../entities/quiz/lib/objectiveAnswers'
import {
  countWords,
  formatDisplayScore,
  getNavGroupMeta,
  getReadingQuestionDisplayLabel,
  getSubjectiveText,
  renderFormattedMaterial,
} from './quizViewUtils.jsx'
import QuizClozeBlock from './QuizClozeBlock.jsx'
import RelationalAlgebraBlock from './RelationalAlgebraBlock.jsx'

function TranslationBlock({ item, userResponse, disabled, submitted, onTextChange }) {
  return (
    <div className="subjective-block translation-card">
      <div className="translation-source-meta">
        <Languages size={16} />
        <span>{item.direction === 'zh_to_en' ? '中译英' : '英译中'}</span>
      </div>
      {item.prompt && <div className="essay-topic">{item.prompt}</div>}
      <div className="translation-source">{item.source_text}</div>
      <textarea
        className="subjective-textarea"
        value={getSubjectiveText(userResponse)}
        onChange={(event) => onTextChange(item.id, event.target.value)}
        disabled={disabled}
        rows={6}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
      />
      {submitted && item.answer?.reference_answer && (
        <div className="analysis-box">
          <div>{item.answer.reference_answer}</div>
        </div>
      )}
    </div>
  )
}

function EssayBlock({ item, userResponse, disabled, submitted, onTextChange }) {
  const text = getSubjectiveText(userResponse)
  const wordCount = countWords(text)
  const scoringPoints = Array.isArray(item.answer?.scoring_points) ? item.answer.scoring_points : []

  return (
    <div className="subjective-block essay-card">
      <div className="essay-head">
        <div className="essay-type-chip">{item.essay_type || 'writing'}</div>
        <div className="essay-word-count">{wordCount}</div>
      </div>
      {item.prompt && <div className="essay-topic">{item.prompt}</div>}
      {item.requirements?.topic && <div className="essay-topic">{item.requirements.topic}</div>}
      {scoringPoints.length > 0 && (
        <div className="analysis-box">
          <div className="analysis-section-title">评分要点</div>
          <ul className="analysis-list">
            {scoringPoints.map((point, index) => (
              <li key={index}>{point}</li>
            ))}
          </ul>
        </div>
      )}
      <textarea
        className="subjective-textarea essay-textarea"
        value={text}
        onChange={(event) => onTextChange(item.id, event.target.value)}
        disabled={disabled}
        rows={12}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
      />
      {submitted && item.answer?.reference_answer && (
        <div className="analysis-box">
          <div>{item.answer.reference_answer}</div>
        </div>
      )}
    </div>
  )
}

function GenericSubjectiveBlock({ item, userResponse, disabled, submitted, onTextChange }) {
  const text = getSubjectiveText(userResponse)
  const scoreLabel = item.score ? `${formatDisplayScore(item.score)} 分` : ''
  const typeLabelMap = {
    short_answer: '简答题',
    case_analysis: '案例分析',
    calculation: '计算题',
    operation: '操作题',
    programming: '程序设计',
    sql: 'SQL 题',
    er_diagram: 'E-R 图题',
  }
  const scoringPoints = Array.isArray(item.answer?.scoring_points) ? item.answer.scoring_points : []

  return (
    <div className="subjective-block essay-card">
      <div className="essay-head">
        <div className="essay-type-chip">{typeLabelMap[item.type] || item.type}</div>
        <div className="essay-word-count">{scoreLabel}</div>
      </div>
      {item.prompt && <div className="essay-topic">{item.prompt}</div>}
      {item.context_title && <div className="essay-topic">{item.context_title}</div>}
      {item.context && <div className="analysis-box">{renderFormattedMaterial(item.context, item.context_format)}</div>}
      {Array.isArray(item.requirements?.points) && item.requirements.points.length > 0 && (
        <div className="analysis-box">
          <div className="analysis-section-title">作答要点</div>
          <ul className="analysis-list">
            {item.requirements.points.map((point, index) => (
              <li key={index}>{point}</li>
            ))}
          </ul>
        </div>
      )}
      {scoringPoints.length > 0 && (
        <div className="analysis-box">
          <div className="analysis-section-title">评分要点</div>
          <ul className="analysis-list">
            {scoringPoints.map((point, index) => (
              <li key={index}>{point}</li>
            ))}
          </ul>
        </div>
      )}
      <textarea
        className="subjective-textarea essay-textarea"
        value={text}
        onChange={(event) => onTextChange(item.id, event.target.value)}
        disabled={disabled}
        rows={10}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
      />
      {submitted && item.answer?.reference_answer && (
        <div className="analysis-box">
          <div>{item.answer.reference_answer}</div>
        </div>
      )}
    </div>
  )
}

function ReadingBlock({
  item,
  response,
  submitted,
  isPaused,
  mode,
  revealedMap,
  focusSubQuestionId,
  onFocusSubQuestion,
  onSelectReadingOption,
}) {
  const [immersiveReading, setImmersiveReading] = useState(false)
  const readingResponse = response || {}
  const readingQuestions = Array.isArray(item.questions) ? item.questions : []
  const questionRefs = useRef({})
  const passageTitle = item.passage?.title || item.title || '阅读材料'
  const passageContent = item.passage?.content || item.passage?.body || item.passage?.text || ''

  useEffect(() => {
    if (!focusSubQuestionId) return
    const target = questionRefs.current[focusSubQuestionId]
    if (target && typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [focusSubQuestionId])

  return (
    <div className={`reading-layout ${immersiveReading ? 'immersive' : ''}`}>
      <section className={`reading-passage-card ${immersiveReading ? 'immersive' : ''}`}>
        <div className="reading-passage-head">
          <div className="reading-passage-title">
            <FileText size={16} />
            <span>{passageTitle}</span>
          </div>
          <button
            type="button"
            className="reading-mode-btn"
            onClick={() => setImmersiveReading((value) => !value)}
            disabled={isPaused}
          >
            {immersiveReading ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
        <div className={`reading-passage-body ${immersiveReading ? 'immersive' : ''}`}>
          {passageContent || '当前阅读题缺少材料正文。'}
        </div>
      </section>

      <section className={`reading-questions-card ${immersiveReading ? 'immersive' : ''}`}>
        <div className="reading-question-list">
          {readingQuestions.map((subQuestion, subIndex) => {
            const userAnswer = readingResponse[subQuestion.id]
            const revealKey = `${item.id}:${subQuestion.id}`
            const showFeedback = submitted || (mode === 'practice' && revealedMap[revealKey])
            const isFocused = focusSubQuestionId === subQuestion.id
            const subOptions = Array.isArray(subQuestion.options) ? subQuestion.options : []
            const isGradable = isObjectiveGradable(subQuestion)
            const aiLabel =
              mode === 'exam'
                ? explainEntry?.status === 'pending'
                  ? 'AI 核题中'
                  : 'AI 核题'
                : explainEntry?.status === 'pending'
                  ? 'AI 解释中'
                  : 'AI 解释'

            return (
              <div
                key={subQuestion.id}
                ref={(node) => {
                  questionRefs.current[subQuestion.id] = node
                }}
                className={`reading-question-item ${isFocused ? 'focused' : ''}`}
              >
                <div className="reading-question-title">
                  <div className="reading-question-meta">
                    <span className="tag">{getReadingQuestionDisplayLabel(item, subIndex)}</span>
                    <span className="tag score">{formatDisplayScore(subQuestion?.score)} 分</span>
                  </div>
                  <span>{subQuestion.prompt}</span>
                </div>

                <div className="options compact-options">
                  {subOptions.map((option, optionIndex) => {
                    const selected = userAnswer === option.key
                    let className = 'option compact-option'
                    let icon = null

                    if (!showFeedback || !isGradable) {
                      if (selected) className += ' selected'
                    } else if (option.key === subQuestion.answer?.correct) {
                      className += ' correct'
                      icon = <CheckCircle2 size={18} />
                    } else if (selected) {
                      className += ' wrong'
                      icon = <XCircle size={18} />
                    } else {
                      className += ' muted'
                    }

                    return (
                      <button
                        key={optionIndex}
                        type="button"
                        className={className}
                        disabled={submitted || isPaused || (mode === 'practice' && showFeedback)}
                        onClick={() => {
                          onFocusSubQuestion(subQuestion.id)
                          onSelectReadingOption(item.id, subQuestion.id, option.key)
                        }}
                      >
                        <span>{renderOptionLabel(option)}</span>
                        {icon}
                      </button>
                    )
                  })}
                </div>

                {!subOptions.length && (
                  <div className="analysis-box compact-analysis-box">
                    <div>当前小题缺少可作答的选项，无法继续作答。</div>
                  </div>
                )}

                {showFeedback && (
                  <div className="analysis-box compact-analysis-box">
                    {isGradable ? (
                      <>
                        <div>
                          正确答案：<strong>{subQuestion.answer?.correct}</strong>
                        </div>
                        <div>解析：{subQuestion.answer?.rationale || '暂无解析'}</div>
                      </>
                    ) : (
                      <div>当前小题缺少标准答案，已保留题目内容，但暂时无法自动判分。</div>
                    )}
                  </div>
                )}

                      {explainEntry?.status === 'pending' ? 'AI解释中' : 'AI解释'}
                      {auditEntry?.status === 'pending' ? 'AI核题中' : 'AI核题'}
              </div>
            )
          })}
          {!readingQuestions.length && (
            <div className="analysis-box compact-analysis-box">
              <div>当前阅读题缺少可作答的小题，无法继续作答。</div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function ReadingBlockV2({
  item,
  response,
  submitted,
  isPaused,
  mode,
  revealedMap,
  focusSubQuestionId,
  onFocusSubQuestion,
  onSelectReadingOption,
}) {
  const [immersiveReading, setImmersiveReading] = useState(false)
  const readingResponse = response || {}
  const readingQuestions = Array.isArray(item.questions) ? item.questions : []
  const questionRefs = useRef({})
  const passageTitle = item.passage?.title || item.title || '阅读材料'
  const passageContent = item.passage?.content || item.passage?.body || item.passage?.text || ''

  useEffect(() => {
    if (!focusSubQuestionId) return
    const target = questionRefs.current[focusSubQuestionId]
    if (target && typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [focusSubQuestionId])

  return (
    <div className={`reading-layout ${immersiveReading ? 'immersive' : ''}`}>
      <section className={`reading-passage-card ${immersiveReading ? 'immersive' : ''}`}>
        <div className="reading-passage-head">
          <div className="reading-passage-title">
            <FileText size={16} />
            <span>{passageTitle}</span>
          </div>
          <button
            type="button"
            className="reading-mode-btn"
            onClick={() => setImmersiveReading((value) => !value)}
            disabled={isPaused}
          >
            {immersiveReading ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
        <div className={`reading-passage-body ${immersiveReading ? 'immersive' : ''}`}>
          {passageContent || '当前阅读题缺少材料正文。'}
        </div>
      </section>

      <section className={`reading-questions-card ${immersiveReading ? 'immersive' : ''}`}>
        <div className="reading-question-list">
          {readingQuestions.map((subQuestion, subIndex) => {
            const userAnswer = readingResponse[subQuestion.id]
            const revealKey = `${item.id}:${subQuestion.id}`
            const showFeedback = submitted || (mode === 'practice' && revealedMap[revealKey])
            const isFocused = focusSubQuestionId === subQuestion.id
            const subOptions = Array.isArray(subQuestion.options) ? subQuestion.options : []
            const isGradable = isObjectiveGradable(subQuestion)

            return (
              <div
                key={subQuestion.id}
                ref={(node) => {
                  questionRefs.current[subQuestion.id] = node
                }}
                className={`reading-question-item ${isFocused ? 'focused' : ''}`}
              >
                <div className="reading-question-title">
                  <div className="reading-question-meta">
                    <span className="tag">{getReadingQuestionDisplayLabel(item, subIndex)}</span>
                    <span className="tag score">{formatDisplayScore(subQuestion?.score)} 分</span>
                  </div>
                  <span>{subQuestion.prompt}</span>
                </div>

                <div className="options compact-options">
                  {subOptions.map((option, optionIndex) => {
                    const selected = userAnswer === option.key
                    let className = 'option compact-option'
                    let icon = null

                    if (!showFeedback || !isGradable) {
                      if (selected) className += ' selected'
                    } else if (option.key === subQuestion.answer?.correct) {
                      className += ' correct'
                      icon = <CheckCircle2 size={18} />
                    } else if (selected) {
                      className += ' wrong'
                      icon = <XCircle size={18} />
                    } else {
                      className += ' muted'
                    }

                    return (
                      <button
                        key={optionIndex}
                        type="button"
                        className={className}
                        disabled={submitted || isPaused || (mode === 'practice' && showFeedback)}
                        onClick={() => {
                          onFocusSubQuestion(subQuestion.id)
                          onSelectReadingOption(item.id, subQuestion.id, option.key)
                        }}
                      >
                        <span>{renderOptionLabel(option)}</span>
                        {icon}
                      </button>
                    )
                  })}
                </div>

                {!subOptions.length && (
                  <div className="analysis-box compact-analysis-box">
                    <div>当前小题缺少可作答的选项，无法继续作答。</div>
                  </div>
                )}

                {showFeedback && (
                  <div className="analysis-box compact-analysis-box">
                    {isGradable ? (
                      <>
                        <div>
                          正确答案：<strong>{subQuestion.answer?.correct}</strong>
                        </div>
                        <div>解析：{subQuestion.answer?.rationale || '暂无解析'}</div>
                      </>
                    ) : (
                      <div>当前小题缺少标准答案，已保留题目内容，但暂时无法自动判分。</div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {!readingQuestions.length && (
            <div className="analysis-box compact-analysis-box">
              <div>当前阅读题缺少可作答的小题，无法继续作答。</div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function CompositeFillBlankBlock({
  question,
  questionResponse,
  objectiveReveal,
  submitted,
  disabled,
  mode,
  onFillBlankChange,
}) {
  const evaluation = evaluateFillBlankResponse(question, questionResponse || {})
  const orderSensitive = isFillBlankOrderSensitive(question)

  return (
    <div className="fill-blank-block">
      <div className="fill-blank-grid">
        {(question.blanks || []).map((blank, blankIndex) => {
          const value = (questionResponse || {})[blank.blank_id] || ''
          const blankResult = evaluation.blankResults[blankIndex]
          const acceptedAnswers = blankResult?.matchedAcceptedAnswers || blankResult?.acceptedAnswers || []
          const isCorrect = Boolean(blankResult?.isCorrect)
          const showFeedback = objectiveReveal

          return (
            <article
              key={blank.blank_id}
              className={`fill-blank-card ${showFeedback ? (isCorrect ? 'correct' : 'wrong') : ''}`}
            >
              <div className="fill-blank-card-head">
                <div className="fill-blank-card-label">第 {blankIndex + 1} 空</div>
                <div className={`fill-blank-card-state ${value ? 'filled' : ''}`}>{value ? '已填写' : '待填写'}</div>
              </div>
              <textarea
                className="fill-blank-input"
                value={value}
                onChange={(event) => onFillBlankChange(question.id, blank.blank_id, event.target.value)}
                disabled={submitted || disabled || (mode === 'practice' && objectiveReveal)}
                rows={2}
                spellCheck={false}
                placeholder="请输入本空答案"
              />
              {showFeedback && (
                <div className="fill-blank-feedback">
                  {!orderSensitive && (
                    <div className="answer-review-line">
                      <strong>判定规则</strong>
                      本题答案不区分填写顺序，命中任一有效答案即可。
                    </div>
                  )}
                  <div className="answer-review-line">
                    <strong>参考答案</strong>
                    {acceptedAnswers.join(' / ') || '暂无'}
                  </div>
                  <div className="answer-review-line">
                    <strong>解析</strong>
                    {blank.rationale || '暂无解析'}
                  </div>
                </div>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}

function CompositeObjectiveBlock({
  question,
  questionResponse,
  objectiveReveal,
  submitted,
  disabled,
  mode,
  canRevealMultiChoice,
  canRevealFillBlank,
  isGradable,
  onSelectOption,
  onRevealQuestion,
  onFillBlankChange,
}) {
  if (question.type === 'fill_blank') {
    return (
      <>
        <CompositeFillBlankBlock
          question={question}
          questionResponse={questionResponse}
          objectiveReveal={objectiveReveal}
          submitted={submitted}
          disabled={disabled}
          mode={mode}
          onFillBlankChange={onFillBlankChange}
        />
        {(canRevealMultiChoice || canRevealFillBlank) && (
          <div className="question-inline-actions">
            <button type="button" className="secondary-btn small-btn" onClick={() => onRevealQuestion(question.id)}>
              检查答案
            </button>
          </div>
        )}
      </>
    )
  }

  return (
    <>
      <div className="options">
        {(question.options || []).map((opt, optIndex) => {
          const option = typeof opt === 'string' ? { key: opt.charAt(0), text: opt } : opt
          const selected =
            question.type === 'multiple_choice'
              ? normalizeChoiceArray(questionResponse).includes(option.key)
              : questionResponse === option.key
          const isCorrect =
            question.type === 'multiple_choice'
              ? normalizeChoiceArray(question.answer?.correct).includes(option.key)
              : option.key === question.answer?.correct

          let className = 'option'
          let icon = null

          if (!objectiveReveal || !isGradable) {
            if (selected) className += ' selected'
          } else if (isCorrect) {
            className += ' correct'
            icon = <CheckCircle2 size={18} />
          } else if (selected) {
            className += ' wrong'
            icon = <XCircle size={18} />
          } else {
            className += ' muted'
          }

          return (
            <button
              key={optIndex}
              type="button"
              className={className}
              disabled={submitted || disabled || (mode === 'practice' && objectiveReveal)}
              onClick={() => onSelectOption(question.id, option.key)}
            >
              <span>{renderOptionLabel(option)}</span>
              {icon}
            </button>
          )
        })}
      </div>
      {(canRevealMultiChoice || canRevealFillBlank) && (
        <div className="question-inline-actions">
          <button type="button" className="secondary-btn small-btn" onClick={() => onRevealQuestion(question.id)}>
            检查答案
          </button>
        </div>
      )}
      {objectiveReveal && (
        <div className="analysis-box">
          {isGradable ? (
            <>
              <div>
                正确答案：<strong>{formatObjectiveCorrectAnswerLabel(question)}</strong>
              </div>
              <div>解析：{question.answer?.rationale || '暂无解析'}</div>
            </>
          ) : (
            <div>当前小题缺少标准答案，已保留题目内容，但暂时无法自动判分。</div>
          )}
        </div>
      )}
    </>
  )
}

function CompositeBlock({
  item,
  userResponse,
  submitted,
  disabled,
  mode,
  revealedMap,
  focusSubQuestionId,
  onFocusSubQuestion,
  onSelectOption,
  onFillBlankChange,
  onTextChange,
  onRevealQuestion,
}) {
  const responseMap = userResponse || {}

  return (
    <div className="subjective-block">
      <div className="analysis-box">
        {(item.material_title || item.prompt) && (
          <div className="question-context-title">{item.material_title || item.prompt}</div>
        )}
        {renderFormattedMaterial(item.material, item.material_format, 'question-context-body')}
      </div>

      <div className="answer-review-grid">
        {(item.questions || []).map((question, index) => {
          const questionResponse = responseMap[question.id]
          const revealKey = `${item.id}:${question.id}`
          const objectiveReveal = submitted || (mode === 'practice' && revealedMap[revealKey])
          const isSubjective = question.answer?.type === 'subjective'
          const isTranslation = question.type === 'translation'
          const isEssay = question.type === 'essay'
          const isGenericSubjective = [
            'short_answer',
            'case_analysis',
            'calculation',
            'operation',
            'programming',
            'sql',
            'er_diagram',
          ].includes(question.type)
          const canRevealMultiChoice =
            mode === 'practice' &&
            question.type === 'multiple_choice' &&
            !submitted &&
            !objectiveReveal &&
            normalizeChoiceArray(questionResponse).length > 0
          const canRevealFillBlank =
            mode === 'practice' &&
            question.type === 'fill_blank' &&
            !submitted &&
            !objectiveReveal &&
            isObjectiveAnswered(question, questionResponse)
          const isGradable = isObjectiveGradable(question)

          return (
            <article
              key={question.id}
              className={`answer-review-card ${String(focusSubQuestionId || '') === String(question.id) ? 'focused' : ''}`}
            >
              <div className="answer-review-prompt">
                第 {index + 1} 小题
                <span className="tag purple" style={{ marginLeft: 8 }}>
                  {getNavGroupMeta(question).label}
                </span>
                <span className="tag score" style={{ marginLeft: 8 }}>
                  {formatDisplayScore(question?.score)} 分
                </span>
              </div>
              <div className="wrongbook-card-title">{question.prompt}</div>
              {question.context_title && <div className="question-context-title">{question.context_title}</div>}
              {renderFormattedMaterial(question.context, question.context_format)}

              {!isSubjective ? (
                <CompositeObjectiveBlock
                  question={question}
                  questionResponse={questionResponse}
                  objectiveReveal={objectiveReveal}
                  submitted={submitted}
                  disabled={disabled}
                  mode={mode}
                  canRevealMultiChoice={canRevealMultiChoice}
                  canRevealFillBlank={canRevealFillBlank}
                  isGradable={isGradable}
                  onSelectOption={(targetId, optionKey) => {
                    onFocusSubQuestion?.(targetId)
                    onSelectOption(targetId, optionKey)
                  }}
                  onRevealQuestion={onRevealQuestion}
                  onFillBlankChange={(targetId, blankId, text) => {
                    onFocusSubQuestion?.(targetId)
                    onFillBlankChange(targetId, blankId, text)
                  }}
                />
              ) : isTranslation ? (
                <TranslationBlock
                  item={question}
                  userResponse={questionResponse}
                  disabled={disabled || submitted}
                  submitted={submitted}
                  onTextChange={(targetId, text) => {
                    onFocusSubQuestion?.(targetId)
                    onTextChange(targetId, text)
                  }}
                />
              ) : isGenericSubjective ? (
                <GenericSubjectiveBlock
                  item={question}
                  userResponse={questionResponse}
                  disabled={disabled || submitted}
                  submitted={submitted}
                  onTextChange={(targetId, text) => {
                    onFocusSubQuestion?.(targetId)
                    onTextChange(targetId, text)
                  }}
                />
              ) : isEssay ? (
                <EssayBlock
                  item={question}
                  userResponse={questionResponse}
                  disabled={disabled || submitted}
                  submitted={submitted}
                  onTextChange={(targetId, text) => {
                    onFocusSubQuestion?.(targetId)
                    onTextChange(targetId, text)
                  }}
                />
              ) : (
                <GenericSubjectiveBlock
                  item={question}
                  userResponse={questionResponse}
                  disabled={disabled || submitted}
                  submitted={submitted}
                  onTextChange={(targetId, text) => {
                    onFocusSubQuestion?.(targetId)
                    onTextChange(targetId, text)
                  }}
                />
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}

export default function QuizSubjectiveBlock({
  item,
  response,
  submitted,
  isPaused,
  mode,
  revealedMap,
  relationalAlgebraExpandedMap,
  aiQuestionReviewMap,
  focusSubQuestionId,
  onFocusSubQuestion,
  onSelectReadingOption,
  onSelectClozeOption,
  onRevealCurrentObjective,
  aiExplainMap,
  aiAuditMap,
  onExplainQuestion,
  onAuditQuestion,
  onSelectCompositeOption,
  onCompositeFillBlankChange,
  onCompositeTextChange,
  onRevealCompositeQuestion,
  onRelationalAlgebraTextChange,
  onToggleRelationalAlgebraSubQuestion,
  onRevealRelationalAlgebraQuestion,
  onFillBlankChange,
  onTextChange,
}) {
  if (item.type === 'cloze') {
    return (
      <QuizClozeBlock
        item={item}
        response={response}
        submitted={submitted}
        isPaused={isPaused}
        mode={mode}
        revealedMap={revealedMap}
        focusBlankId={focusSubQuestionId}
        onFocusBlank={onFocusSubQuestion}
        onSelectClozeOption={onSelectClozeOption}
        onRevealCurrentObjective={onRevealCurrentObjective}
      />
    )
  }

  if (item.type === 'reading') {
    return (
      <ReadingBlockV2
        item={item}
        response={response}
        submitted={submitted}
        isPaused={isPaused}
        mode={mode}
        revealedMap={revealedMap}
        focusSubQuestionId={focusSubQuestionId}
        onFocusSubQuestion={onFocusSubQuestion}
        onSelectReadingOption={onSelectReadingOption}
      />
    )
  }

  if (item.type === 'composite') {
    return (
      <CompositeBlock
        item={item}
        userResponse={response}
        submitted={submitted}
        disabled={isPaused}
        mode={mode}
        revealedMap={revealedMap}
        focusSubQuestionId={focusSubQuestionId}
        onFocusSubQuestion={onFocusSubQuestion}
        onSelectOption={(subQuestionId, optionKey) => onSelectCompositeOption(item.id, subQuestionId, optionKey)}
        onFillBlankChange={(subQuestionId, blankId, text) =>
          onCompositeFillBlankChange(item.id, subQuestionId, blankId, text)
        }
        onTextChange={(subQuestionId, text) => onCompositeTextChange(item.id, subQuestionId, text)}
        onRevealQuestion={(subQuestionId) => onRevealCompositeQuestion(item.id, subQuestionId)}
      />
    )
  }

  if (item.type === 'translation') {
    return (
      <TranslationBlock
        item={item}
        userResponse={response}
        disabled={isPaused || submitted}
        submitted={submitted}
        onTextChange={onTextChange}
      />
    )
  }

  if (item.type === 'essay') {
    return (
      <EssayBlock
        item={item}
        userResponse={response}
        disabled={isPaused || submitted}
        submitted={submitted}
        onTextChange={onTextChange}
      />
    )
  }

  if (item.type === 'relational_algebra') {
    return (
      <RelationalAlgebraBlock
        item={item}
        response={response}
        submitted={submitted}
        isPaused={isPaused}
        expandedMap={relationalAlgebraExpandedMap}
        reviewMap={aiQuestionReviewMap}
        focusSubQuestionId={focusSubQuestionId}
        onTextChange={onRelationalAlgebraTextChange}
        onToggleSubQuestion={onToggleRelationalAlgebraSubQuestion}
        onRevealQuestion={onRevealRelationalAlgebraQuestion}
        onFocusSubQuestion={onFocusSubQuestion}
      />
    )
  }

  if (
    ['short_answer', 'case_analysis', 'calculation', 'operation', 'programming', 'sql', 'er_diagram'].includes(
      item.type
    )
  ) {
    return (
      <GenericSubjectiveBlock
        item={item}
        userResponse={response}
        disabled={isPaused || submitted}
        submitted={submitted}
        onTextChange={onTextChange}
      />
    )
  }

  return (
    <div className="analysis-box">
      <div>当前主观题类型暂不支持渲染。</div>
    </div>
  )
}
