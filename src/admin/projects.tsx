/**
 * Proyectos: the shared list page (content-list.tsx) configured for
 * projects.
 */
import { FolderKanban } from "lucide-react";
import type { AdminProject } from "../lib/admin/api";
import { adminApi } from "./api";
import { ContentListPage, type ListConfig } from "./content-list";

export function editProjectHref(id: string): string {
  return `/admin/proyectos/editar?id=${encodeURIComponent(id)}`;
}

const CONFIG: ListConfig<AdminProject> = {
  queryKey: "projects",
  load: (query) => adminApi.listProjects(query),
  toRow: (p) => ({
    id: p.id,
    title: p.title,
    editHref: editProjectHref(p.id),
    siteHref: p.status === "published" ? `/proyectos/${p.slug}` : null,
    meta: p.client,
    metaSub: [p.location, p.year].filter(Boolean).join(" · "),
    cover: p.cover,
    status: p.status,
    featured: p.featured,
    updatedAt: p.updatedAt,
  }),
  one: "proyecto",
  many: "proyectos",
  columns: { item: "Proyecto", meta: "Cliente" },
  icon: FolderKanban,
  filters: { all: "Todos", published: "Publicados", draft: "Borradores" },
  newHref: "/admin/proyectos/nuevo",
  newLabel: "Nuevo proyecto",
  pageSize: 5,
  searchPlaceholder: "Ej.: canal, puente…",
  empty: "Todavía no hay proyectos. Crea el primero con «Nuevo proyecto».",
};

export function ProjectsPage() {
  return <ContentListPage config={CONFIG} />;
}
