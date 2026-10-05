/**
 * The admin API client shared by the whole island (one CSRF token per tab).
 */
import { ADMIN_API_BASE, createAdminClient } from "../lib/admin/api";

export const adminApi = createAdminClient({ baseUrl: ADMIN_API_BASE });
