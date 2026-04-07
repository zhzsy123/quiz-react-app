/**
 * @deprecated 兼容层。禁止新代码依赖本文件。
 *
 * 当前主路径：
 * - repository：`src/entities/<domain>/api/*Repository.js`
 * - 偏好项：`src/shared/lib/preferences/preferenceRepository.js`
 *
 * 本文件仅用于过渡期兼容旧链路与旧测试。
 */
import {
  createProfile,
  ensureDefaultProfile,
  getActiveProfileId,
  listProfiles,
  renameProfile,
  setActiveProfileId,
} from '../../../entities/profile/api/profileRepository'
import {
  deleteLibraryEntry,
  listLibraryEntries,
  updateLibraryEntry,
  upsertLibraryEntry,
} from '../../../entities/library/api/libraryRepository'
import {
  clearProgressRecord,
  loadLastOpenedPaper,
  loadProgressRecord,
  saveLastOpenedPaper,
  saveProgressRecord,
} from '../../../entities/session/api/sessionRepository'
import {
  createHistoryEntry,
  listHistoryEntries,
  removeHistoryEntry,
  updateHistoryEntry,
} from '../../../entities/history/api/historyRepository'
import {
  loadMasteredWrongMap,
  listWrongbookEntriesBySubject,
  markWrongQuestionMastered,
  removeWrongbookEntries,
  removeWrongbookEntry,
  upsertWrongbookEntries,
} from '../../../entities/wrongbook/api/wrongbookRepository'
import {
  loadFavoriteEntries,
  removeFavoriteEntry,
  toggleFavoriteEntry,
} from '../../../entities/favorite/api/favoriteRepository'
import { loadPreference, savePreference } from '../../lib/preferences/preferenceRepository'

export {
  getActiveProfileId,
  setActiveProfileId,
  loadPreference,
  savePreference,
  listProfiles,
  createProfile,
  renameProfile,
  ensureDefaultProfile,
  upsertLibraryEntry,
  listLibraryEntries,
  updateLibraryEntry,
  deleteLibraryEntry,
  saveProgressRecord,
  loadProgressRecord,
  clearProgressRecord,
  saveLastOpenedPaper,
  loadLastOpenedPaper,
  createHistoryEntry as saveAttemptRecord,
  listHistoryEntries as listAttempts,
  updateHistoryEntry as updateAttemptRecord,
  removeHistoryEntry as deleteAttemptRecord,
  loadMasteredWrongMap,
  markWrongQuestionMastered,
  listWrongbookEntriesBySubject as loadWrongBookEntries,
  upsertWrongbookEntries as upsertWrongBookEntries,
  removeWrongbookEntry as removeWrongBookEntry,
  removeWrongbookEntries as removeWrongBookEntries,
  loadFavoriteEntries,
  toggleFavoriteEntry,
  removeFavoriteEntry,
}
