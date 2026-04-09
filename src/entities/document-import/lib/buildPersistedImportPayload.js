function buildBaseQuestion(item = {}) {
  return {
    id: item.id,
    type: item.type,
    prompt: item.prompt,
    difficulty: item.difficulty,
    tags: item.tags || [],
    score: item.score,
    assets: Array.isArray(item.assets) ? item.assets : [],
  }
}

function buildObjectiveAnswer(answer = {}) {
  return {
    type: answer.type || 'objective',
    correct: answer.correct,
    rationale: answer.rationale || '',
  }
}

function buildSubjectiveAnswer(answer = {}) {
  return {
    type: answer.type || 'subjective',
    reference_answer: answer.reference_answer || '',
    alternate_answers: answer.alternate_answers || [],
    scoring_points: answer.scoring_points || [],
    scoring_rubric: answer.scoring_rubric || null,
    outline: answer.outline || [],
    common_errors: answer.common_errors || [],
    ai_scoring: answer.ai_scoring || { enabled: false },
  }
}

function buildOptions(options = []) {
  return options.map((option) => ({
    key: option.key,
    text: option.text,
  }))
}

function exportQuestion(item = {}) {
  const base = buildBaseQuestion(item)

  switch (item.type) {
    case 'single_choice':
    case 'multiple_choice':
    case 'true_false':
      return {
        ...base,
        options: buildOptions(item.options || []),
        answer: buildObjectiveAnswer(item.answer),
      }
    case 'fill_blank':
    case 'function_fill_blank':
      return {
        ...base,
        blanks: (item.blanks || []).map((blank) => ({
          blank_id: blank.blank_id,
          accepted_answers: blank.accepted_answers || [],
          rationale: blank.rationale || '',
          score: blank.score,
        })),
        answer: {
          type: 'objective',
          correct: item.answer?.correct || [],
          rationale: item.answer?.rationale || '',
        },
      }
    case 'reading':
      return {
        ...base,
        title: item.title || item.prompt,
        passage: {
          title: item.passage?.title || '',
          content: item.passage?.content || item.passage?.body || item.passage?.text || '',
        },
        questions: (item.questions || []).map((subQuestion) => exportQuestion(subQuestion)),
        answer: {
          type: 'objective',
        },
      }
    case 'cloze':
      return {
        ...base,
        title: item.title || item.prompt,
        article: item.article || '',
        blanks: (item.blanks || []).map((blank) => ({
          blank_id: blank.blank_id,
          score: blank.score,
          options: buildOptions(blank.options || []),
          correct: blank.correct,
          rationale: blank.rationale || '',
          prompt: blank.prompt || '',
        })),
        answer: {
          type: 'objective',
          correct: item.answer?.correct || [],
          rationale: item.answer?.rationale || '',
        },
      }
    case 'translation':
      return {
        ...base,
        direction: item.direction || 'en_to_zh',
        source_text: item.source_text || item.context || item.prompt || '',
        answer: buildSubjectiveAnswer(item.answer),
      }
    case 'essay':
      return {
        ...base,
        essay_type: item.essay_type || 'writing',
        requirements: item.requirements || {},
        answer: buildSubjectiveAnswer(item.answer),
      }
    case 'short_answer':
    case 'case_analysis':
    case 'calculation':
    case 'operation':
    case 'programming':
    case 'sql':
    case 'er_diagram':
      return {
        ...base,
        context_title: item.context_title || '',
        context: item.context || '',
        requirements: item.requirements || {},
        response_format: item.response_format || '',
        deliverable_type: item.deliverable_type || '',
        answer: buildSubjectiveAnswer(item.answer),
      }
    case 'composite':
      return {
        ...base,
        material_title: item.material_title || '',
        material: item.material || item.context || '',
        material_format: item.material_format || 'plain',
        presentation: item.presentation || item.material_format || 'plain',
        questions: (item.questions || []).map((subQuestion) => {
          const exported = exportQuestion(subQuestion)
          delete exported.composite_context
          return exported
        }),
        answer: {
          type: 'composite',
        },
      }
    default:
      return {
        ...base,
        answer: item.answer || {},
      }
  }
}

export function buildPersistedImportPayload(quiz = {}) {
  return {
    schema_version: 'document-import-editable-v1',
    paper_id: quiz.paper_id || '',
    title: quiz.title || '未命名试卷',
    subject: quiz.subject || '',
    description: quiz.description || '',
    duration_minutes: Number(quiz.duration_minutes) || 0,
    questions: (quiz.items || []).map((item) => exportQuestion(item)),
  }
}
