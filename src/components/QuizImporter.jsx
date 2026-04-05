import React, { useRef, useState } from 'react'
import { CheckCircle2, AlertCircle, Upload } from 'lucide-react'
import { normalizeQuizPayload } from '../utils/normalizeQuizSchema'

function normalizeQuizText(text) {
  let cleaned = text.trim()
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7)
  else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3)
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3)
  return cleaned.trim()
}

export default function QuizImporter({ onQuizLoaded }) {
  const fileInputRef = useRef(null)
  const [fileName, setFileName] = useState('')
  const [questionCount, setQuestionCount] = useState(0)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const rawText = await file.text()
      const cleanedText = normalizeQuizText(rawText)
      const normalized = normalizeQuizPayload(JSON.parse(cleanedText))

      setFileName(file.name)
      setQuestionCount(normalized.items.length)
      setError('')

      const { compatibility } = normalized
      if (compatibility?.skippedCount > 0) {
        setInfo(
          `已兼容导入 ${compatibility.supportedCount} 题；暂跳过 ${compatibility.skippedCount} 题（${compatibility.skippedTypes.join(' / ')}）。`
        )
      } else {
        setInfo(`已兼容导入 ${compatibility?.supportedCount || normalized.items.length} 题。`)
      }

      onQuizLoaded({ parsed: normalized, rawText: cleanedText })
    } catch (err) {
      setError(`解析失败：${err.message}`)
      setInfo('')
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

      {info && !error && <div className="status info">{info}</div>}

      {error && (
        <div className="status error">
          <AlertCircle size={16} />
          {error}
        </div>
      )}
    </div>
  )
}
