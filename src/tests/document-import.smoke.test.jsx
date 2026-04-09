/* @vitest-environment jsdom */

import React from 'react'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes, useLocation, useSearchParams } from 'react-router-dom'

const {
  listLibraryEntriesMock,
  upsertLibraryEntryMock,
  extractDocumentDraftMock,
  importDocumentWithAiMock,
  resetMockStores,
} = vi.hoisted(() => {
  const libraryStore = []
  const clone = (value) => JSON.parse(JSON.stringify(value))

  return {
    listLibraryEntriesMock: vi.fn(async (profileId, subject) => {
      return libraryStore.filter((item) => item.profileId === profileId && item.subject === subject).map(clone)
    }),
    upsertLibraryEntryMock: vi.fn(async (entry) => {
      const next = clone(entry)
      const index = libraryStore.findIndex(
        (item) => item.profileId === next.profileId && item.subject === next.subject && item.paperId === next.paperId
      )
      if (index >= 0) {
        libraryStore[index] = { ...libraryStore[index], ...next }
      } else {
        libraryStore.push(next)
      }
      return next
    }),
    extractDocumentDraftMock: vi.fn(async (file, { subject }) => ({
      documentKind: 'pdf',
      warnings: ['页眉已自动忽略。'],
      documentDraft: {
        fileName: file.name,
        mimeType: file.type,
        subject,
        sourceType: 'pdf',
        plainText: 'Page 1\nQuestion 1',
        pages: [{ page: 1, text: 'Page 1\nQuestion 1' }],
        paragraphs: [],
        outline: [{ source: 'page', page: 1, text: 'Part I' }],
        stats: {
          pageCount: 1,
          paragraphCount: 0,
          characterCount: 1200,
          nonWhitespaceCharacterCount: 1000,
          lineCount: 12,
        },
      },
    })),
    importDocumentWithAiMock: vi.fn(async ({ documentDraft, subjectKey, onStageChange }) => {
      onStageChange?.('calling_ai', '正在调用 AI 解析试卷结构')
      onStageChange?.('validating', '正在校验并标准化题库结构')
      return {
        requestId: 'import_smoke_001',
        documentDraft,
        rawAiPayload: {
          title: 'Imported English Paper',
          subject: subjectKey,
          duration_minutes: 90,
          items: [
            {
              id: 'q1',
              type: 'single_choice',
              prompt: 'Imported prompt',
              score: 2,
              options: [
                { key: 'A', text: 'Correct answer' },
                { key: 'B', text: 'Wrong answer' },
              ],
              answer: {
                type: 'objective',
                correct: 'A',
                rationale: 'Because A is correct.',
              },
            },
          ],
        },
        normalizedDocument: {
          rawPayload: {
            title: 'Imported English Paper',
            subject: subjectKey,
            duration_minutes: 90,
            items: [
              {
                id: 'q1',
                type: 'single_choice',
                prompt: 'Imported prompt',
                score: 2,
                options: [
                  { key: 'A', text: 'Correct answer' },
                  { key: 'B', text: 'Wrong answer' },
                ],
                answer: {
                  type: 'objective',
                  correct: 'A',
                  rationale: 'Because A is correct.',
                },
              },
            ],
          },
          quiz: {
            title: 'Imported English Paper',
            subject: subjectKey,
            duration_minutes: 90,
            items: [
              {
                id: 'q1',
                type: 'single_choice',
                prompt: 'Imported prompt',
                score: 2,
                options: [
                  { key: 'A', text: 'Correct answer' },
                  { key: 'B', text: 'Wrong answer' },
                ],
                answer: {
                  type: 'objective',
                  correct: 'A',
                  rationale: 'Because A is correct.',
                },
              },
            ],
          },
          validation: {
            warnings: [],
          },
        },
        scoreBreakdown: {
          objectiveTotal: 2,
          subjectiveTotal: 0,
          paperTotal: 2,
        },
        preview: {
          title: 'Imported English Paper',
          subject: '英语',
          questionCount: 1,
          totalScore: 2,
          validCount: 1,
          warningCount: 1,
          invalidCount: 0,
          typeStats: [{ type: 'single_choice', label: '单项选择题', count: 1 }],
        },
        warnings: ['页眉已自动忽略。'],
        errors: [],
        invalidReasons: [],
      }
    }),
    resetMockStores: () => {
      libraryStore.splice(0, libraryStore.length)
    },
  }
})

vi.mock('../app/providers/AppContext', () => ({
  useAppContext: () => ({
    profiles: [{ id: 'profile-1', name: 'Vorin' }],
    activeProfile: { id: 'profile-1', name: 'Vorin' },
    activeProfileId: 'profile-1',
    loading: false,
    createLocalProfile: vi.fn(),
    switchProfile: vi.fn(),
    renameLocalProfile: vi.fn(),
  }),
}))

vi.mock('../entities/library/api/libraryRepository', () => ({
  listLibraryEntries: listLibraryEntriesMock,
  upsertLibraryEntry: upsertLibraryEntryMock,
  updateLibraryEntry: vi.fn(async () => {}),
  deleteLibraryEntry: vi.fn(async () => {}),
}))

vi.mock('../shared/document', () => ({
  buildDocumentDraft: vi.fn(),
  normalizeDocumentText: vi.fn(),
  detectDocumentKind: vi.fn(() => 'pdf'),
  extractDocumentDraft: extractDocumentDraftMock,
  extractPdfText: vi.fn(),
  extractDocxText: vi.fn(),
  assessDocumentTextGate: vi.fn(),
  assertDocumentTextGate: vi.fn(),
}))

vi.mock('../features/document-import/api/documentImportService', () => ({
  importDocumentWithAi: importDocumentWithAiMock,
  repairImportedQuestionWithAi: vi.fn(),
}))

vi.mock('../entities/subject/model/subjects', () => {
  const subjectMeta = {
    key: 'english',
    routeSlug: 'english',
    label: '英语模考系统 V2.0',
    shortLabel: '英语',
    description: '英语题库与模考。',
    route: '/exam/english',
    workspaceRoute: '/workspace/english',
    expectedPaperTotal: 150,
    defaultDurationMinutes: 90,
    isAvailable: true,
    questionTypeKeys: ['single_choice', 'cloze', 'reading', 'translation', 'essay'],
    generation: {
      enabled: true,
      supportedModes: ['practice', 'mock_exam'],
      supportedQuestionTypes: ['single_choice', 'cloze', 'reading', 'translation', 'essay'],
      defaultCounts: [5],
      defaultDifficulty: 'medium',
      defaultDurationMinutes: 90,
      defaultPaperTotal: 150,
      promptProfile: 'english',
    },
    downloadDocs: [],
  }

  return {
    SUBJECT_REGISTRY: [subjectMeta],
    getSubjectMeta: (subjectKey) => ({
      ...subjectMeta,
      key: subjectKey,
      routeSlug: subjectKey === 'english' ? 'english' : subjectKey,
      route: `/exam/${subjectKey === 'english' ? 'english' : subjectKey}`,
      workspaceRoute: `/workspace/${subjectKey === 'english' ? 'english' : subjectKey}`,
    }),
    getSubjectMetaByRouteParam: () => subjectMeta,
    getSubjectQuestionTypeOptions: () => [
      {
        key: 'single_choice',
        label: '单项选择题',
        shortLabel: '单选',
        family: 'objective',
        mockExamDefaultCount: 5,
        mockExamDefaultScore: 2,
      },
    ],
    buildQuestionPlan: (typeKeys = [], options = []) =>
      typeKeys.reduce((plan, typeKey) => {
        const meta = options.find((item) => item.key === typeKey) || {
          mockExamDefaultCount: 1,
          mockExamDefaultScore: 1,
        }
        plan[typeKey] = {
          count: meta.mockExamDefaultCount || 1,
          score: meta.mockExamDefaultScore || 1,
        }
        return plan
      }, {}),
    normalizeQuestionPlan: (typeKeys = [], questionPlan = {}, options = []) =>
      typeKeys.reduce((plan, typeKey) => {
        const meta = options.find((item) => item.key === typeKey) || {
          mockExamDefaultCount: 1,
          mockExamDefaultScore: 1,
        }
        const current = questionPlan[typeKey] || {}
        plan[typeKey] = {
          count: Number(current.count) || meta.mockExamDefaultCount || 1,
          score: Number(current.score) || meta.mockExamDefaultScore || 1,
        }
        return plan
      }, {}),
    getQuestionTypeMeta: (typeKey) => ({
      key: typeKey || 'single_choice',
      label: typeKey === 'single_choice' ? '单项选择题' : String(typeKey || 'single_choice'),
      shortLabel: typeKey === 'single_choice' ? '单选' : String(typeKey || 'single_choice'),
      family: 'objective',
    }),
  }
})

vi.mock('../features/question-generator/api/questionGenerationService', () => ({
  startQuestionGeneration: vi.fn(),
}))

vi.mock('../widgets/quiz-importer/QuizImporter', () => ({
  default: function MockQuizImporter() {
    return <div data-testid="mock-json-importer">Mock importer</div>
  },
}))

import FileHubPage from '../pages/FileHubPage'

function WorkspaceProbe() {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  return (
    <section data-testid="workspace-probe">
      <div data-testid="workspace-path">{location.pathname}</div>
      <div data-testid="workspace-paper">{searchParams.get('paper') || ''}</div>
      <div data-testid="workspace-mode">{searchParams.get('mode') || ''}</div>
    </section>
  )
}

async function flushAsyncWork() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

async function waitFor(predicate, attempts = 30) {
  for (let index = 0; index < attempts; index += 1) {
    if (predicate()) return
    await flushAsyncWork()
  }

  throw new Error('Timed out waiting for document import smoke condition.')
}

async function renderAt(initialEntry) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/exam/:subjectParam" element={<FileHubPage />} />
          <Route path="/workspace/:subjectParam" element={<WorkspaceProbe />} />
        </Routes>
      </MemoryRouter>
    )
  })

  return { container, root }
}

function getByTestId(container, testId) {
  const target = container.querySelector(`[data-testid="${testId}"]`)
  if (!target) {
    throw new Error(`Unable to find element by test id: ${testId}`)
  }
  return target
}

describe('document import smoke flow', () => {
  beforeEach(() => {
    resetMockStores()
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  it('imports a document and saves it into the current subject library', async () => {
    const { container, root } = await renderAt('/exam/english')

    await act(async () => {
      getByTestId(container, 'open-document-import').click()
    })

    const input = getByTestId(container, 'document-file-input')
    const file = new File(['mock pdf'], 'english-paper.pdf', { type: 'application/pdf' })

    await act(async () => {
      Object.defineProperty(input, 'files', {
        configurable: true,
        value: [file],
      })
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })

    await act(async () => {
      getByTestId(container, 'document-import-subject').value = 'english'
      getByTestId(container, 'document-import-subject').dispatchEvent(new Event('change', { bubbles: true }))
    })

    await act(async () => {
      getByTestId(container, 'document-import-start').click()
    })

    await waitFor(() => !getByTestId(container, 'document-import-save').disabled)

    await act(async () => {
      getByTestId(container, 'document-import-save').click()
    })

    await waitFor(() => upsertLibraryEntryMock.mock.calls.length > 0)
    expect(extractDocumentDraftMock).toHaveBeenCalled()
    expect(importDocumentWithAiMock).toHaveBeenCalled()
    expect(upsertLibraryEntryMock.mock.calls[0][0].subject).toBe('english')
    expect(container.textContent).toContain('Imported English Paper')

    await act(async () => {
      root.unmount()
    })
  })

  it('imports a document and jumps straight into practice mode', async () => {
    const { container, root } = await renderAt('/exam/english')

    await act(async () => {
      getByTestId(container, 'open-document-import').click()
    })

    const input = getByTestId(container, 'document-file-input')
    const file = new File(['mock pdf'], 'english-paper.pdf', { type: 'application/pdf' })

    await act(async () => {
      Object.defineProperty(input, 'files', {
        configurable: true,
        value: [file],
      })
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })

    await act(async () => {
      getByTestId(container, 'document-import-subject').value = 'english'
      getByTestId(container, 'document-import-subject').dispatchEvent(new Event('change', { bubbles: true }))
    })

    await act(async () => {
      getByTestId(container, 'document-import-start').click()
    })

    await waitFor(() => !getByTestId(container, 'document-import-launch').disabled)

    await act(async () => {
      getByTestId(container, 'document-import-launch').click()
    })

    await waitFor(() => container.querySelector('[data-testid="workspace-probe"]'))
    expect(getByTestId(container, 'workspace-path').textContent).toBe('/workspace/english')
    expect(getByTestId(container, 'workspace-mode').textContent).toBe('practice')
    expect(getByTestId(container, 'workspace-paper').textContent).not.toBe('')

    await act(async () => {
      root.unmount()
    })
  })
})
