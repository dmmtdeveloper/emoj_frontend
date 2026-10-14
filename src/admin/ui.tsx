/**
 * Small UI pieces of the panel, styled with the site's semantic tokens only.
 */
import type {
  ButtonHTMLAttributes,
  ImgHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  Ref,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { useEffect, useId, useRef } from "react";
import { ChevronDown } from "lucide-react";

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
  newTab = false,
  children,
}: {
  href: string;
  variant?: keyof typeof buttonVariants;
  className?: string;
  /** Opens in a new tab (and says so to screen readers). */
  newTab?: boolean;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      {...(newTab ? { target: "_blank", rel: "noopener" } : {})}
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
      {newTab && (
        <span className="sr-only">(se abre en una pestaña nueva)</span>
      )}
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

/**
 * The panel's dropdown: the same native <select> and `.select` styles as
 * the site (src/components/ui/Select.astro, src/styles/global.css), in the
 * compact size. Pass options as children. `invalid` marks the error state.
 */
export function Select({
  invalid,
  className,
  children,
  ref,
  ...select
}: SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean;
  ref?: Ref<HTMLSelectElement>;
}) {
  return (
    <span className="select-field">
      <select
        ref={ref}
        className={cx("select select--compact", className)}
        aria-invalid={invalid ? true : undefined}
        {...select}
      >
        {children}
      </select>
      <ChevronDown
        className="select-field__icon"
        size={18}
        strokeWidth={1.75}
        aria-hidden="true"
      />
    </span>
  );
}

/** A labelled `Select` with hint and error, like `Field` for inputs. */
export function SelectField({
  label,
  hint,
  error,
  aside,
  optional,
  id: idProp,
  ...select
}: SelectHTMLAttributes<HTMLSelectElement> &
  FieldChrome & { ref?: Ref<HTMLSelectElement> }) {
  const generated = useId();
  const id = idProp ?? generated;
  return (
    <FieldFrame {...{ id, label, hint, error, aside, optional }}>
      <Select
        id={id}
        invalid={Boolean(error)}
        aria-describedby={describedBy(id, hint, error)}
        {...select}
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
 * The official bold logo (design/brand/oficial/horizontal-bold.svg), for
 * small sizes like the panel sidebar, in two pieces that can be stacked:
 * `part="mark"` is the heavy isotype stroke with its dots, `part="words"`
 * is "Emoj Consultora". The stroke and "Emoj" take `--admin-mark`
 * (AdminLayout: coral on the plum sidebar, Auburn on the cream one); the
 * dots and "Consultora" take currentColor.
 */
export function BrandLockup({
  part,
  className,
}: {
  part: "mark" | "words";
  className?: string;
}) {
  if (part === "words") {
    return (
      <svg
        viewBox="891 164 677 83"
        aria-hidden="true"
        focusable="false"
        className={className}
      >
        <g fill="var(--admin-mark, currentColor)">
          <path d="M895.93,225.52v-55.3h35v10.9h-24.1v9.32h18.8v10.9h-18.8v13.27h24.1v10.9h-35Z" />
          <path d="M945.54,225.52v-39.5h10.9v2.92c1.34-1.26,2.9-2.25,4.66-2.96,1.76-.71,3.63-1.07,5.61-1.07,2.69,0,5.15.62,7.41,1.86,2.25,1.24,4.06,2.88,5.43,4.94,1.4-2.05,3.21-3.7,5.45-4.94s4.69-1.86,7.35-1.86c2.87,0,5.47.7,7.8,2.09,2.33,1.4,4.19,3.26,5.59,5.59,1.39,2.33,2.09,4.93,2.09,7.8v25.12h-10.9v-22.12c0-1.37-.34-2.61-1.01-3.73-.67-1.12-1.56-2.01-2.67-2.69-1.11-.67-2.34-1.01-3.71-1.01s-2.61.33-3.73.99-2.01,1.55-2.69,2.67-1.01,2.38-1.01,3.77v22.12h-10.9v-22.12c0-1.39-.33-2.65-.99-3.77-.66-1.12-1.55-2.01-2.67-2.67-1.12-.66-2.36-.99-3.73-.99s-2.57.34-3.69,1.01-2.01,1.57-2.69,2.69c-.67,1.12-1.01,2.36-1.01,3.73v22.12h-10.9Z" />
          <path d="M1039.04,226.55c-3.63,0-6.95-.94-9.93-2.8-2.99-1.87-5.37-4.38-7.15-7.53s-2.67-6.63-2.67-10.45c0-2.9.51-5.6,1.54-8.12,1.03-2.52,2.44-4.73,4.25-6.64,1.8-1.91,3.9-3.4,6.3-4.48,2.4-1.08,4.95-1.62,7.66-1.62,3.63,0,6.95.94,9.93,2.8,2.99,1.87,5.37,4.38,7.15,7.54,1.78,3.16,2.67,6.66,2.67,10.51,0,2.87-.51,5.56-1.54,8.06-1.03,2.5-2.44,4.71-4.25,6.62-1.8,1.91-3.9,3.4-6.28,4.48-2.38,1.08-4.94,1.62-7.68,1.62ZM1039.04,215.65c1.68,0,3.2-.46,4.54-1.36,1.34-.91,2.4-2.11,3.16-3.61.76-1.5,1.15-3.13,1.15-4.9s-.4-3.48-1.2-5c-.8-1.51-1.88-2.72-3.22-3.61s-2.82-1.34-4.42-1.34-3.16.46-4.5,1.38-2.4,2.13-3.18,3.63c-.78,1.5-1.17,3.15-1.17,4.94s.4,3.55,1.2,5.04c.8,1.49,1.88,2.67,3.22,3.54,1.34.87,2.82,1.3,4.42,1.3Z" />
          <path d="M1063.92,245.27v-10.9c1.34,0,2.57-.32,3.67-.97,1.11-.64,1.99-1.52,2.65-2.62.66-1.11.99-2.33.99-3.67v-41.08h10.9v41.08c0,3.34-.81,6.38-2.43,9.12-1.62,2.74-3.81,4.93-6.56,6.58-2.75,1.64-5.83,2.47-9.22,2.47ZM1076.76,181.48c-1.58,0-2.91-.53-3.99-1.58-1.08-1.05-1.62-2.36-1.62-3.91s.54-2.86,1.62-3.91c1.08-1.05,2.4-1.58,3.95-1.58s2.86.53,3.93,1.58,1.6,2.36,1.6,3.91-.52,2.86-1.56,3.91-2.35,1.58-3.93,1.58Z" />
        </g>
        <g fill="currentColor">
          <path d="M1148.01,226.55c-3.74,0-7.25-.75-10.55-2.23-3.29-1.49-6.18-3.54-8.67-6.16-2.49-2.62-4.44-5.67-5.85-9.14-1.41-3.48-2.11-7.19-2.11-11.14s.7-7.66,2.11-11.14c1.41-3.48,3.36-6.52,5.85-9.14,2.49-2.62,5.38-4.67,8.67-6.16s6.81-2.23,10.55-2.23c4.48,0,8.6,1.04,12.36,3.12s6.89,4.85,9.36,8.29l-7.31,3.91c-1.71-2.16-3.83-3.88-6.36-5.17-2.53-1.29-5.21-1.94-8.06-1.94-2.63,0-5.1.54-7.39,1.62s-4.31,2.55-6.04,4.42c-1.74,1.87-3.09,4.04-4.07,6.52-.97,2.48-1.46,5.11-1.46,7.9s.49,5.46,1.46,7.92c.97,2.46,2.34,4.63,4.09,6.52,1.75,1.88,3.77,3.36,6.06,4.42s4.74,1.6,7.35,1.6c2.9,0,5.6-.65,8.12-1.96s4.62-3.04,6.3-5.2l7.31,3.99c-2.47,3.45-5.6,6.21-9.36,8.28-3.77,2.07-7.89,3.1-12.36,3.1Z" />
          <path d="M1201.73,226.55c-3.63,0-6.95-.94-9.93-2.8-2.99-1.87-5.37-4.38-7.15-7.53s-2.67-6.63-2.67-10.45c0-2.9.51-5.6,1.54-8.12,1.03-2.52,2.44-4.73,4.25-6.64,1.8-1.91,3.9-3.4,6.3-4.48,2.4-1.08,4.95-1.62,7.66-1.62,3.63,0,6.95.94,9.93,2.8,2.99,1.87,5.37,4.38,7.15,7.54,1.78,3.16,2.67,6.66,2.67,10.51,0,2.87-.51,5.56-1.54,8.06-1.03,2.5-2.44,4.71-4.25,6.62-1.8,1.91-3.9,3.4-6.28,4.48-2.38,1.08-4.94,1.62-7.68,1.62ZM1201.73,218.34c2.19,0,4.15-.58,5.89-1.74,1.74-1.16,3.11-2.69,4.13-4.6,1.01-1.91,1.52-3.98,1.52-6.22s-.52-4.4-1.56-6.32c-1.04-1.92-2.43-3.46-4.17-4.6-1.74-1.15-3.67-1.72-5.81-1.72s-4.12.58-5.87,1.74-3.13,2.7-4.15,4.62-1.52,4.02-1.52,6.28.53,4.46,1.58,6.36c1.05,1.9,2.46,3.4,4.21,4.52,1.75,1.12,3.67,1.68,5.75,1.68Z" />
          <path d="M1270.07,200.76v24.77h-8.22v-22.75c0-1.76-.43-3.37-1.28-4.82-.86-1.45-2-2.6-3.44-3.46s-3.05-1.28-4.84-1.28-3.33.43-4.78,1.28-2.61,2.01-3.48,3.46c-.87,1.45-1.3,3.06-1.3,4.82v22.75h-8.22v-39.5h8.22v4.19c1.37-1.63,3.05-2.92,5.06-3.87,2-.95,4.16-1.42,6.48-1.42,2.92,0,5.58.71,7.98,2.13s4.3,3.33,5.71,5.73c1.41,2.4,2.11,5.06,2.11,7.98Z" />
          <path d="M1295.74,226.27c-2.08-.13-4.11-.55-6.08-1.26-1.97-.71-3.71-1.68-5.19-2.9s-2.6-2.67-3.34-4.32l6.99-3c.34.71.94,1.41,1.8,2.09.86.68,1.86,1.24,3.02,1.68,1.16.44,2.37.65,3.63.65s2.39-.18,3.46-.53,1.94-.9,2.63-1.64c.68-.74,1.03-1.62,1.03-2.65,0-1.16-.39-2.06-1.17-2.71-.78-.64-1.75-1.14-2.9-1.48-1.16-.34-2.32-.67-3.48-.99-2.58-.58-4.94-1.38-7.09-2.39s-3.85-2.32-5.12-3.91c-1.26-1.59-1.9-3.55-1.9-5.87,0-2.53.68-4.72,2.05-6.58,1.37-1.86,3.17-3.29,5.39-4.29,2.23-1,4.6-1.5,7.13-1.5,3.16,0,6.06.67,8.69,2.02,2.63,1.34,4.65,3.19,6.04,5.53l-6.52,3.87c-.39-.79-.99-1.5-1.78-2.13-.79-.63-1.69-1.14-2.69-1.52-1-.38-2.04-.6-3.12-.65-1.34-.05-2.59.1-3.73.46s-2.06.92-2.75,1.68c-.69.76-1.03,1.74-1.03,2.92s.41,2.02,1.22,2.59c.82.57,1.85,1.02,3.1,1.36,1.25.34,2.53.72,3.85,1.14,2.34.74,4.54,1.64,6.6,2.71,2.05,1.07,3.71,2.38,4.98,3.93,1.26,1.55,1.87,3.45,1.82,5.69,0,2.47-.75,4.65-2.23,6.52s-3.42,3.29-5.79,4.27-4.89,1.38-7.54,1.22Z" />
          <path d="M1322.41,210.71v-24.69h8.22v22.67c0,1.77.43,3.37,1.3,4.82.87,1.45,2.03,2.6,3.48,3.46,1.45.86,3.04,1.29,4.78,1.29s3.36-.43,4.8-1.29c1.43-.86,2.58-2.01,3.44-3.46.86-1.45,1.28-3.05,1.28-4.82v-22.67h8.22l.04,39.5h-8.22l-.04-4.27c-1.34,1.63-3.02,2.92-5.02,3.87-2,.95-4.15,1.42-6.44,1.42-2.92,0-5.58-.71-7.98-2.13-2.4-1.42-4.31-3.33-5.73-5.73s-2.13-5.06-2.13-7.98Z" />
          <path d="M1371.78,225.52v-59.25h8.22v59.25h-8.22Z" />
          <path d="M1416.26,194.24h-8.29l-.04,31.29h-8.22l.04-31.29h-6.28v-8.21h6.28l-.04-12.4h8.22l.04,12.4h8.29v8.21Z" />
          <path d="M1446.63,226.55c-3.63,0-6.95-.94-9.93-2.8-2.99-1.87-5.37-4.38-7.15-7.53s-2.67-6.63-2.67-10.45c0-2.9.51-5.6,1.54-8.12,1.03-2.52,2.44-4.73,4.25-6.64,1.8-1.91,3.9-3.4,6.3-4.48,2.4-1.08,4.95-1.62,7.66-1.62,3.63,0,6.95.94,9.93,2.8,2.99,1.87,5.37,4.38,7.15,7.54,1.78,3.16,2.67,6.66,2.67,10.51,0,2.87-.51,5.56-1.54,8.06-1.03,2.5-2.44,4.71-4.25,6.62-1.8,1.91-3.9,3.4-6.28,4.48-2.38,1.08-4.94,1.62-7.68,1.62ZM1446.63,218.34c2.19,0,4.15-.58,5.89-1.74,1.74-1.16,3.11-2.69,4.13-4.6,1.01-1.91,1.52-3.98,1.52-6.22s-.52-4.4-1.56-6.32c-1.04-1.92-2.43-3.46-4.17-4.6-1.74-1.15-3.67-1.72-5.81-1.72s-4.12.58-5.87,1.74-3.13,2.7-4.15,4.62-1.52,4.02-1.52,6.28.53,4.46,1.58,6.36c1.05,1.9,2.46,3.4,4.21,4.52,1.75,1.12,3.67,1.68,5.75,1.68Z" />
          <path d="M1479.42,225.52v-39.5h8.22v4.19c1.37-1.63,3.05-2.92,5.06-3.87,2-.95,4.16-1.42,6.48-1.42,1.47,0,2.94.2,4.38.59l-3.28,8.29c-1.03-.39-2.05-.59-3.08-.59-1.74,0-3.33.43-4.78,1.28s-2.61,2.01-3.48,3.46c-.87,1.45-1.3,3.06-1.3,4.82v22.75h-8.22Z" />
          <path d="M1545.74,186.02h8.22v39.5h-8.25l-.32-5.73c-1.16,2.03-2.73,3.66-4.7,4.9s-4.31,1.86-6.99,1.86c-2.9,0-5.62-.55-8.18-1.64-2.55-1.09-4.8-2.61-6.73-4.56-1.94-1.95-3.44-4.19-4.52-6.73-1.08-2.54-1.62-5.27-1.62-8.2s.53-5.47,1.58-7.96c1.05-2.49,2.51-4.67,4.38-6.54,1.87-1.87,4.04-3.34,6.5-4.4s5.1-1.6,7.92-1.6,5.4.65,7.6,1.96c2.2,1.3,4.02,2.97,5.47,5l-.36-5.85ZM1533.49,218.61c2.32,0,4.35-.57,6.08-1.72,1.74-1.15,3.09-2.69,4.05-4.64.96-1.95,1.44-4.11,1.44-6.48s-.49-4.57-1.46-6.52c-.97-1.95-2.32-3.5-4.05-4.64-1.72-1.14-3.75-1.72-6.06-1.72s-4.38.58-6.28,1.74c-1.9,1.16-3.4,2.71-4.5,4.66-1.11,1.95-1.66,4.11-1.66,6.48s.57,4.56,1.72,6.5,2.66,3.47,4.54,4.62c1.88,1.14,3.94,1.72,6.18,1.72Z" />
        </g>
      </svg>
    );
  }
  return (
    <svg
      viewBox="100 46 652 245"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path
        stroke="var(--admin-mark, currentColor)"
        strokeWidth="20"
        strokeMiterlimit="10"
        d="M704.94,151.52c-68.63,24.41-86.21-35.68-122.4,25.65-33.54,56.83-43.33,109.37-86.06,102.96-84.6-12.69,29.25-202.14-37.01-222.01-92.89-27.87-156.27,247.23-255.95,220.47-82.92-22.26,40.5-246.03,82.15-209.9,31.04,26.93-59.38,100.11-137.89,122.95"
      />
      <circle fill="currentColor" cx="116.05" cy="200.75" r="10.5" />
      <circle fill="currentColor" cx="733.94" cy="141.49" r="10.5" />
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
