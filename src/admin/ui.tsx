/**
 * Small UI pieces of the panel, styled with the site's semantic tokens only.
 */
import type {
  ButtonHTMLAttributes,
  ImgHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";
import { useEffect, useId, useRef } from "react";

export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

const buttonBase =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-5 py-2.5 text-base leading-5 font-semibold transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60";

const buttonVariants = {
  primary: "bg-brand text-on-brand hover:bg-brand-hover",
  secondary:
    "border border-border-strong bg-surface-raised text-ink hover:bg-surface-sunken",
  ghost: "text-ink hover:bg-surface-sunken",
  danger:
    "border border-brand bg-surface-raised text-brand hover:bg-brand hover:text-on-brand",
} as const;

export function Button({
  variant = "primary",
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof buttonVariants;
}) {
  return (
    <button
      type="button"
      className={cx(buttonBase, buttonVariants[variant], className)}
      {...rest}
    />
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  className,
  children,
}: {
  href: string;
  variant?: keyof typeof buttonVariants;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      className={cx(
        buttonBase,
        buttonVariants[variant],
        "no-underline hover:no-underline",
        variant === "primary" && "hover:text-on-brand",
        variant !== "primary" && "hover:text-ink",
        className,
      )}
    >
      {children}
    </a>
  );
}

const controlClass =
  "rounded-md border bg-surface-raised px-3.5 py-2.5 text-base text-ink placeholder:text-ink-muted";

interface FieldChrome {
  label: string;
  hint?: ReactNode | undefined;
  error?: string | undefined;
  /** Shown at the end of the label row, e.g. a character counter. */
  aside?: ReactNode | undefined;
  /** Marks the label as optional. */
  optional?: boolean | undefined;
}

function FieldFrame({
  id,
  label,
  hint,
  error,
  aside,
  optional,
  children,
}: FieldChrome & { id: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor={id}
          className="text-sm leading-5 font-semibold text-ink"
        >
          {label}
          {optional && (
            <span className="font-medium text-ink-muted"> (opcional)</span>
          )}
        </label>
        {aside}
      </div>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-sm leading-5 text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={`${id}-error`}
          className="text-sm leading-5 font-semibold text-brand"
        >
          {error}
        </p>
      )}
    </div>
  );
}

function describedBy(id: string, hint: unknown, error: unknown) {
  return (
    [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") ||
    undefined
  );
}

export function Field({
  label,
  hint,
  error,
  aside,
  optional,
  className,
  id: idProp,
  ...input
}: InputHTMLAttributes<HTMLInputElement> & FieldChrome) {
  const generated = useId();
  const id = idProp ?? generated;
  return (
    <FieldFrame {...{ id, label, hint, error, aside, optional }}>
      <input
        id={id}
        className={cx(
          "min-h-11",
          controlClass,
          error ? "border-brand" : "border-border-strong",
          className,
        )}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        {...input}
      />
    </FieldFrame>
  );
}

export function TextArea({
  label,
  hint,
  error,
  aside,
  optional,
  className,
  id: idProp,
  ...input
}: TextareaHTMLAttributes<HTMLTextAreaElement> & FieldChrome) {
  const generated = useId();
  const id = idProp ?? generated;
  return (
    <FieldFrame {...{ id, label, hint, error, aside, optional }}>
      <textarea
        id={id}
        className={cx(
          "min-h-28 resize-y leading-7",
          controlClass,
          error ? "border-brand" : "border-border-strong",
          className,
        )}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        {...input}
      />
    </FieldFrame>
  );
}

/** "12 / 60" counter; turns brand-colored above the limit. */
export function Counter({ count, max }: { count: number; max: number }) {
  return (
    <span
      className={cx(
        "text-sm tabular-nums",
        count > max ? "font-semibold text-brand" : "text-ink-muted",
      )}
    >
      {count} / {max}
    </span>
  );
}

export function StatusBadge({ status }: { status: "draft" | "published" }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-sm leading-5 font-semibold whitespace-nowrap",
        status === "published"
          ? "bg-accent text-on-accent"
          : "bg-surface-sunken text-ink",
      )}
    >
      <span
        aria-hidden="true"
        className={cx(
          "size-1.5 rounded-full",
          status === "published" ? "bg-on-accent" : "bg-ink-muted",
        )}
      />
      {status === "published" ? "Publicado" : "Borrador"}
    </span>
  );
}

/**
 * Modal built on the native <dialog> (focus trap, Esc, top layer). Rendered
 * only while open; closing by Esc or backdrop calls `onClose`.
 */
export function Dialog({
  title,
  description,
  onClose,
  size = "md",
  children,
  footer,
}: {
  title: string;
  description?: ReactNode;
  onClose: () => void;
  size?: "md" | "lg";
  children?: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    dialog.showModal();
    const onCancel = (event: Event) => {
      event.preventDefault();
      onCloseRef.current();
    };
    const onClick = (event: MouseEvent) => {
      if (event.target === dialog) onCloseRef.current();
    };
    dialog.addEventListener("cancel", onCancel);
    dialog.addEventListener("click", onClick);
    return () => {
      dialog.removeEventListener("cancel", onCancel);
      dialog.removeEventListener("click", onClick);
      dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={cx(
        "admin-dialog m-auto max-h-[min(92dvh,56rem)] w-[calc(100%-2rem)] rounded-lg border border-border bg-surface-raised p-0 text-ink shadow-(--shadow-md)",
        size === "md" ? "max-w-lg" : "max-w-5xl",
      )}
    >
      <div className="flex max-h-[inherit] flex-col">
        <div className="flex flex-col gap-1 border-b border-border px-5 pt-5 pb-4 md:px-6">
          <h2 id={titleId} className="text-xl leading-7 font-semibold">
            {title}
          </h2>
          {description && <div className="text-ink-muted">{description}</div>}
        </div>
        {children && (
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6">
            {children}
          </div>
        )}
        {footer && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-border px-5 py-4 md:px-6">
            {footer}
          </div>
        )}
      </div>
    </dialog>
  );
}

export function ProgressBar({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-sm text-ink-muted">
        <span>{label}</span>
        <span className="tabular-nums">{percent}%</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-2 overflow-hidden rounded-full bg-surface-sunken"
      >
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-200"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export function Notice({
  tone,
  children,
}: {
  tone: "error" | "success" | "info";
  children: ReactNode;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cx(
        "rounded-md border-l-4 px-4 py-3 text-base leading-6",
        tone === "error" && "border-brand bg-surface-raised text-ink",
        tone === "success" && "border-accent bg-surface-raised text-ink",
        tone === "info" && "border-border-strong bg-surface-raised text-ink",
      )}
    >
      {children}
    </div>
  );
}

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cx(
        "rounded-lg border border-border bg-surface-raised p-5 shadow-(--shadow-sm) md:p-6",
        className,
      )}
    >
      {children}
    </section>
  );
}

/** Mono EMOJ isotype (stroke + dots), same paths as IsotipoMark.astro. */
export function Isotype({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 470 171"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path
        stroke="currentColor"
        strokeWidth="10.19"
        strokeMiterlimit="10"
        d="M443.892 73.2754C392.381 90.721 379.186 47.7751 352.023 91.6072C326.849 132.223 319.501 169.773 287.429 165.192C223.931 156.123 309.383 20.7239 259.651 6.52299C189.931 -13.3955 142.36 183.217 67.5435 164.091C5.30653 148.182 97.9414 -11.7446 129.202 14.0773C152.5 33.324 84.6338 85.6253 25.7069 101.949"
      />
      <path
        fill="currentColor"
        d="M5.95199 112.333C9.23918 112.333 11.904 109.796 11.904 106.666C11.904 103.535 9.23918 100.998 5.95199 100.998C2.6648 100.998 0 103.535 0 106.666C0 109.796 2.6648 112.333 5.95199 112.333Z"
      />
      <path
        fill="currentColor"
        d="M463.625 71.7677C466.912 71.7677 469.577 69.2302 469.577 66.1001C469.577 62.9701 466.912 60.4326 463.625 60.4326C460.337 60.4326 457.673 62.9701 457.673 66.1001C457.673 69.2302 460.337 71.7677 463.625 71.7677Z"
      />
    </svg>
  );
}

/**
 * An image that fades in once it has loaded (`.admin-fade`, AdminLayout),
 * over the grey of its box, instead of appearing line by line.
 */
export function FadeImage({
  className,
  alt,
  ...img
}: ImgHTMLAttributes<HTMLImageElement> & { alt: string }) {
  return (
    <img
      {...img}
      alt={alt}
      ref={(el) => {
        // Cached images may be complete before React attaches onLoad.
        if (el?.complete && el.naturalWidth > 0) el.dataset["loaded"] = "";
      }}
      onLoad={(e) => {
        e.currentTarget.dataset["loaded"] = "";
      }}
      onError={(e) => {
        e.currentTarget.dataset["loaded"] = "";
      }}
      className={cx("admin-fade bg-surface-sunken", className)}
    />
  );
}
