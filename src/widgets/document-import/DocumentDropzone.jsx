import React, { useRef, useState } from 'react'
import { FileText, Upload } from 'lucide-react'

const ACCEPT_VALUE =
  '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword'

export default function DocumentDropzone({ file, disabled = false, onFileSelect }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const openPicker = () => {
    if (disabled) return
    inputRef.current?.click()
  }

  const handleFile = (nextFile) => {
    if (!nextFile || disabled) return
    onFileSelect?.(nextFile)
  }

  return (
    <div
      className={`document-dropzone ${dragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
      onDragOver={(event) => {
        event.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragLeave={(event) => {
        event.preventDefault()
        setDragging(false)
      }}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        handleFile(event.dataTransfer?.files?.[0])
      }}
      data-testid="document-dropzone"
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_VALUE}
        className="visually-hidden"
        onChange={(event) => handleFile(event.target.files?.[0])}
        data-testid="document-file-input"
      />

      <div className="document-dropzone-copy">
        <span className="document-dropzone-icon">
          {file ? <FileText size={18} /> : <Upload size={18} />}
        </span>
        <strong>{file ? file.name : '拖入 PDF / DOCX 文件，或点击选择文件'}</strong>
        <p>支持文本层 PDF、扫描件 PDF（将尝试 OCR）和普通 DOCX。文档内容会发送给 AI 解析成题库。</p>
      </div>

      <button type="button" className="secondary-btn small-btn" onClick={openPicker} disabled={disabled}>
        {file ? '重新选择文件' : '选择文件'}
      </button>
    </div>
  )
}
