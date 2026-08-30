/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  /** Must match backend INTEGRATION_API_KEY. Dev-only — set in .env.local, never committed. */
  readonly VITE_INTEGRATION_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
