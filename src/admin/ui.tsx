/**
 * Small UI pieces of the panel, styled with the site's semantic tokens only.
 */
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from "react";
import { useId } from "react";

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

export function Field({
  label,
  hint,
  error,
  className,
  ...input
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string | undefined;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm leading-5 font-semibold text-ink">
        {label}
      </label>
      <input
        id={id}
        className={cx(
          "min-h-11 rounded-md border bg-surface-raised px-3.5 py-2.5 text-base text-ink placeholder:text-ink-muted",
          error ? "border-brand" : "border-border-strong",
          className,
        )}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        {...input}
      />
      {hint && (
        <p id={hintId} className="text-sm leading-5 text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm leading-5 font-semibold text-brand">
          {error}
        </p>
      )}
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
