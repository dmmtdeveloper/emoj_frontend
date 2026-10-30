interface ImportMetaEnv {
  /** Canonical public origin, e.g. https://emoj.cl. */
  readonly PUBLIC_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
