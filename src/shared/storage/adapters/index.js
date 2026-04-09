export { browserStorageAdapter } from './browserStorageAdapter'
export { indexedDbAdapter } from './indexedDbAdapter'
export {
  loadFavoriteEntries,
  removeFavoriteEntry,
  toggleFavoriteEntry,
} from './favoriteAdapter'
export {
  loadMasteredWrongMap,
  loadWrongBookEntries,
  markWrongQuestionMastered,
  removeWrongBookEntries,
  removeWrongBookEntry,
  upsertWrongBookEntries,
} from './wrongbookAdapter'
