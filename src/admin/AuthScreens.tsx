/**
 * Sign-in, "forgot password" and "reset password" screens. They live
 * outside the session guard, on a centred card with the brand.
 */
import { Eye, EyeOff } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { problemMessage } from "../lib/admin/errors";
import { LOGIN_PATH, safeNext } from "../lib/admin/redirect";
import { adminApi } from "./api";
import { Button, Field, Isotype, Notice } from "./ui";

function AuthCard({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <main className="grid min-h-dvh place-items-center bg-surface-sunken px-4 py-10">
      <div className="w-full max-w-[26rem]">
        <div className="mb-8 flex items-center gap-3 text-ink">
          <Isotype className="h-7 w-auto text-brand" />
          <span className="text-lg font-semibold">Panel EMOJ</span>
        </div>
        <div className="radius-signature border border-border bg-surface-raised p-7 shadow-(--shadow-md) md:p-9">
          <h1 className="text-[28px] leading-9 font-semibold text-ink">
            {title}
          </h1>
          {intro && (
            <p className="mt-2 text-base leading-6 text-ink-muted">{intro}</p>
          )}
          <div className="mt-7">{children}</div>
        </div>
        <p className="mt-6 text-center text-sm">
          <a href="/">Volver al sitio</a>
        </p>
      </div>
    </main>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  hint?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Field
        label={label}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        required
        className="pr-12"
        {...(hint ? { hint } : {})}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-pressed={visible}
        className="absolute top-[30px] right-1 grid size-10 place-items-center rounded-md text-ink-muted hover:text-ink"
      >
        {visible ? (
          <EyeOff size={20} strokeWidth={1.75} aria-hidden="true" />
        ) : (
          <Eye size={20} strokeWidth={1.75} aria-hidden="true" />
        )}
        <span className="sr-only">
          {visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        </span>
      </button>
    </div>
  );
}

export function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await adminApi.login({ email: email.trim(), password });
    if (result.ok) {
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.assign(safeNext(next));
      return;
    }
    setError(problemMessage(result, "login"));
    setBusy(false);
  }

  return (
    <AuthCard
      title="Inicia sesión"
      intro="Entra con tu correo de EMOJ para publicar proyectos y noticias."
    >
      <form
        onSubmit={(event) => void submit(event)}
        className="flex flex-col gap-5"
        noValidate={false}
      >
        {error && <Notice tone="error">{error}</Notice>}
        <Field
          label="Correo"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="username"
          inputMode="email"
          required
        />
        <PasswordField
          label="Contraseña"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />
        <Button type="submit" disabled={busy} className="mt-1 w-full">
          {busy ? "Entrando…" : "Entrar"}
        </Button>
        <p className="text-center text-sm">
          <a href="/admin/recuperar">Olvidé mi contraseña</a>
        </p>
      </form>
    </AuthCard>
  );
}

export function ForgotScreen() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await adminApi.forgotPassword(email.trim());
    setBusy(false);
    if (result.ok) setSent(true);
    else setError(problemMessage(result, "forgot"));
  }

  if (sent) {
    return (
      <AuthCard title="Revisa tu correo">
        <div className="flex flex-col gap-5">
          <Notice tone="success">
            Si <strong>{email.trim()}</strong> tiene una cuenta, te enviamos un
            enlace para crear una contraseña nueva. Vence en 30 minutos.
          </Notice>
          <p className="text-base leading-6 text-ink-muted">
            ¿No llegó? Revisa la carpeta de spam o vuelve a pedirlo en unos
            minutos.
          </p>
          <a href={LOGIN_PATH} className="font-semibold">
            Volver a iniciar sesión
          </a>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Recupera tu contraseña"
      intro="Escribe tu correo y te enviaremos un enlace para crear una contraseña nueva."
    >
      <form
        onSubmit={(event) => void submit(event)}
        className="flex flex-col gap-5"
      >
        {error && <Notice tone="error">{error}</Notice>}
        <Field
          label="Correo"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="username"
          inputMode="email"
          required
        />
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Enviando…" : "Enviar enlace"}
        </Button>
        <p className="text-center text-sm">
          <a href={LOGIN_PATH}>Volver a iniciar sesión</a>
        </p>
      </form>
    </AuthCard>
  );
}

export function ResetScreen() {
  const token = new URLSearchParams(window.location.search).get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      setError("Las dos contraseñas no coinciden.");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await adminApi.resetPassword(token, password);
    setBusy(false);
    if (result.ok) setDone(true);
    else setError(problemMessage(result, "reset"));
  }

  if (!token) {
    return (
      <AuthCard title="Enlace incompleto">
        <div className="flex flex-col gap-5">
          <Notice tone="error">
            Este enlace no trae el código para cambiar la contraseña. Ábrelo
            directamente desde el correo o pide uno nuevo.
          </Notice>
          <a href="/admin/recuperar" className="font-semibold">
            Pedir un enlace nuevo
          </a>
        </div>
      </AuthCard>
    );
  }

  if (done) {
    return (
      <AuthCard title="Contraseña actualizada">
        <div className="flex flex-col gap-5">
          <Notice tone="success">
            Listo. Por seguridad cerramos tus sesiones abiertas: entra con tu
            contraseña nueva.
          </Notice>
          <a href={LOGIN_PATH} className="font-semibold">
            Iniciar sesión
          </a>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Crea una contraseña nueva">
      <form
        onSubmit={(event) => void submit(event)}
        className="flex flex-col gap-5"
      >
        {error && <Notice tone="error">{error}</Notice>}
        <PasswordField
          label="Contraseña nueva"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          hint="Entre 12 y 128 caracteres. Una frase de varias palabras es fácil de recordar y difícil de adivinar."
        />
        <PasswordField
          label="Repite la contraseña"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
        />
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Guardando…" : "Guardar contraseña"}
        </Button>
      </form>
    </AuthCard>
  );
}
