import { createApiClient } from "../api/client";
import { API_URL } from "../env";
import { createContentSource } from "./source";

/** Content from the API configured in PUBLIC_API_URL, read at build time. */
export const content = createContentSource(
  createApiClient({ baseUrl: API_URL }),
  API_URL,
);
