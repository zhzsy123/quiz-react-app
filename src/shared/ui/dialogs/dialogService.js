let dialogHandlers = null

function canUseNativeFallback() {
  return Boolean(import.meta?.env?.DEV || import.meta?.env?.MODE === 'test')
}

function reportMissingDialogHost(kind) {
  console.error(`[dialogService] AppDialogHost is not registered for ${kind}.`)
}

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

  if (canUseNativeFallback() && typeof window !== 'undefined' && typeof window.confirm === 'function') {
    return Promise.resolve(window.confirm(options.message || options.title || 'Confirm action?'))
  }

  reportMissingDialogHost('confirm')
  return Promise.resolve(false)
}

export function requestPromptDialog(options = {}) {
  if (dialogHandlers?.prompt) {
    return dialogHandlers.prompt(options)
  }

  if (canUseNativeFallback() && typeof window !== 'undefined' && typeof window.prompt === 'function') {
    const value = window.prompt(options.message || options.title || 'Enter a value:', options.defaultValue || '')
    return Promise.resolve(value)
  }

  reportMissingDialogHost('prompt')
  return Promise.resolve(null)
}
