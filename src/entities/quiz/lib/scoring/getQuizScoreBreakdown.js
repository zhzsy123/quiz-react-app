import { getItemScoreBreakdown } from './compoundScoring'

export function getQuizScoreBreakdown(items = []) {
  return items.reduce(
    (summary, item) => {
      const itemSummary = getItemScoreBreakdown(item)
      summary.objectiveTotal += itemSummary.objectiveTotal
      summary.subjectiveTotal += itemSummary.subjectiveTotal
      summary.paperTotal += itemSummary.paperTotal
      return summary
    },
    {
      objectiveTotal: 0,
      subjectiveTotal: 0,
      paperTotal: 0,
    }
  )
}
