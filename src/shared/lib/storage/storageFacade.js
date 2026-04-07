/**
 * @deprecated 兼容桥接文件。新代码禁止从该路径导入。
 *
 * 请改用：
 * - repository：`src/entities/<domain>/api/*Repository.js`
 * - 偏好项：`src/shared/lib/preferences/preferenceRepository.js`
 * - 兼容层：`src/shared/storage/compat/legacyStorageFacade.js`
 */
export * from '../../storage/compat/legacyStorageFacade'
