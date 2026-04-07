/**
 * @deprecated 兼容入口。新代码不要再把 `quizSchema.js` 当作主入口。
 *
 * 当前主入口：
 * - quiz 导入与标准化流程：`quizPipeline.js`
 * - 文本清洗：`text/normalizeQuizText.js`
 * - payload 校验：`validation/validateQuizPayload.js`
 * - 题型归一化分发：`normalize/normalizeQuizPayload.js`
 * - 分值统计：`scoring/getQuizScoreBreakdown.js`
 *
 * 本文件只保留给旧测试和过渡期兼容调用。
 */
import { normalizeQuizPayload } from './normalize/normalizeQuizPayload'
import { getQuizScoreBreakdown } from './scoring/getQuizScoreBreakdown'
import { DEFAULT_QUESTION_SCORES } from './scoring/scoreConfig'
import { normalizeQuizText } from './text/normalizeQuizText'
import { buildQuizDocumentFromText } from './quizPipeline'

export { DEFAULT_QUESTION_SCORES, getQuizScoreBreakdown, normalizeQuizPayload, normalizeQuizText }

export function parseQuizText(text) {
  const result = buildQuizDocumentFromText(text)
  return {
    cleanedText: result.cleanedText,
    parsed: result.quiz,
  }
}
