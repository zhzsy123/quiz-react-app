import { migrateMetaToDedicatedStores } from './v3/migrateMetaToDedicatedStores'
import { migrateLastPaperToDocumentCache } from './v4/migrateLastPaperToDocumentCache'

export const migrationRegistry = [
  {
    id: 'v3-meta-to-dedicated-stores',
    run: migrateMetaToDedicatedStores,
  },
  {
    id: 'v4-last-paper-to-document-cache',
    run: migrateLastPaperToDocumentCache,
  },
]
