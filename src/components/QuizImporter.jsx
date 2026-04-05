import React, { useRef, useState } from 'react'
import { CheckCircle2, AlertCircle, Upload } from 'lucide-react'

function normalizeQuizText(text) {
  let cleaned = text.trim()
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7)
  else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3)
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3)
  return cleaned.trim()
}

function validateQuizShape(data) {
  if (!data || !Array.isArray(data.items)) {
    throw new Error('JSON 顶层必须包含 items 数组。')
  }
  data.items.forEach((item, index) => {
    const required = ['id', 'question', 'options', 'correct_answer', 'rationale']
    required.forEach((key) => {
      if (!(key in item)) {
        throw new Error(`第 ${index + 1} 题缺少字段：${key}`)
      }
    })
    if (!Array.isArray(item.options) || item.options.length < 2) {
      throw new Error(`第 ${index + 1} 题的 options 必须是至少含 2 项的数组`)
    }
  })
  return data
}

export default function QuizImporter({ onQuizLoaded }) {
  const fileInputRef = useRef(null)
  const [fileName, setFileName] = useState('')
  const [questionCount, setQuestionCount] = useState(0)
  const [error, setError] = useState('')

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const rawText = await file.text()
      const cleanedText = normalizeQuizText(rawText)
      const parsed = validateQuizShape(JSON.parse(cleanedText))

      setFileName(file.name)
      setQuestionCount(parsed.items.length)
      setError('')
      onQuizLoaded({ parsed, rawText: cleanedText })
    } catch (err) {
      setError(`解析失败：${err.message}`)
      setFileName('')
      setQuestionCount(0)
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="importer">
      <input
        id="quiz-upload"
        ref={fileInputRef}
        type="file"
        accept=".json,.txt"
        onChange={handleFileUpload}
        className="hidden-input"
      />
      <label htmlFor="quiz-upload" className="primary-btn">
        <Upload size={18} />
        {fileName ? '重新导入试卷' : '导入试卷文件'}
      </label>

      {fileName && !error && (
        <div className="status ok">
          <CheckCircle2 size={16} />
          已加载：{fileName}（{questionCount} 题）
        </div>
      )}

      {error && (
        <div className="status error">
          <AlertCircle size={16} />
          {error}
        </div>
      )}
    </div>
  )
}