import { describe, expect, it, vi } from 'vitest'
import { buildDraftPaper } from '../../../entities/quiz-generation/lib/buildDraftPaper.js'
import { loadWorkspaceSnapshot } from './subjectWorkspaceSession.js'

describe('subjectWorkspaceSession', () => {
  it('loads generated draft papers from library entries through quizPipeline', async () => {
    const draftPaper = buildDraftPaper({
      subject: 'english',
      title: 'Generated English Draft',
      requestId: 'gen_subject_workspace_1',
      durationMinutes: 90,
      questionDrafts: [
        {
          status: 'valid',
          normalizedQuestion: {
            id: 'q1',
            type: 'single_choice',
            prompt: 'Choose the correct answer.',
            score: 2,
            options: [
              { key: 'A', text: 'A' },
              { key: 'B', text: 'B' },
              { key: 'C', text: 'C' },
              { key: 'D', text: 'D' },
            ],
            answer: {
              type: 'objective',
              correct: 'A',
              rationale: 'Because A is correct.',
            },
          },
        },
      ],
    })

    const rawText = JSON.stringify(draftPaper)

    const snapshot = await loadWorkspaceSnapshot({
      activeProfileId: 'profile-1',
      subjectKey: 'english',
      subjectMeta: {
        key: 'english',
        shortLabel: '英语',
        defaultDurationMinutes: 90,
      },
      source: 'library',
      paperId: 'paper-generated-1',
      sessionPaperId: 'paper-generated-1:practice',
      favoriteRows: [],
      listLibraryEntries: vi.fn(async () => [
        {
          paperId: 'paper-generated-1',
          title: 'Generated English Draft',
          rawText,
        },
      ]),
      loadSessionProgress: vi.fn(async () => ({})),
    })

    expect(snapshot.entry.title).toBe('Generated English Draft')
    expect(snapshot.quiz.title).toBe('Generated English Draft')
    expect(snapshot.quiz.items).toHaveLength(1)
    expect(snapshot.quiz.items[0].type).toBe('single_choice')
  })

  it('rejects library papers that contain no usable questions', async () => {
    await expect(
      loadWorkspaceSnapshot({
        activeProfileId: 'profile-1',
        subjectKey: 'english',
        subjectMeta: {
          key: 'english',
          shortLabel: '英语',
          defaultDurationMinutes: 90,
        },
        source: 'library',
        paperId: 'paper-empty-1',
        sessionPaperId: 'paper-empty-1:practice',
        favoriteRows: [],
        listLibraryEntries: vi.fn(async () => [
          {
            paperId: 'paper-empty-1',
            title: 'Empty Paper',
            rawText: JSON.stringify({
              schema_version: 'quiz-generation-draft-v1',
              paper_id: 'paper-empty-1',
              title: 'Empty Paper',
              subject: 'english',
              questions: [],
            }),
          },
        ]),
        loadSessionProgress: vi.fn(async () => ({})),
      })
    ).rejects.toThrow('questions 数组不能为空')
  })
})
