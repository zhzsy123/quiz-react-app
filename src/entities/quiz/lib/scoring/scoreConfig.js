export const DEFAULT_QUESTION_SCORES = {
  single_choice: 2,
  multiple_choice: 2,
  true_false: 2,
  fill_blank: 2,
  function_fill_blank: 4,
  cloze: 2,
  reading: 2.5,
  short_answer: 10,
  programming: 20,
  sql: 12,
  er_diagram: 12,
  case_analysis: 20,
  calculation: 6,
  operation: 16,
  translation: 15,
  essay: 30,
}

export function parseScore(value, fallback) {
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback
}

export function getDefaultScoreByType(type) {
  return DEFAULT_QUESTION_SCORES[type] || 1
}
