/**
 * Helpers shared by the panel pages: dates, API results for react-query,
 * an error notice with retry, and pagination.
 */
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ApiResult } from "../lib/api/client";
import { problemMessage } from "../lib/admin/errors";
import { LOGIN_PATH } from "../lib/admin/redirect";
import { Button, Notice } from "./ui";

const dateTimeFormat = new Intl.DateTimeFormat("es-CL", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Santiago",
});

const dateFormat = new Intl.DateTimeFormat("es-CL", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "America/Santiago",
});

export function formatDateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso));
}

export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}

/** Data of an ApiResult, or a thrown message for react-query's error state. */
export function unwrap<T>(result: ApiResult<T>): T {
  if (result.ok) return result.data;
  if (result.kind === "problem" && result.status === 401) {
    window.location.assign(LOGIN_PATH);
  }
  throw new Error(problemMessage(result));
}

export function ErrorNotice({
  error,
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  return (
    <Notice tone="error">
      {error.message}{" "}
      <button
        type="button"
        onClick={retry}
        className="font-semibold text-brand underline underline-offset-4"
      >
        Reintentar
      </button>
    </Notice>
  );
}

/** Current `?page=` of the URL (1 when missing or invalid). */
export function pageFromUrl(): number {
  const raw = Number(new URLSearchParams(window.location.search).get("page"));
  return Number.isInteger(raw) && raw > 0 ? raw : 1;
}

/** Writes a query parameter without adding a history entry. */
export function replaceParam(name: string, value: string | null): void {
  const url = new URL(window.location.href);
  if (value === null || value === "") url.searchParams.delete(name);
  else url.searchParams.set(name, value);
  window.history.replaceState(window.history.state, "", url);
}

export function Pagination({
  label,
  page,
  totalPages,
  onChange,
}: {
  label: string;
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label={label} className="flex items-center justify-between gap-4">
      <Button
        variant="secondary"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft size={18} strokeWidth={1.75} aria-hidden="true" />
        Anteriores
      </Button>
      <p className="text-sm text-ink-muted">
        Página {page} de {totalPages}
      </p>
      <Button
        variant="secondary"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        Siguientes
        <ChevronRight size={18} strokeWidth={1.75} aria-hidden="true" />
      </Button>
    </nav>
  );
}
