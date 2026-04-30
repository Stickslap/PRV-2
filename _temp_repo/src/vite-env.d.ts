/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SQUARE_APPLICATION_ID: string;
  readonly VITE_SQUARE_LOCATION_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
