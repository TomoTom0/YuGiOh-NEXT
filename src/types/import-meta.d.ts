/**
 * import.meta.env の型定義（webpack DefinePlugin で注入）
 *
 * Vite の import.meta.env.DEV に相当。
 * webpack.config.cjs の DefinePlugin でビルド時に true/false に置換される。
 */
interface ImportMetaEnv {
  readonly DEV: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
