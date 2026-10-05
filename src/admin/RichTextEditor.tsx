/**
 * Article text editor (TipTap). It only offers what the API accepts and the
 * site renders: headings 2-4 (the page owns the h1), bold, italic,
 * underline, strike, links (http, https, mailto), bullet and numbered lists,
 * quotes and dividers. Pasted content is reduced to the same set by the
 * editor schema. The text uses the site's `.article-body` styles, so it
 * looks as it will on the page.
 *
 * Images inside the text are not offered yet: the public API returns only
 * their media ID, so the site cannot show them (the cover image works).
 */
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Heading2,
  Heading3,
  Heading4,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { isAllowedLink, normalizeLink } from "../lib/admin/links";
import type { TipTapDocument } from "../lib/api/client";
import { Button, cx, Dialog, Field } from "./ui";

const extensions = [
  StarterKit.configure({
    heading: { levels: [2, 3, 4] },
    code: false,
    codeBlock: false,
    link: {
      openOnClick: false,
      autolink: true,
      defaultProtocol: "https",
      protocols: ["http", "https", "mailto"],
      isAllowedUri: (url) => isAllowedLink(url),
    },
  }),
];

function ToolButton({
  label,
  icon: Icon,
  active,
  disabled,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active === undefined ? undefined : active}
      disabled={disabled}
      // Keep the selection in the text while clicking the toolbar.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cx(
        "grid size-10 place-items-center rounded-sm text-ink transition-colors disabled:opacity-40",
        active
          ? "bg-surface-inverse text-ink-inverse"
          : "hover:bg-surface-sunken",
      )}
    >
      <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
    </button>
  );
}

function Divider() {
  return <span aria-hidden="true" className="mx-1 h-6 w-px bg-border" />;
}

export function RichTextEditor({
  label,
  hint,
  value,
  onChange,
  onBlur,
  error,
  editorRef,
}: {
  label: string;
  hint?: string;
  value: TipTapDocument | null;
  onChange: (doc: TipTapDocument) => void;
  onBlur?: () => void;
  error?: string | undefined;
  /** Receives a focus function (React Hook Form's `ref`, for errors). */
  editorRef?: (instance: { focus: () => void } | null) => void;
}) {
  const id = useId();
  const [linkOpen, setLinkOpen] = useState(false);
  const onChangeRef = useRef(onChange);
  const onBlurRef = useRef(onBlur);
  useEffect(() => {
    onChangeRef.current = onChange;
    onBlurRef.current = onBlur;
  });

  const editor = useEditor({
    extensions,
    content: value ?? "",
    editorProps: {
      attributes: {
        class:
          "article-body min-h-72 max-w-none px-5 py-4 focus:outline-none md:px-6",
        role: "textbox",
        "aria-multiline": "true",
        "aria-labelledby": `${id}-label`,
        ...(hint || error
          ? {
              "aria-describedby": [hint && `${id}-hint`, error && `${id}-error`]
                .filter(Boolean)
                .join(" "),
            }
          : {}),
        ...(error ? { "aria-invalid": "true" } : {}),
      },
    },
    onUpdate: ({ editor: e }) =>
      onChangeRef.current(e.getJSON() as unknown as TipTapDocument),
    onBlur: () => onBlurRef.current?.(),
  });

  useEffect(() => {
    if (!editorRef) return;
    editorRef(editor ? { focus: () => editor.commands.focus() } : null);
    return () => editorRef(null);
  }, [editor, editorRef]);

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            paragraph: e.isActive("paragraph"),
            h2: e.isActive("heading", { level: 2 }),
            h3: e.isActive("heading", { level: 3 }),
            h4: e.isActive("heading", { level: 4 }),
            bold: e.isActive("bold"),
            italic: e.isActive("italic"),
            underline: e.isActive("underline"),
            strike: e.isActive("strike"),
            link: e.isActive("link"),
            bullet: e.isActive("bulletList"),
            ordered: e.isActive("orderedList"),
            quote: e.isActive("blockquote"),
            canUndo: e.can().undo(),
            canRedo: e.can().redo(),
          }
        : null,
  });

  if (!editor || !state) return null;
  const chain = () => editor.chain().focus();

  return (
    <div className="flex flex-col gap-1.5">
      <span
        id={`${id}-label`}
        className="text-sm leading-5 font-semibold text-ink"
      >
        {label}
      </span>
      <div
        className={cx(
          "overflow-clip rounded-md border bg-surface-raised focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus-ring",
          error ? "border-brand" : "border-border-strong",
        )}
      >
        <div
          role="toolbar"
          aria-label="Formato del texto"
          aria-controls={`${id}-content`}
          className="sticky top-16 z-10 flex flex-wrap items-center gap-0.5 rounded-t-md border-b border-border bg-surface-raised p-1.5"
        >
          <ToolButton
            label="Párrafo"
            icon={Pilcrow}
            active={state.paragraph}
            onClick={() => chain().setParagraph().run()}
          />
          <ToolButton
            label="Título de sección"
            icon={Heading2}
            active={state.h2}
            onClick={() => chain().toggleHeading({ level: 2 }).run()}
          />
          <ToolButton
            label="Subtítulo"
            icon={Heading3}
            active={state.h3}
            onClick={() => chain().toggleHeading({ level: 3 }).run()}
          />
          <ToolButton
            label="Subtítulo menor"
            icon={Heading4}
            active={state.h4}
            onClick={() => chain().toggleHeading({ level: 4 }).run()}
          />
          <Divider />
          <ToolButton
            label="Negrita"
            icon={Bold}
            active={state.bold}
            onClick={() => chain().toggleBold().run()}
          />
          <ToolButton
            label="Cursiva"
            icon={Italic}
            active={state.italic}
            onClick={() => chain().toggleItalic().run()}
          />
          <ToolButton
            label="Subrayado"
            icon={Underline}
            active={state.underline}
            onClick={() => chain().toggleUnderline().run()}
          />
          <ToolButton
            label="Tachado"
            icon={Strikethrough}
            active={state.strike}
            onClick={() => chain().toggleStrike().run()}
          />
          <ToolButton
            label={state.link ? "Editar enlace" : "Agregar enlace"}
            icon={Link2}
            active={state.link}
            onClick={() => setLinkOpen(true)}
          />
          {state.link && (
            <ToolButton
              label="Quitar enlace"
              icon={Link2Off}
              onClick={() => chain().extendMarkRange("link").unsetLink().run()}
            />
          )}
          <Divider />
          <ToolButton
            label="Lista con viñetas"
            icon={List}
            active={state.bullet}
            onClick={() => chain().toggleBulletList().run()}
          />
          <ToolButton
            label="Lista numerada"
            icon={ListOrdered}
            active={state.ordered}
            onClick={() => chain().toggleOrderedList().run()}
          />
          <ToolButton
            label="Cita"
            icon={Quote}
            active={state.quote}
            onClick={() => chain().toggleBlockquote().run()}
          />
          <ToolButton
            label="Línea divisoria"
            icon={Minus}
            onClick={() => chain().setHorizontalRule().run()}
          />
          <Divider />
          <ToolButton
            label="Deshacer"
            icon={Undo2}
            disabled={!state.canUndo}
            onClick={() => chain().undo().run()}
          />
          <ToolButton
            label="Rehacer"
            icon={Redo2}
            disabled={!state.canRedo}
            onClick={() => chain().redo().run()}
          />
        </div>
        <EditorContent editor={editor} id={`${id}-content`} />
      </div>
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

      {linkOpen && (
        <LinkDialog
          initial={(editor.getAttributes("link")["href"] as string) ?? ""}
          onClose={() => {
            setLinkOpen(false);
            editor.commands.focus();
          }}
          onSave={(href) => {
            setLinkOpen(false);
            const c = chain().extendMarkRange("link");
            if (editor.state.selection.empty && !state.link) {
              // No selected text: insert the address itself as the link.
              c.insertContent({
                type: "text",
                text: href.replace(/^mailto:/, ""),
                marks: [{ type: "link", attrs: { href } }],
              }).run();
            } else {
              c.setLink({ href }).run();
            }
          }}
          onRemove={
            state.link
              ? () => {
                  setLinkOpen(false);
                  chain().extendMarkRange("link").unsetLink().run();
                }
              : undefined
          }
        />
      )}
    </div>
  );
}

function LinkDialog({
  initial,
  onClose,
  onSave,
  onRemove,
}: {
  initial: string;
  onClose: () => void;
  onSave: (href: string) => void;
  onRemove: (() => void) | undefined;
}) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const href = normalizeLink(value);
    if (!href) {
      setError(
        "Escribe una dirección web (por ejemplo, www.emoj.cl) o un correo.",
      );
      return;
    }
    onSave(href);
  }

  return (
    <Dialog
      title={initial ? "Editar enlace" : "Agregar enlace"}
      description="Se abre al hacer clic en el texto seleccionado."
      onClose={onClose}
      footer={
        <>
          {onRemove && (
            <Button variant="ghost" onClick={onRemove} className="mr-auto">
              Quitar enlace
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit}>Guardar enlace</Button>
        </>
      }
    >
      <Field
        label="Dirección del enlace"
        type="text"
        inputMode="url"
        autoComplete="url"
        spellCheck={false}
        // The dialog opens on purpose for this field.
        // eslint-disable-next-line jsx-a11y-x/no-autofocus
        autoFocus
        value={value}
        placeholder="https://… o correo@empresa.cl"
        onChange={(e) => {
          setValue(e.target.value);
          setError(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        error={error ?? undefined}
      />
    </Dialog>
  );
}
