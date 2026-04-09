/**
 * @deprecated 兼容层。新代码禁止直接依赖 wrongbookStore，
 * 请通过 wrongbookRepository 或 shared/storage/adapters/wrongbookAdapter 访问错题本数据。
 */
export {
  loadMasteredWrongMap,
  loadWrongBookEntries,
  markWrongQuestionMastered,
  removeWrongBookEntries,
  removeWrongBookEntry,
  upsertWrongBookEntries,
} from '../../../shared/storage/adapters/wrongbookAdapter'
