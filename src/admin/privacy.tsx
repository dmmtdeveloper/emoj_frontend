/**
 * Data subject requests (Ley 21.719) on the Mensajes page: download or
 * erase everything stored about one email address, and the audit trail of
 * past requests. Erasing cannot be undone, so it asks for confirmation and
 * names the address again.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import type { DataRequest } from "../lib/admin/api";
import { problemMessage } from "../lib/admin/errors";
import {
  accessReport,
  dataRequestLabel,
  exportFileContent,
  exportFileName,
  subjectEmailError,
} from "../lib/admin/privacy-requests";
import { CONTACT } from "../lib/site";
import { adminApi } from "./api";
import { ErrorNotice, formatDateTime, unwrap } from "./common";
import { Button, Card, Dialog, Field, Notice } from "./ui";

const HISTORY_SIZE = 10;

type Outcome =
  | { kind: "idle" }
  | { kind: "busy"; action: "export" | "erase" }
  | { kind: "done"; tone: "success" | "info"; text: string }
  | { kind: "error"; text: string };

/** Saves a text file through a temporary object URL (no inline script). */
function download(name: string, content: string): void {
  const url = URL.createObjectURL(
    new Blob([content], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function countText(n: number): string {
  return `${n} ${n === 1 ? "mensaje" : "mensajes"}`;
}

export function PersonDataRequests() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome>({ kind: "idle" });
  const [confirming, setConfirming] = useState<string | null>(null);
  const history = useQuery({
    queryKey: ["data-requests"],
    queryFn: async () =>
      unwrap(await adminApi.listDataRequests({ pageSize: HISTORY_SIZE })),
  });
  const busy = outcome.kind === "busy";

  /** The trimmed email, or null after showing why it cannot be sent. */
  function checked(): string | null {
    const error = subjectEmailError(email);
    setFieldError(error);
    return error ? null : email.trim();
  }

  async function exportData() {
    const subject = checked();
    if (!subject) return;
    setOutcome({ kind: "busy", action: "export" });
    const result = await adminApi.exportPersonData(subject);
    void queryClient.invalidateQueries({ queryKey: ["data-requests"] });
    if (!result.ok) {
      setOutcome({ kind: "error", text: problemMessage(result) });
      return;
    }
    const { messages, generatedAt } = result.data;
    download(
      exportFileName(subject, generatedAt),
      exportFileContent(accessReport(result.data)),
    );
    setOutcome(
      messages.length === 0
        ? {
            kind: "done",
            tone: "info",
            text: `No hay mensajes de ${subject}. Igual descargamos el archivo y quedó registrada la solicitud, para que puedas responderle.`,
          }
        : {
            kind: "done",
            tone: "success",
            text: `Descargamos ${countText(messages.length)} de ${subject}. Envíale el archivo por correo para responder su solicitud; ya incluye para qué usamos sus datos y con quién los compartimos.`,
          },
    );
  }

  function askErase() {
    const subject = checked();
    if (subject) setConfirming(subject);
  }

  async function erase(subject: string) {
    setConfirming(null);
    setOutcome({ kind: "busy", action: "erase" });
    const result = await adminApi.erasePersonData(subject);
    void queryClient.invalidateQueries({ queryKey: ["data-requests"] });
    void queryClient.invalidateQueries({ queryKey: ["messages"] });
    if (!result.ok) {
      setOutcome({ kind: "error", text: problemMessage(result) });
      return;
    }
    const { deleted } = result.data;
    setEmail("");
    setOutcome({
      kind: "done",
      tone: deleted === 0 ? "info" : "success",
      text:
        deleted === 0
          ? `No había mensajes de ${subject} en el panel. Revisa igual ${CONTACT.email} y avísale por escrito.`
          : `Eliminamos ${countText(deleted)} de ${subject}. Borra también sus correos en ${CONTACT.email} y avísale por escrito.`,
    });
  }

  return (
    <Card className="flex flex-col gap-5">
      <div className="flex items-start gap-3">
        <ShieldCheck
          size={22}
          strokeWidth={1.75}
          aria-hidden="true"
          className="mt-0.5 shrink-0 text-brand"
        />
        <div className="flex flex-col gap-1">
          <h2 className="text-lg leading-6 font-semibold text-ink">
            Solicitudes de datos personales
          </h2>
          <p className="max-w-[65ch] text-ink-muted">
            Si alguien pide ver o borrar sus datos, acúsale recibo y escribe
            aquí el correo con el que nos escribió. Respóndele a ese mismo
            correo dentro de 30 días corridos (2 días hábiles si además pide
            bloquear sus datos) y guarda el correo enviado. Cada solicitud queda
            registrada con tu nombre.
          </p>
        </div>
      </div>

      <form
        noValidate
        className="flex flex-col gap-3 md:flex-row md:items-start"
        onSubmit={(event) => {
          event.preventDefault();
          void exportData();
        }}
      >
        <Field
          label="Correo de la persona"
          type="email"
          inputMode="email"
          autoComplete="off"
          spellCheck={false}
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setFieldError(null);
          }}
          error={fieldError ?? undefined}
          className="md:min-w-80"
        />
        <div className="flex flex-wrap gap-2 md:pt-7">
          <Button type="submit" variant="secondary" disabled={busy}>
            <Download size={18} strokeWidth={1.75} aria-hidden="true" />
            {outcome.kind === "busy" && outcome.action === "export"
              ? "Preparando…"
              : "Descargar datos"}
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={busy}
            onClick={askErase}
          >
            <Trash2 size={18} strokeWidth={1.75} aria-hidden="true" />
            {outcome.kind === "busy" && outcome.action === "erase"
              ? "Eliminando…"
              : "Eliminar datos"}
          </Button>
        </div>
      </form>

      {outcome.kind === "done" && (
        <Notice tone={outcome.tone}>{outcome.text}</Notice>
      )}
      {outcome.kind === "error" && <Notice tone="error">{outcome.text}</Notice>}

      <section
        aria-labelledby="historial-solicitudes"
        className="flex flex-col gap-3"
      >
        <h3
          id="historial-solicitudes"
          className="text-sm leading-5 font-semibold text-ink"
        >
          Últimas solicitudes
        </h3>
        {history.error ? (
          <ErrorNotice
            error={history.error}
            retry={() => void history.refetch()}
          />
        ) : history.data && history.data.items.length === 0 ? (
          <p className="text-ink-muted">Todavía no hay solicitudes.</p>
        ) : history.data ? (
          <ul className="divide-y divide-border">
            {history.data.items.map((r) => (
              <RequestRow key={r.id} request={r} />
            ))}
          </ul>
        ) : (
          <p className="text-ink-muted">Cargando…</p>
        )}
      </section>

      {confirming && (
        <Dialog
          title="¿Eliminar los datos de esta persona?"
          description={
            <>
              Se borran todos los mensajes enviados desde{" "}
              <strong className="font-semibold text-ink">{confirming}</strong>.
              No se puede deshacer. Si te pidió también una copia, descárgala
              antes. Sus correos en {CONTACT.email} tendrás que borrarlos tú.
            </>
          }
          onClose={() => setConfirming(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirming(null)}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={() => void erase(confirming)}>
                Eliminar datos
              </Button>
            </>
          }
        />
      )}
    </Card>
  );
}

function RequestRow({ request }: { request: DataRequest }) {
  return (
    <li className="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <span className="text-ink">
        <span className="font-medium">
          {dataRequestLabel(request.kind, request.messages)}
        </span>{" "}
        <span className="text-ink-muted">· {request.email}</span>
      </span>
      <span className="text-sm text-ink-muted">
        {request.performedBy} ·{" "}
        <time dateTime={request.createdAt}>
          {formatDateTime(request.createdAt)}
        </time>
      </span>
    </li>
  );
}
