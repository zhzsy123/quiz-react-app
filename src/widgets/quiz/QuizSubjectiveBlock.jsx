import React, { useEffect, useRef, useState } from 'react'
import {
  Bot,
  CheckCircle2,
  FileText,
  Languages,
  LoaderCircle,
  Maximize2,
  Minimize2,
  XCircle,
} from 'lucide-react'
import {
  isObjectiveGradable,
  normalizeChoiceArray,
  renderOptionLabel,
} from '../../entities/quiz/lib/objectiveAnswers'
import { AiExplainPanel } from './QuizAiPanels.jsx'
import {
  countWords,
  getNavGroupMeta,
  getReadingQuestionDisplayLabel,
  getSubjectiveText,
  renderFormattedMaterial,
} from './quizViewUtils.jsx'
import QuizClozeBlock from './QuizClozeBlock.jsx'

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
  const scoreLabel = item.score ? `${item.score} 分` : ''
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
  aiExplainMap,
  onExplainQuestion,
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
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' })
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
            const explainEntry = aiExplainMap?.[`${item.id}:${subQuestion.id}`]
            const canUseAiTool = mode === 'practice' || submitted
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
                  <span className="tag">{getReadingQuestionDisplayLabel(item, subIndex)}</span>
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

                <button
                  type="button"
                  className="secondary-btn small-btn ai-inline-btn ai-dynamic-label"
                  data-ai-label={aiLabel}
                  style={{ display: canUseAiTool ? undefined : 'none' }}
                  onClick={() => onExplainQuestion({ item, subQuestion })}
                  disabled={isPaused || explainEntry?.status === 'pending'}
                >
                  {explainEntry?.status === 'pending' ? <LoaderCircle size={14} className="spin" /> : <Bot size={14} />}
                  {aiLabel}
                </button>
                <AiExplainPanel entry={explainEntry} />
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

function CompositeBlock({
  item,
  userResponse,
  submitted,
  disabled,
  mode,
  revealedMap,
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
          const isFillBlank = question.type === 'fill_blank'
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
          const isGradable = isObjectiveGradable(question)

          return (
            <article key={question.id} className="answer-review-card">
              <div className="answer-review-prompt">
                第 {index + 1} 小题
                <span className="tag purple" style={{ marginLeft: 8 }}>
                  {getNavGroupMeta(question).label}
                </span>
              </div>
              <div className="wrongbook-card-title">{question.prompt}</div>
              {question.context_title && <div className="question-context-title">{question.context_title}</div>}
              {renderFormattedMaterial(question.context, question.context_format)}

              {isFillBlank ? (
                <div className="subjective-block">
                  <div className="answer-review-grid">
                    {(question.blanks || []).map((blank, blankIndex) => {
                      const value = (questionResponse || {})[blank.blank_id] || ''
                      const normalized = String(value).trim().toLowerCase()
                      const isCorrect = blank.accepted_answers.some(
                        (candidate) => String(candidate).trim().toLowerCase() === normalized
                      )
                      const showFeedback = objectiveReveal

                      return (
                        <article
                          key={blank.blank_id}
                          className={`answer-review-card ${showFeedback ? (isCorrect ? 'correct' : 'wrong') : ''}`}
                        >
                          <div className="answer-review-prompt">空 {blankIndex + 1}</div>
                          <input
                            className="subjective-textarea"
                            value={value}
                            onChange={(event) => onFillBlankChange(question.id, blank.blank_id, event.target.value)}
                            disabled={submitted || disabled || (mode === 'practice' && objectiveReveal)}
                            placeholder="请输入答案"
                          />
                          {showFeedback && (
                            <>
                              <div className="answer-review-line">
                                <strong>参考答案</strong>
                                {blank.accepted_answers.join(' / ')}
                              </div>
                              <div className="answer-review-line">
                                <strong>解析</strong>
                                {blank.rationale || '暂无解析'}
                              </div>
                            </>
                          )}
                        </article>
                      )
                    })}
                  </div>
                </div>
              ) : !isSubjective ? (
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
                  {canRevealMultiChoice && (
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
                            正确答案：
                            <strong>
                              {Array.isArray(question.answer?.correct)
                                ? question.answer.correct.join(' / ')
                                : question.answer?.correct}
                            </strong>
                          </div>
                          <div>解析：{question.answer?.rationale || '暂无解析'}</div>
                        </>
                      ) : (
                        <div>当前小题缺少标准答案，已保留题目内容，但暂时无法自动判分。</div>
                      )}
                    </div>
                  )}
                </>
              ) : isTranslation ? (
                <TranslationBlock
                  item={question}
                  userResponse={questionResponse}
                  disabled={disabled || submitted}
                  submitted={submitted}
                  onTextChange={onTextChange}
                />
              ) : isGenericSubjective ? (
                <GenericSubjectiveBlock
                  item={question}
                  userResponse={questionResponse}
                  disabled={disabled || submitted}
                  submitted={submitted}
                  onTextChange={onTextChange}
                />
              ) : isEssay ? (
                <EssayBlock
                  item={question}
                  userResponse={questionResponse}
                  disabled={disabled || submitted}
                  submitted={submitted}
                  onTextChange={onTextChange}
                />
              ) : (
                <GenericSubjectiveBlock
                  item={question}
                  userResponse={questionResponse}
                  disabled={disabled || submitted}
                  submitted={submitted}
                  onTextChange={onTextChange}
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
  focusSubQuestionId,
  onFocusSubQuestion,
  onSelectReadingOption,
  onSelectClozeOption,
  onRevealCurrentObjective,
  aiExplainMap,
  onExplainQuestion,
  onSelectCompositeOption,
  onCompositeFillBlankChange,
  onCompositeTextChange,
  onRevealCompositeQuestion,
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
        onSelectClozeOption={onSelectClozeOption}
        onRevealCurrentObjective={onRevealCurrentObjective}
      />
    )
  }

  if (item.type === 'reading') {
    return (
      <ReadingBlock
        item={item}
        response={response}
        submitted={submitted}
        isPaused={isPaused}
        mode={mode}
        revealedMap={revealedMap}
        focusSubQuestionId={focusSubQuestionId}
        onFocusSubQuestion={onFocusSubQuestion}
        onSelectReadingOption={onSelectReadingOption}
        aiExplainMap={aiExplainMap}
        onExplainQuestion={onExplainQuestion}
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
