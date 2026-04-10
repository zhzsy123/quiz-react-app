import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { registerDialogHandlers } from './dialogService'

function createDialogRequest(type, options, resolve) {
  return {
    id: `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    options: options || {},
    resolve,
  }
}

export default function AppDialogHost() {
  const queueRef = useRef([])
  const [activeDialog, setActiveDialog] = useState(null)
  const [promptValue, setPromptValue] = useState('')
  const [promptError, setPromptError] = useState('')

  const openNextDialog = useCallback(() => {
    setActiveDialog((current) => {
      if (current || queueRef.current.length === 0) return current
      return queueRef.current.shift()
    })
  }, [])

  const enqueueDialog = useCallback(
    (type, options = {}) =>
      new Promise((resolve) => {
        queueRef.current.push(createDialogRequest(type, options, resolve))
        openNextDialog()
      }),
    [openNextDialog]
  )

  useEffect(() => {
    const unregister = registerDialogHandlers({
      confirm: (options) => enqueueDialog('confirm', options),
      prompt: (options) => enqueueDialog('prompt', options),
    })

    return unregister
  }, [enqueueDialog])

  useEffect(() => {
    if (!activeDialog) return
    setPromptValue(String(activeDialog.options.defaultValue || ''))
    setPromptError('')
  }, [activeDialog])

  useEffect(() => {
    if (!activeDialog && queueRef.current.length > 0) {
      openNextDialog()
    }
  }, [activeDialog, openNextDialog])

  const closeDialog = useCallback((result) => {
    setActiveDialog((current) => {
      current?.resolve?.(result)
      return null
    })
  }, [])

  const handleConfirm = useCallback(() => {
    if (!activeDialog) return

    if (activeDialog.type === 'prompt') {
      const validate = activeDialog.options.validate
      const nextError = typeof validate === 'function' ? validate(promptValue) : ''
      if (nextError) {
        setPromptError(nextError)
        return
      }
      closeDialog(promptValue)
      return
    }

    closeDialog(true)
  }, [activeDialog, closeDialog, promptValue])

  const dialogTone = activeDialog?.options.tone || 'default'
  const title = activeDialog?.options.title || (activeDialog?.type === 'prompt' ? '请输入内容' : '请确认操作')
  const message = activeDialog?.options.message || ''
  const confirmLabel = activeDialog?.options.confirmLabel || '确认'
  const cancelLabel = activeDialog?.options.cancelLabel || '取消'
  const dialogClassName = useMemo(
    () => `app-dialog-shell ${dialogTone === 'danger' ? 'danger' : ''}`,
    [dialogTone]
  )

  if (!activeDialog) return null

  return (
    <div className="ai-modal-backdrop" onClick={(event) => event.stopPropagation()}>
      <div className={`ai-modal-card app-dialog-card ${dialogClassName}`} onClick={(event) => event.stopPropagation()}>
        <div className="ai-modal-head">
          <strong>{title}</strong>
        </div>
        {message ? <p className="app-dialog-message">{message}</p> : null}
        {activeDialog.type === 'prompt' ? (
          <div className="app-dialog-body">
            <input
              autoFocus
              className="app-dialog-input"
              value={promptValue}
              onChange={(event) => {
                setPromptValue(event.target.value)
                if (promptError) setPromptError('')
              }}
              placeholder={activeDialog.options.placeholder || ''}
            />
            {promptError ? <div className="generated-question-list-error">{promptError}</div> : null}
          </div>
        ) : null}
        <div className="app-dialog-actions">
          <button type="button" className="secondary-btn" onClick={() => closeDialog(activeDialog.type === 'prompt' ? null : false)}>
            {cancelLabel}
          </button>
          <button type="button" className={dialogTone === 'danger' ? 'danger-btn' : 'primary-btn'} onClick={handleConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
