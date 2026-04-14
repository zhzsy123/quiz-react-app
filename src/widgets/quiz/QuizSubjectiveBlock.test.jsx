/* @vitest-environment jsdom */

import React from 'react'
import { act } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { createRoot } from 'react-dom/client'

import QuizSubjectiveBlock from './QuizSubjectiveBlock.jsx'

async function renderComponent(element) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  await act(async () => {
    root.render(element)
  })

  return { container, root }
}

function createBaseProps(item, extraProps = {}) {
  return {
    item,
    response: {},
    submitted: false,
    isPaused: false,
    mode: 'practice',
    revealedMap: {},
    relationalAlgebraExpandedMap: {},
    aiQuestionReviewMap: {},
    focusSubQuestionId: '',
    onFocusSubQuestion: () => {},
    onSelectReadingOption: () => {},
    onSelectClozeOption: () => {},
    onRevealCurrentObjective: () => {},
    onSelectCompositeOption: () => {},
    onCompositeFillBlankChange: () => {},
    onCompositeTextChange: () => {},
    onRevealCompositeQuestion: () => {},
    onRelationalAlgebraTextChange: () => {},
    onToggleRelationalAlgebraSubQuestion: () => {},
    onRevealRelationalAlgebraQuestion: () => {},
    onFillBlankChange: () => {},
    onTextChange: () => {},
    onErDiagramChange: () => {},
    ...extraProps,
  }
}

describe('QuizSubjectiveBlock', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('renders a fallback state instead of crashing for malformed reading questions', async () => {
    const malformedReading = {
      id: 'reading_1',
      type: 'reading',
      passage: {
        title: 'Reading passage',
        content: 'A short passage.',
      },
      questions: null,
    }

    const { container, root } = await renderComponent(
      <QuizSubjectiveBlock {...createBaseProps(malformedReading)} />
    )

    expect(container.textContent).toContain('当前阅读题缺少可作答的小题，无法继续作答。')

    await act(async () => {
      root.unmount()
    })
  })

  it('shows translation context as source text', async () => {
    const translation = {
      id: 'translation_1',
      type: 'translation',
      prompt: 'Translate the paragraph.',
      direction: 'en_to_zh',
      source_text: 'This is the source paragraph.',
      answer: {
        type: 'subjective',
      },
    }

    const { container, root } = await renderComponent(<QuizSubjectiveBlock {...createBaseProps(translation)} />)

    expect(container.textContent).toContain('英译中')
    expect(container.textContent).toContain('This is the source paragraph.')

    await act(async () => {
      root.unmount()
    })
  })

  it('renders essay scoring points', async () => {
    const essay = {
      id: 'essay_1',
      type: 'essay',
      prompt: 'Write an essay.',
      score: 30,
      answer: {
        type: 'subjective',
        scoring_points: ['切题', '结构完整', '表达连贯'],
      },
    }

    const { container, root } = await renderComponent(
      <QuizSubjectiveBlock {...createBaseProps(essay, { submitted: true })} />
    )

    expect(container.textContent).toContain('评分要点')
    expect(container.textContent).toContain('切题')
    expect(container.textContent).toContain('结构完整')
    expect(container.textContent).toContain('表达连贯')

    await act(async () => {
      root.unmount()
    })
  })

  it('does not repeat prompt or expose scoring points for short answers before submit', async () => {
    const shortAnswer = {
      id: 'short_1',
      type: 'short_answer',
      prompt: '简述数据库系统中“数据独立性”的含义，并区分逻辑独立性和物理独立性。',
      score: 8,
      answer: {
        type: 'subjective',
        scoring_points: ['说明数据独立性的总体含义', '正确区分逻辑独立性', '正确区分物理独立性'],
      },
    }

    const { container, root } = await renderComponent(<QuizSubjectiveBlock {...createBaseProps(shortAnswer)} />)
    const text = container.textContent || ''
    const prompt = shortAnswer.prompt
    const promptCount = text.split(prompt).length - 1

    expect(promptCount).toBe(0)
    expect(text).not.toContain('评分要点')

    await act(async () => {
      root.unmount()
    })
  })

  it('renders sql workspace with schema panel and quick insert buttons', async () => {
    const sqlQuestion = {
      id: 'sql_1',
      type: 'sql',
      prompt: '查询平均分大于 80 分的学生姓名。',
      score: 8,
      context_title: '表结构',
      context: 'Student(id, name, score)',
      context_format: 'sql',
      answer: {
        type: 'subjective',
        reference_answer: 'SELECT name FROM Student WHERE score > 80',
        scoring_points: ['字段选择正确', '过滤条件正确'],
      },
    }

    const { container, root } = await renderComponent(<QuizSubjectiveBlock {...createBaseProps(sqlQuestion)} />)

    expect(container.textContent).toContain('SQL 工作区')
    expect(container.textContent).toContain('表结构')
    expect(container.textContent).toContain('SELECT')
    expect(container.textContent).toContain('GROUP BY')
    expect(container.textContent).toContain('Student')

    await act(async () => {
      root.unmount()
    })
  })

  it.skip('renders composite questions with dedicated material and subquestion workspace', async () => {
    const composite = {
      id: 'composite_1',
      type: 'composite',
      prompt: '根据学生选课场景回答问题。',
      material_title: '学生选课案例',
      material: 'Student(id, name, score)\nCourse(id, title)\nEnrollment(student_id, course_id)',
      material_format: 'sql',
      questions: [
        {
          id: 'sub_sql_1',
          type: 'sql',
          prompt: '查询平均分大于 80 的学生姓名。',
          score: 6,
          context_title: '题内表结构',
          context: 'Student(id, name, score)',
          context_format: 'sql',
          answer: {
            type: 'subjective',
            reference_answer: 'SELECT name FROM Student WHERE score > 80',
          },
        },
        {
          id: 'sub_short_1',
          type: 'short_answer',
          prompt: '说明主键的作用。',
          score: 4,
          answer: {
            type: 'subjective',
            scoring_points: ['唯一标识一行记录'],
          },
        },
      ],
    }

    const { container, root } = await renderComponent(<QuizSubjectiveBlock {...createBaseProps(composite)} />)

    expect(container.textContent).toContain('材料区')
    expect(container.textContent).toContain('子题区')
    expect(container.textContent).toContain('学生选课案例')
    expect(container.textContent).toContain('SQL 工作区')
    expect(container.textContent).toContain('主键的作用')

    await act(async () => {
      root.unmount()
    })
  })

  it('renders only the focused SQL subquestion workbench inside database composite questions', async () => {
    const composite = {
      id: 'composite_sql_focus',
      type: 'composite',
      prompt: 'Answer the SQL subtasks.',
      material_title: 'Schema',
      material: 'Student(id, name, score)\nCourse(id, title)\nEnrollment(student_id, course_id)',
      material_format: 'sql',
      questions: [
        {
          id: 'sub_sql_1',
          type: 'sql',
          prompt: 'Query students with score > 80.',
          score: 6,
          context_title: 'Schema',
          context: 'Student(id, name, score)',
          context_format: 'sql',
          answer: {
            type: 'subjective',
            reference_answer: 'SELECT name FROM Student WHERE score > 80',
          },
        },
        {
          id: 'sub_short_1',
          type: 'short_answer',
          prompt: 'Explain the role of a primary key.',
          score: 4,
          answer: {
            type: 'subjective',
            scoring_points: ['unique row identifier'],
          },
        },
      ],
    }

    const { container, root } = await renderComponent(<QuizSubjectiveBlock {...createBaseProps(composite)} />)

    expect(container.textContent).toContain('SQL')
    expect(container.textContent).toContain('Query students with score > 80.')
    expect(container.textContent).not.toContain('Explain the role of a primary key.')
    expect(container.querySelector('.composite-workbench-sql')).not.toBeNull()
    expect(container.querySelectorAll('.sql-schema-panel').length).toBe(0)
    expect(container.querySelectorAll('.sql-editor-card').length).toBe(1)

    await act(async () => {
      root.render(<QuizSubjectiveBlock {...createBaseProps(composite, { focusSubQuestionId: 'sub_short_1' })} />)
    })

    expect(container.textContent).toContain('Explain the role of a primary key.')
    expect(container.textContent).not.toContain('Query students with score > 80.')

    await act(async () => {
      root.unmount()
    })
  })

  it('renders er diagram workspace with structured relation schema inputs', async () => {
    const erDiagram = {
      id: 'er_1',
      type: 'er_diagram',
      prompt: '为学生选课系统绘制 E-R 图，并写出转换后的关系模式。',
      score: 10,
      answer: {
        type: 'subjective',
        reference_answer: '实体：学生、课程；联系：选课。',
        scoring_points: ['实体完整', '联系合理', '关系模式转换正确'],
      },
    }

    const { container, root } = await renderComponent(<QuizSubjectiveBlock {...createBaseProps(erDiagram)} />)

    expect(container.textContent).toContain('E-R 建模面板')
    expect(container.textContent).toContain('转换后的关系模式')
    expect(container.textContent).toContain('添加实体')
    expect(container.textContent).toContain('添加关系模式')

    await act(async () => {
      root.unmount()
    })
  })
})
