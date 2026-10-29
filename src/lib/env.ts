/** Local API used when PUBLIC_API_URL is not set (see .env.example). */
const DEFAULT_API_URL = "http://localhost:8080";

export const API_URL = import.meta.env.PUBLIC_API_URL || DEFAULT_API_URL;
