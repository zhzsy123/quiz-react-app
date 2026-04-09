/**
 * @deprecated 兼容层。新代码禁止直接依赖 favoriteStore，
 * 请通过 favoriteRepository 或 shared/storage/adapters/favoriteAdapter 访问收藏数据。
 */
export {
  loadFavoriteEntries,
  removeFavoriteEntry,
  toggleFavoriteEntry,
} from '../../../shared/storage/adapters/favoriteAdapter'
