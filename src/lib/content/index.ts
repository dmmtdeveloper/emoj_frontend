import { createApiClient } from "../api/client";
import { API_URL } from "../env";
import { createContentSource, type ContentSource } from "./source";

/**
 * A fresh content source for one page render, reading the API configured in
 * PUBLIC_API_URL. Sources memoize their requests, so never keep one across
 * requests: pages rendered on demand would show stale content.
 */
export function contentSource(): ContentSource {
  return createContentSource(createApiClient({ baseUrl: API_URL }), API_URL);
}
