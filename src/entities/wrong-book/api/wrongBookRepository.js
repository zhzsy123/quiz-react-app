/**
 * @deprecated Compatibility shim. New code should use
 * `src/entities/wrongbook/api/wrongbookRepository.js`.
 */
export {
  listWrongbookEntriesBySubject,
  listAllWrongbookEntries,
  upsertWrongbookEntries,
  removeWrongbookEntry,
  removeWrongbookEntries,
  loadMasteredWrongMap,
  markWrongQuestionMastered,
  loadWrongBookEntries,
  listAllWrongBookEntries,
  upsertWrongBookEntries,
  removeWrongBookEntry,
  removeWrongBookEntries,
} from '../../wrongbook/api/wrongbookRepository'
