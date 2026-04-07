import { normalizeQuizText } from './normalizeQuizText'

export function parseQuizJsonText(text) {
  const cleanedText = normalizeQuizText(text)
  if (!cleanedText) {
    const error = new Error('题库内容为空，请检查 JSON 文件。')
    error.details = ['题库内容为空，请检查 JSON 文件。']
    throw error
  }

  try {
    return {
      cleanedText,
      payload: JSON.parse(cleanedText),
    }
  } catch (error) {
    const nextError = new Error(`JSON 解析失败：${error.message}`)
    nextError.details = [nextError.message]
    throw nextError
  }
}
