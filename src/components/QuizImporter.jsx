import React, { useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, Upload } from 'lucide-react'
import { parseQuizText } from '../boundaries/quizSchema'

export default function QuizImporter({ onQuizLoaded }) {
  const fileInputRef = useRef(null)
  const [fileName, setFileName] = useState('')
  const [questionCount, setQuestionCount] = useState(0)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const rawText = await file.text()
      const { cleanedText, parsed: normalized } = parseQuizText(rawText)

      setFileName(file.name)
      setQuestionCount(normalized.items.length)
      setError('')

      const { compatibility } = normalized
      if (compatibility?.skippedCount > 0) {
        setInfo(`已导入 ${compatibility.supportedCount} 题，跳过 ${compatibility.skippedCount} 题。`)
      } else {
        setInfo(`已成功导入 ${compatibility?.supportedCount || normalized.items.length} 题。`)
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
