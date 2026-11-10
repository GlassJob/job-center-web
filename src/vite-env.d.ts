/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_JC_PROXY_TARGET?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
