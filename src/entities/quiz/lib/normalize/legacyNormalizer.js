import { ensureQuestionBase, getDefaultScoreByType, normalizeOption, parseScore } from './helpers'

export function normalizeLegacyPayload(data) {
  if (!Array.isArray(data.items)) {
    throw new Error('题库必须包含 questions 或 items 数组。')
  }

  const items = data.items.map((item) => ({
    ...ensureQuestionBase(
      {
        id: item.id,
        type: 'single_choice',
        prompt: item.question,
        difficulty: item.difficulty,
        tags: item.tags || [],
        score: item.score,
        assets: [],
      },
      'single_choice',
      parseScore(item.score, getDefaultScoreByType('single_choice'))
    ),
    source_type: 'legacy_single_choice',
    options: (item.options || []).map(normalizeOption),
    answer: {
      type: 'objective',
      correct: item.correct_answer,
      rationale: item.rationale || '暂无解析',
    },
  }))

  if (!items.length) {
    throw new Error('旧版 items 题库没有可用题目。')
  }

  return {
    title: data.title || '未命名试卷',
    paper_id: data.paper_id,
    items,
    compatibility: {
      sourceSchema: 'legacy_items',
      supportedCount: items.length,
      skippedCount: 0,
      skippedTypes: [],
    },
  }
}
