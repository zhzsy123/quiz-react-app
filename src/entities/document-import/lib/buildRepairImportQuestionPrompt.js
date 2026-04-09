function normalizeSnippet(text = '') {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildContextSnippet(documentDraft, questionPreview) {
  const plainText = String(documentDraft?.plainText || '')
  if (!plainText) return ''

  const excerpt = normalizeSnippet(questionPreview?.excerpt || '')
  if (excerpt) {
    const index = plainText.indexOf(excerpt.slice(0, Math.min(48, excerpt.length)))
    if (index >= 0) {
      const start = Math.max(0, index - 800)
      const end = Math.min(plainText.length, index + 2400)
      return plainText.slice(start, end)
    }
  }

  return plainText.slice(0, 3200)
}

export function buildRepairImportQuestionPrompt({
  documentDraft,
  subjectMeta,
  question,
  questionPreview,
} = {}) {
  const contextSnippet = buildContextSnippet(documentDraft, questionPreview)

  const systemPrompt = [
    '你正在修复一份从 PDF 或 DOCX 导入后结构不理想的单道试题。',
    '只返回一个 JSON 对象，不要返回数组、不要返回 Markdown、不要返回解释性文字。',
    '返回结果必须保持为与原题相同的题型，并符合当前站点的题库协议。',
    '如果是 reading，请返回 passage + questions；如果是 cloze，请返回 article + blanks，并保证空位在正文中。',
  ].join('\n')

  const userPrompt = [
    `当前科目：${subjectMeta?.shortLabel || subjectMeta?.label || subjectMeta?.key || 'unknown'}`,
    `目标题型：${question?.type || questionPreview?.type || 'unknown'}`,
    '',
    '当前题目预览：',
    JSON.stringify(
      {
        prompt: questionPreview?.prompt || '',
        excerpt: questionPreview?.excerpt || '',
        score: questionPreview?.score || question?.score || 0,
      },
      null,
      2
    ),
    '',
    '当前解析出的题目 JSON：',
    JSON.stringify(question || {}, null, 2),
    '',
    '原始文档上下文片段：',
    contextSnippet || '无可用上下文',
    '',
    '请基于原始文档上下文修复这道题的结构，使其可以被系统直接导入和作答。',
  ].join('\n')

  return {
    systemPrompt,
    userPrompt,
  }
}
