let tokenizerPromise = null

function getTokenizerBasePath() {
  const base = import.meta.env?.BASE_URL || '/'
  const normalizedBase = base.endsWith('/') ? base : `${base}/`
  return `${normalizedBase}deepseek-v3-tokenizer`
}

async function loadTokenizerModule() {
  const { AutoTokenizer, env } = await import('@huggingface/transformers')
  env.allowRemoteModels = false
  env.allowLocalModels = true
  return AutoTokenizer.from_pretrained(getTokenizerBasePath())
}

export async function getDeepSeekTokenizer() {
  if (!tokenizerPromise) {
    tokenizerPromise = loadTokenizerModule().catch((error) => {
      tokenizerPromise = null
      throw error
    })
  }
  return tokenizerPromise
}

export async function countDeepSeekTokens(text = '') {
  const tokenizer = await getDeepSeekTokenizer()
  const encoded = await tokenizer(String(text || ''))
  return Number(encoded?.input_ids?.data?.length || encoded?.input_ids?.size || 0)
}
