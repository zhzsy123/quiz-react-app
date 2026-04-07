async function readErrorBody(response) {
  const text = await response.text()
  return text || response.statusText || 'Unknown error'
}

export async function postJson(url, { headers = {}, body } = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body ?? {}),
  })

  if (!response.ok) {
    const errorText = await readErrorBody(response)
    throw new Error(`HTTP ${response.status}: ${errorText}`)
  }

  return response.json()
}
