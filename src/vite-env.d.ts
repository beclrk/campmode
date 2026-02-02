/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

// Ensure ImportMeta.env is available (Vercel/build may not load vite/client)
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
