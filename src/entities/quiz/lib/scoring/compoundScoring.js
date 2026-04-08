import { parseScore } from './scoreConfig'

function emptySummary() {
  return {
    objectiveTotal: 0,
    subjectiveTotal: 0,
    paperTotal: 0,
  }
}

function mergeSummary(target, source) {
  target.objectiveTotal += source.objectiveTotal
  target.subjectiveTotal += source.subjectiveTotal
  target.paperTotal += source.paperTotal
  return target
}

export function getItemScoreBreakdown(item) {
  const summary = emptySummary()

  if (!item) return summary

  if (item.type === 'composite') {
    return (item.questions || []).reduce((acc, question) => {
      return mergeSummary(acc, getItemScoreBreakdown(question))
    }, summary)
  }

  if (item.type === 'reading') {
    const readingScore = (item.questions || []).reduce((sum, question) => sum + parseScore(question.score, 0), 0)
    summary.objectiveTotal += readingScore
    summary.paperTotal += readingScore
    return summary
  }

  if (item.type === 'fill_blank') {
    const fillBlankScore = (item.blanks || []).reduce((sum, blank) => sum + parseScore(blank.score, 0), 0)
    summary.objectiveTotal += fillBlankScore
    summary.paperTotal += fillBlankScore
    return summary
  }

  const itemScore = parseScore(item.score, 0)
  if (item.answer?.type === 'subjective') {
    summary.subjectiveTotal += itemScore
  } else {
    summary.objectiveTotal += itemScore
  }
  summary.paperTotal += itemScore
  return summary
}

