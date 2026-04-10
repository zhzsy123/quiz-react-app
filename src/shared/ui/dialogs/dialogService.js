let dialogHandlers = null

export function registerDialogHandlers(handlers) {
  dialogHandlers = handlers || null
  return () => {
    if (dialogHandlers === handlers) {
      dialogHandlers = null
    }
  }
}

export function requestConfirmDialog(options = {}) {
  if (dialogHandlers?.confirm) {
    return dialogHandlers.confirm(options)
  }

  if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
    return Promise.resolve(window.confirm(options.message || options.title || '确定继续吗？'))
  }

  return Promise.resolve(false)
}

export function requestPromptDialog(options = {}) {
  if (dialogHandlers?.prompt) {
    return dialogHandlers.prompt(options)
  }

  if (typeof window !== 'undefined' && typeof window.prompt === 'function') {
    const value = window.prompt(options.message || options.title || '请输入内容：', options.defaultValue || '')
    return Promise.resolve(value)
  }

  return Promise.resolve(null)
}
