/**
 * Loading placeholders: grey blocks with a soft shimmer (AdminLayout.astro,
 * `.admin-skeleton`; still under reduced motion) in the shape of what is
 * coming, so the page does not jump when the data arrives. Each group is a
 * `role="status"` with a spoken label; the blocks are hidden from AT.
 */
import type { ReactNode } from "react";
import { cx } from "./ui";

export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx("admin-skeleton block rounded-md", className)}
    />
  );
}

function Loading({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div role="status" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

const card =
  "rounded-lg border border-border bg-surface-raised p-5 shadow-(--shadow-sm) md:p-6";

/** The whole panel while the session is checked. */
export function ShellSkeleton() {
  return (
    <Loading label="Cargando el panel…" className="min-h-dvh lg:flex">
      <div
        aria-hidden="true"
        className="hidden w-64 shrink-0 flex-col gap-3 bg-surface-inverse p-5 lg:flex"
      >
        <span className="mb-6 block h-10 w-36 rounded-md bg-ink-inverse/10" />
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className="block h-9 rounded-md bg-ink-inverse/10" />
        ))}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-h-16 items-center justify-between border-b border-border bg-surface px-4 md:px-8">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="size-9 rounded-full" />
        </div>
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
          <Skeleton className="h-6 w-72" />
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-52 rounded-lg" />
            <Skeleton className="h-52 rounded-lg" />
          </div>
        </div>
      </div>
    </Loading>
  );
}

export function DashboardSkeleton() {
  return (
    <Loading label="Cargando el resumen…" className="flex flex-col gap-6">
      <div className="grid gap-6 md:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className={cx(card, "flex flex-col gap-5")}>
            <div className="flex items-center gap-3">
              <Skeleton className="size-10" />
              <Skeleton className="h-6 w-32" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </div>
            <Skeleton className="h-11 w-44" />
          </div>
        ))}
      </div>
      <div className={cx(card, "flex flex-col gap-4")}>
        <Skeleton className="h-6 w-48" />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-5" />
        ))}
      </div>
    </Loading>
  );
}

/** Rows of a content list (cover, title, meta). */
export function ListSkeleton({
  label,
  rows = 5,
}: {
  label: string;
  rows?: number;
}) {
  return (
    <Loading label={label} className="divide-y divide-border">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 py-4">
          <Skeleton className="aspect-[4/3] w-20 shrink-0 rounded-sm" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-5 w-3/5" />
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-5 w-48" />
          </div>
        </div>
      ))}
    </Loading>
  );
}

export function MessagesSkeleton() {
  return (
    <Loading label="Cargando mensajes…" className="flex flex-col gap-8 py-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-3">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-64" />
        </div>
      ))}
    </Loading>
  );
}

/** Editor page: title, tabs, a step card and the checklist. */
export function EditorSkeleton({ label }: { label: string }) {
  return (
    <Loading label={label} className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-4 w-60" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-6">
          <div className="flex gap-3 border-b border-border pb-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-7 w-24" />
            ))}
          </div>
          <div className={cx(card, "flex flex-col gap-5")}>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-11" />
            <div className="grid gap-5 md:grid-cols-2">
              <Skeleton className="h-11" />
              <Skeleton className="h-11" />
            </div>
            <Skeleton className="h-28" />
          </div>
        </div>
        <div className={cx(card, "flex h-fit flex-col gap-3")}>
          <Skeleton className="h-6 w-36" />
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-5" />
          ))}
        </div>
      </div>
    </Loading>
  );
}

export function MediaGridSkeleton() {
  return (
    <Loading
      label="Cargando imágenes…"
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
    >
      {Array.from({ length: 10 }, (_, i) => (
        <Skeleton key={i} className="aspect-[4/3]" />
      ))}
    </Loading>
  );
}
