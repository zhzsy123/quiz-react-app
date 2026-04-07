function safeRead(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeWrite(key, value) {
  try {
    localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

function safeRemove(key) {
  try {
    localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}

export const browserStorageAdapter = {
  getItem(key, fallback = null) {
    const value = safeRead(key)
    return value === null ? fallback : value
  },

  setItem(key, value) {
    return safeWrite(key, String(value))
  },

  removeItem(key) {
    return safeRemove(key)
  },
}
