/**
 * Mensajes: the contact form inbox (admins only, read-only). A list of
 * messages beside a reading pane on desktop; on small screens the list
 * opens one message at a time. The open message lives in the URL (`?id=`),
 * so the Resumen can link straight to it. The personal-data requests
 * (Ley 21.719) stay one click away above the inbox.
 */
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  Copy,
  Inbox,
  Mail,
  MessageCircle,
  Phone,
  ShieldCheck,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import type { ContactMessage } from "../lib/admin/api";
import { relativeTime } from "../lib/admin/dashboard";
import {
  initials,
  replyMailto,
  telHref,
  whatsappHref,
} from "../lib/admin/messages";
import { resultSummary } from "../lib/admin/pagination";
import { adminApi } from "./api";
import {
  ErrorNotice,
  formatDate,
  formatDateTime,
  pageFromUrl,
  Pagination,
  replaceParam,
  unwrap,
} from "./common";
import { PersonDataRequests } from "./privacy";
import { MessagesSkeleton } from "./skeletons";
import { Button, ButtonLink, Card, cx } from "./ui";

const PAGE_SIZE = 20;
const iconProps = { size: 18, strokeWidth: 1.75, "aria-hidden": true } as const;

function idFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get("id");
}

function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "md" | "lg";
  className?: string | undefined;
}) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        "grid shrink-0 place-items-center rounded-full bg-surface-sunken font-semibold text-ink transition-colors",
        size === "md" ? "size-10 text-sm" : "size-12 text-base",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

// Literal class lists: Tailwind only generates classes it can read here.
const SELECTED_ROW =
  "bg-surface-sunken before:absolute before:inset-y-3 before:left-0 before:w-1 before:rounded-r-full before:bg-brand";
/** The same highlight, only where the reading pane is beside the list. */
const SELECTED_ROW_DESKTOP =
  "lg:bg-surface-sunken lg:before:absolute lg:before:inset-y-3 lg:before:left-0 lg:before:w-1 lg:before:rounded-r-full lg:before:bg-brand";
const SELECTED_AVATAR = "bg-surface-inverse text-ink-inverse";
const SELECTED_AVATAR_DESKTOP = "lg:bg-surface-inverse lg:text-ink-inverse";

function ListItem({
  message,
  service,
  selected,
  onSelect,
}: {
  message: ContactMessage;
  service: string | undefined;
  /** "open": chosen by the person; "default": shown first on desktop. */
  selected: "open" | "default" | false;
  onSelect: () => void;
}) {
  return (
    <li>
      <a
        href={`/admin/mensajes?id=${encodeURIComponent(message.id)}`}
        aria-current={selected === "open" ? "true" : undefined}
        onClick={(event) => {
          if (event.metaKey || event.ctrlKey || event.shiftKey) return;
          event.preventDefault();
          onSelect();
        }}
        className={cx(
          "relative flex gap-3 px-5 py-4 text-ink no-underline transition-colors hover:text-ink md:px-6",
          selected === "open"
            ? SELECTED_ROW
            : selected === "default"
              ? cx("hover:bg-surface-sunken", SELECTED_ROW_DESKTOP)
              : "hover:bg-surface-sunken",
        )}
      >
        <Avatar
          name={message.name}
          className={
            selected === "open"
              ? SELECTED_AVATAR
              : selected === "default"
                ? SELECTED_AVATAR_DESKTOP
                : undefined
          }
        />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-baseline justify-between gap-3">
            <span className="truncate font-semibold">{message.name}</span>
            <time
              dateTime={message.createdAt}
              title={formatDateTime(message.createdAt)}
              className="shrink-0 text-xs text-ink-muted"
            >
              {relativeTime(message.createdAt)}
            </time>
          </span>
          {(message.company || service) && (
            <span className="truncate text-sm text-ink-muted">
              {[message.company, service].filter(Boolean).join(" · ")}
            </span>
          )}
          <span className="line-clamp-2 text-sm leading-5 text-ink-muted">
            {message.message}
          </span>
        </span>
      </a>
    </li>
  );
}

/** Small icon button beside the address; says "Copiado" for 2 s. */
function CopyEmail({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);
  return (
    <button
      type="button"
      title={copied ? "Copiado" : "Copiar correo"}
      onClick={() => {
        void navigator.clipboard
          ?.writeText(email)
          .then(() => setCopied(true))
          .catch(() => undefined);
      }}
      className="-my-2 grid size-9 shrink-0 place-items-center rounded-md text-ink-muted hover:bg-surface-sunken hover:text-ink"
    >
      {copied ? (
        <Check {...iconProps} size={16} />
      ) : (
        <Copy {...iconProps} size={16} />
      )}
      <span className="sr-only" aria-live="polite">
        {copied ? "Correo copiado" : "Copiar correo"}
      </span>
    </button>
  );
}

function Detail({
  message,
  service,
  onBack,
}: {
  message: ContactMessage;
  service: string | undefined;
  onBack: () => void;
}) {
  const whatsapp = message.phone ? whatsappHref(message.phone) : null;
  const facts: {
    label: string;
    value: string;
    data?: boolean;
    action?: ReactNode;
  }[] = [
    {
      label: "Correo",
      value: message.email,
      action: <CopyEmail email={message.email} />,
    },
    ...(message.phone
      ? [{ label: "Teléfono", value: message.phone, data: true }]
      : []),
    ...(message.company ? [{ label: "Empresa", value: message.company }] : []),
    ...(service ? [{ label: "Servicio", value: service }] : []),
    ...(message.location
      ? [{ label: "Ubicación", value: message.location }]
      : []),
  ];
  return (
    <article className="flex flex-col">
      <div className="flex flex-col gap-4 border-b border-border px-5 py-5 md:px-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-11 items-center gap-1.5 self-start rounded-md text-sm font-semibold text-ink hover:text-brand lg:hidden"
        >
          <ArrowLeft {...iconProps} size={16} />
          Volver a los mensajes
        </button>
        <header className="flex items-start gap-4">
          <Avatar name={message.name} size="lg" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h2 className="text-xl leading-7 font-semibold text-ink">
              {message.name}
            </h2>
            <p className="text-sm text-ink-muted">
              Recibido el{" "}
              <time dateTime={message.createdAt}>
                {formatDateTime(message.createdAt)}
              </time>
            </p>
          </div>
        </header>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={replyMailto(message, service)}>
            <Mail {...iconProps} />
            Responder por correo
          </ButtonLink>
          {whatsapp && (
            <ButtonLink href={whatsapp} variant="secondary" newTab>
              <MessageCircle {...iconProps} />
              WhatsApp
            </ButtonLink>
          )}
          {message.phone && (
            <ButtonLink href={telHref(message.phone)} variant="secondary">
              <Phone {...iconProps} />
              Llamar
            </ButtonLink>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-6 px-5 py-6 md:px-6">
        <p className="max-w-[65ch] text-base leading-7 whitespace-pre-line text-ink">
          {message.message}
        </p>
        <dl className="grid gap-x-6 gap-y-3 rounded-md border border-border p-4 sm:grid-cols-2">
          {facts.map((f) => (
            <div key={f.label} className="flex min-w-0 flex-col">
              <dt className="text-xs font-medium tracking-[0.06em] text-ink-muted uppercase">
                {f.label}
              </dt>
              <dd className="flex min-w-0 items-center gap-1">
                <span
                  className={cx(
                    "truncate text-base text-ink",
                    f.data && "font-data tabular-nums",
                  )}
                  title={f.value}
                >
                  {f.value}
                </span>
                {f.action}
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-ink-muted">
          Este mensaje se borra solo el{" "}
          <time dateTime={message.deleteAfter}>
            {formatDate(message.deleteAfter)}
          </time>
          , a los 24 meses de recibido.
        </p>
      </div>
    </article>
  );
}

export function MessagesPage({
  serviceTitles,
}: {
  serviceTitles: Record<string, string>;
}) {
  const [page, setPage] = useState(pageFromUrl);
  const [openId, setOpenId] = useState<string | null>(idFromUrl);
  const [showRequests, setShowRequests] = useState(false);
  const query = useQuery({
    queryKey: ["messages", page],
    queryFn: async () =>
      unwrap(await adminApi.listMessages({ page, pageSize: PAGE_SIZE })),
  });

  function go(next: number) {
    setPage(next);
    setOpenId(null);
    replaceParam("id", null);
    replaceParam("page", next > 1 ? String(next) : null);
    document.getElementById("contenido")?.focus();
  }

  function open(id: string | null) {
    setOpenId(id);
    replaceParam("id", id);
    // Small screens swap the list for the message: start it at the top.
    if (window.matchMedia("(max-width: 1023.98px)").matches) {
      window.scrollTo({ top: 0 });
    }
  }

  const data = query.data;
  const items = data?.items ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  // Desktop shows the first message when none is chosen; small screens
  // show the list until one is opened.
  const chosen = items.find((m) => m.id === openId);
  const shown = chosen ?? items[0];
  const serviceOf = (m: ContactMessage) =>
    m.service ? serviceTitles[m.service] : undefined;

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="flex max-w-[70ch] items-start gap-2 text-sm leading-5 text-ink-muted">
          <ShieldCheck {...iconProps} className="mt-px shrink-0 text-ink" />
          Contienen datos personales: úsalos solo para responder la consulta y
          no los compartas fuera de EMOJ.
        </p>
        <Button
          variant="secondary"
          aria-expanded={showRequests}
          onClick={() => setShowRequests((v) => !v)}
        >
          {showRequests ? <X {...iconProps} /> : <ShieldCheck {...iconProps} />}
          {showRequests ? "Cerrar solicitudes" : "Solicitudes de datos"}
        </Button>
      </div>

      {showRequests && <PersonDataRequests />}

      {query.error && (
        <ErrorNotice error={query.error} retry={() => void query.refetch()} />
      )}

      {query.isPending ? (
        <Card>
          <MessagesSkeleton />
        </Card>
      ) : data && items.length === 0 ? (
        <Card className="flex flex-col items-center gap-4 py-14 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-surface-sunken text-ink-muted">
            <Inbox size={24} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <p className="max-w-[44ch] text-ink-muted">
            Todavía no llegan consultas por el formulario de contacto. Cuando
            alguien escriba, su mensaje aparecerá aquí y en el correo de EMOJ.
          </p>
        </Card>
      ) : data && shown ? (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <section
            aria-labelledby="mensajes-lista"
            className={cx("flex flex-col gap-4", chosen && "max-lg:hidden")}
          >
            <Card className="overflow-hidden p-0! md:p-0!">
              <div className="flex items-baseline justify-between gap-3 border-b border-border px-5 py-4 md:px-6">
                <h2
                  id="mensajes-lista"
                  className="text-lg leading-6 font-semibold text-ink"
                >
                  Recibidos
                </h2>
                <p className="text-sm text-ink-muted tabular-nums">
                  {resultSummary({
                    page,
                    pageSize: PAGE_SIZE,
                    total: data.total,
                    one: "mensaje",
                    many: "mensajes",
                  })}
                </p>
              </div>
              <ul
                className={cx(
                  "divide-y divide-border transition-opacity",
                  query.isFetching && "opacity-60",
                )}
              >
                {items.map((m) => (
                  <ListItem
                    key={m.id}
                    message={m}
                    service={serviceOf(m)}
                    // The highlight follows what the reading pane shows.
                    selected={
                      m.id !== shown.id ? false : chosen ? "open" : "default"
                    }
                    onSelect={() => open(m.id)}
                  />
                ))}
              </ul>
            </Card>
            <Pagination
              label="Páginas de mensajes"
              page={page}
              totalPages={totalPages}
              onChange={go}
            />
          </section>
          <Card
            className={cx(
              "overflow-hidden p-0! md:p-0! lg:sticky lg:top-24",
              !chosen && "max-lg:hidden",
            )}
          >
            <Detail
              key={shown.id}
              message={shown}
              service={serviceOf(shown)}
              onBack={() => open(null)}
            />
          </Card>
        </div>
      ) : null}
    </div>
  );
}
