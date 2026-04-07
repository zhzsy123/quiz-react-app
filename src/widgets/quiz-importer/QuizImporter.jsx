import React, { useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, Upload } from 'lucide-react'
import { buildQuizDocumentFromText } from '../../entities/quiz/lib/quizPipeline'

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
      const quizDocument = buildQuizDocumentFromText(rawText)
      const normalized = quizDocument.quiz

      const shouldContinue = await onQuizLoaded({
        parsed: normalized,
        rawText: quizDocument.cleanedText,
        fileName: file.name,
        quizDocument,
      })

      if (shouldContinue === false) {
        setInfo('已取消导入。')
        setError('')
        setFileName('')
        setQuestionCount(0)
        return
      }

      setFileName(file.name)
      setQuestionCount(normalized.items.length)
      setError('')

      const { compatibility } = normalized
      const warningText = quizDocument.validation.warnings.length ? ` ${quizDocument.validation.warnings.join(' ')}` : ''

      if (compatibility?.skippedCount > 0) {
        setInfo(`已导入 ${compatibility.supportedCount} 题，跳过 ${compatibility.skippedCount} 题。${warningText}`.trim())
      } else {
        setInfo(`已成功导入 ${compatibility?.supportedCount || normalized.items.length} 题。${warningText}`.trim())
      }
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
