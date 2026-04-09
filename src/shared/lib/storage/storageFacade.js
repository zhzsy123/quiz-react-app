/**
 * @deprecated 兼容入口。禁止新代码继续依赖本文件。
 *
 * 当前主路径：
 * - repository：`src/entities/<domain>/api/*Repository.js`
 * - 偏好项：`src/shared/lib/preferences/preferenceRepository.js`
 *
 * 这里仅作为历史导入路径别名，统一转发到 legacy compatibility 层，
 * 用于过渡期旧链路和旧测试兼容。
 */
export * from '../../storage/compat/legacyStorageFacade.js'
