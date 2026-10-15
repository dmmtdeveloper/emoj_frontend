/**
 * Noticias: the shared list page (content-list.tsx) configured for news.
 */
import { FileText } from "lucide-react";
import type { AdminNews } from "../lib/admin/api";
import { adminApi } from "./api";
import { ContentListPage, type ListConfig } from "./content-list";

export function editNewsHref(id: string): string {
  return `/admin/noticias/editar?id=${encodeURIComponent(id)}`;
}

const CONFIG: ListConfig<AdminNews> = {
  queryKey: "news",
  load: (query) => adminApi.listNews(query),
  toRow: (n) => ({
    id: n.id,
    title: n.title,
    editHref: editNewsHref(n.id),
    siteHref: n.status === "published" ? `/noticias/${n.slug}` : null,
    meta: n.category,
    metaSub: n.location,
    cover: n.cover,
    status: n.status,
    updatedAt: n.updatedAt,
  }),
  one: "noticia",
  many: "noticias",
  columns: { item: "Noticia", meta: "Categoría" },
  icon: FileText,
  filters: { all: "Todas", published: "Publicadas", draft: "Borradores" },
  newHref: "/admin/noticias/nueva",
  newLabel: "Nueva noticia",
  searchPlaceholder: "Ej.: visita, equipo…",
  empty: "Todavía no hay noticias. Escribe la primera con «Nueva noticia».",
};

export function NewsListPage() {
  return <ContentListPage config={CONFIG} />;
}
