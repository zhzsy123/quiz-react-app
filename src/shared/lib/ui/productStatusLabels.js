const DOCUMENT_IMPORT_STATUS_LABELS = {
  idle: '未开始',
  reading_file: '正在读取文件',
  extracting_text: '正在提取文本',
  calling_ai: '正在调用 AI',
  validating: '正在校验结构',
  preview_ready: '可预览',
  saving: '正在保存',
  launching: '正在进入练习',
  completed: '已完成',
  failed: '失败',
}

const QUESTION_GENERATION_STATUS_LABELS = {
  idle: '未开始',
  generating: '正在生成',
  ready: '可保存',
  saving: '正在保存',
  saved: '已保存',
  completed: '已完成',
  stopped: '已停止',
  error: '失败',
}

function resolveStatusLabel(map, status) {
  if (!status) return '未开始'
  return map[status] || status
}

export function getDocumentImportStatusLabel(status) {
  return resolveStatusLabel(DOCUMENT_IMPORT_STATUS_LABELS, status)
}

export function getQuestionGenerationStatusLabel(status) {
  return resolveStatusLabel(QUESTION_GENERATION_STATUS_LABELS, status)
}
