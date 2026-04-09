globalThis.IS_REACT_ACT_ENVIRONMENT = true

const originalWarn = console.warn.bind(console)

console.warn = (...args) => {
  const message = String(args[0] ?? '')

  if (
    message.includes('React Router Future Flag Warning') ||
    message.includes('Relative route resolution within Splat routes is changing in v7')
  ) {
    return
  }

  originalWarn(...args)
}
