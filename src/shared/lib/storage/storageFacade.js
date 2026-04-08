/**
 * @deprecated 鍏煎妗ユ帴鏂囦欢銆傛柊浠ｇ爜绂佹浠庤璺緞瀵煎叆銆? *
 *
 * 璇锋敼鐢細
 * - repository锛歚src/entities/<domain>/api/*Repository.js`
 * - 鍋忓ソ椤癸細`src/shared/lib/preferences/preferenceRepository.js`
 * - 鍏煎灞傦細`src/shared/storage/compat/legacyStorageFacade.js`
 */
export {
  createProfile,
  ensureDefaultProfile,
  getActiveProfileId,
  listProfiles,
  renameProfile,
  setActiveProfileId,
} from '../../../entities/profile/api/profileRepository'
export {
  deleteLibraryEntry,
  listLibraryEntries,
  updateLibraryEntry,
  upsertLibraryEntry,
} from '../../../entities/library/api/libraryRepository'
export {
  clearProgressRecord,
  loadLastOpenedPaper,
  loadProgressRecord,
  saveLastOpenedPaper,
  saveProgressRecord,
} from '../../../entities/session/api/sessionRepository'
export {
  createHistoryEntry as saveAttemptRecord,
  listHistoryEntries as listAttempts,
  removeHistoryEntry as deleteAttemptRecord,
  updateHistoryEntry as updateAttemptRecord,
} from '../../../entities/history/api/historyRepository'
export {
  loadMasteredWrongMap,
  listWrongbookEntriesBySubject as loadWrongBookEntries,
  markWrongQuestionMastered,
  removeWrongbookEntries as removeWrongBookEntries,
  removeWrongbookEntry as removeWrongBookEntry,
  upsertWrongbookEntries as upsertWrongBookEntries,
} from '../../../entities/wrongbook/api/wrongbookRepository'
export {
  loadFavoriteEntries,
  removeFavoriteEntry,
  toggleFavoriteEntry,
} from '../../../entities/favorite/api/favoriteRepository'
export { loadPreference, savePreference } from '../preferences/preferenceRepository'