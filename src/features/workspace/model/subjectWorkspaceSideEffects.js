import {
  formatObjectiveAnswerLabel,
  formatObjectiveCorrectAnswerLabel,
  formatOptionLabel,
  getObjectiveAnswerLabel,
  isObjectiveGradable,
} from '../../../entities/quiz/lib/objectiveAnswers'
import { resolvePracticeJudge } from '../../../entities/quiz/lib/practiceJudging.js'
import { buildCompositeContext, clipText } from './subjectWorkspaceObjective.js'

export function cloneFavoriteItem(entry, index) {
  const cloned = JSON.parse(JSON.stringify(entry.itemSnapshot || {}))
  const prefix = `fav_${index}_`
  cloned.id = `${prefix}${cloned.id || index}`
  if (cloned.type === 'reading' && Array.isArray(cloned.questions)) {
    cloned.questions = cloned.questions.map((question, qIndex) => ({
      ...question,
      id: `${prefix}${question.id || qIndex}`,
    }))
  }
  return cloned
}

export function buildFavoriteEntryFromItem(item, meta) {
  return {
    questionKey: `${meta.subject}:${meta.paperId}:${item.id}`,
    subject: meta.subject,
    paperId: meta.paperId,
    paperTitle: meta.paperTitle,
    prompt: item.prompt || item.passage?.title || 'Untitled question',
    itemType: item.type,
    sourceType: item.source_type || item.type,
    tags: item.tags || [],
    contextTitle: item.type === 'reading' ? item.passage?.title || '' : item.context_title || '',
    contextSnippet: clipText(item.type === 'reading' ? item.passage?.content || '' : item.context || ''),
    itemSnapshot: item,
  }
}

export function buildWrongItems(items, answers, meta, manualJudgeMap = {}) {
  const wrongItems = []
  const lastWrongAt = Date.now()
  const buildScopedQuestionKey = (itemId, subQuestionId) => `${meta.subject}:${meta.paperId}:${itemId}:${subQuestionId}`

  items.forEach((item) => {
    if (item.type === 'composite') {
      const compositeAnswers = answers[item.id] || {}
      item.questions.forEach((question) => {
        if (question.answer?.type !== 'objective') return
        if (!isObjectiveGradable(question)) return
        const userAnswer = compositeAnswers[question.id]
        const judgement = resolvePracticeJudge({
          manualJudgeMap,
          item,
          response: userAnswer,
          subQuestion: question,
        })
        if (judgement.isCorrect) return
        if (!judgement.answered) return
        const compositeContext = buildCompositeContext(item)
        wrongItems.push({
          questionKey: buildScopedQuestionKey(item.id, question.id),
          subject: meta.subject,
          paperId: meta.paperId,
          paperTitle: meta.paperTitle,
          parentType: 'composite',
          sourceType: question.source_type || question.type,
          type: question.type,
          questionId: item.id,
          subQuestionId: question.id,
          prompt: question.prompt,
          contextTitle: item.material_title || item.context_title || item.prompt || '',
          contextSnippet: clipText(item.material || item.context || ''),
          contextFormat: item.material_format || item.context_format || '',
          composite_context: compositeContext,
          compositeContext,
          options: question.options || [],
          blanks: question.blanks || [],
          userAnswer,
          userAnswerLabel: formatObjectiveAnswerLabel(question, userAnswer),
          correctAnswer: question.answer?.correct || '',
          correctAnswerLabel:
            question.type === 'fill_blank'
              ? question.blanks.map((blank) => blank.accepted_answers.join(' / ')).join(' | ')
              : getObjectiveAnswerLabel(question, question.answer?.correct),
          rationale: question.answer?.rationale || 'No rationale provided',
          tags: [...(item.tags || []), ...(question.tags || [])],
          difficulty: question.difficulty || item.difficulty,
          lastWrongAt,
          wrongTimes: 1,
        })
      })
      return
    }

    if (item.type === 'reading') {
      const readingAnswers = answers[item.id] || {}
      item.questions.forEach((question) => {
        if (!isObjectiveGradable(question)) return
        const userAnswer = readingAnswers[question.id] || ''
        const judgement = resolvePracticeJudge({
          manualJudgeMap,
          item,
          response: userAnswer,
          subQuestion: question,
        })
        if (judgement.isCorrect) return
        if (!judgement.answered) return
        wrongItems.push({
          questionKey: buildScopedQuestionKey(item.id, question.id),
          subject: meta.subject,
          paperId: meta.paperId,
          paperTitle: meta.paperTitle,
          parentType: 'reading',
          sourceType: 'reading',
          type: question.type || 'single_choice',
          questionId: item.id,
          subQuestionId: question.id,
          prompt: question.prompt,
          contextTitle: item.passage?.title || item.title || 'Reading passage',
          contextSnippet: clipText(item.passage?.content || ''),
          options: question.options || [],
          userAnswer,
          userAnswerLabel: formatOptionLabel(question.options || [], userAnswer),
          correctAnswer: question.answer?.correct || '',
          correctAnswerLabel: formatOptionLabel(question.options || [], question.answer?.correct || ''),
          rationale: question.answer?.rationale || 'No rationale provided',
          tags: [...(item.tags || []), ...(question.tags || [])],
          difficulty: question.difficulty || item.difficulty,
          lastWrongAt,
          wrongTimes: 1,
        })
      })
      return
    }

    if (item.answer?.type !== 'objective') return
    if (!isObjectiveGradable(item)) return
    const userAnswer = answers[item.id]
    const judgement = resolvePracticeJudge({
      manualJudgeMap,
      item,
      response: userAnswer,
    })
    if (judgement.isCorrect) return
    if (!judgement.answered) return

    wrongItems.push({
      questionKey: `${meta.subject}:${meta.paperId}:${item.id}`,
      subject: meta.subject,
      paperId: meta.paperId,
      paperTitle: meta.paperTitle,
      sourceType: item.source_type || item.type,
      type: item.type,
      questionId: item.id,
      prompt: item.prompt,
      contextTitle: item.context_title || '',
      contextSnippet: clipText(item.context || ''),
      options: item.options || [],
      blanks: item.blanks || [],
      userAnswer,
      userAnswerLabel: formatObjectiveAnswerLabel(item, userAnswer),
      correctAnswer: item.answer?.correct || '',
      correctAnswerLabel:
        item.type === 'fill_blank' || item.type === 'cloze'
          ? formatObjectiveCorrectAnswerLabel(item)
          : getObjectiveAnswerLabel(item, item.answer?.correct),
      rationale: item.answer?.rationale || 'No rationale provided',
      tags: item.tags || [],
      difficulty: item.difficulty,
      lastWrongAt,
      wrongTimes: 1,
    })
  })

  return wrongItems
}
