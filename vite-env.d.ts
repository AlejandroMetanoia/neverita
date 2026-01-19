/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_GEMINI_API_NEVERITA: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
