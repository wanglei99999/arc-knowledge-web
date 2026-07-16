/// <reference types="vite/client" />

/**
 * 逐个列出而不是靠 vite/client 的 `[key: string]: any` 兜底：
 * 兜底之下 `import.meta.env.VITE_API_BSAE_URL` 拼错也是合法的 any，
 * 静默拿到 undefined，然后在运行时表现为「请求发去了错的地址」。
 * 列出来，拼错就是编译错。
 *
 * 全部可选：这四个都有代码内兜底（见 utils/http.ts、stores/app.ts、utils/sse.ts），
 * 标成必填是在骗自己——`.env` 缺一项时 TS 也拦不住，只有运行时知道。
 */
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_TENANT_ID?: string
  readonly VITE_USER_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
