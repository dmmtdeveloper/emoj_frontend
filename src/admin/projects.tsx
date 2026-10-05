/**
 * Proyectos: the shared list page (content-list.tsx) configured for
 * projects.
 */
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
    meta: [p.client, p.location].filter(Boolean).join(" · "),
    cover: p.cover,
    status: p.status,
    tag: p.featured ? "Destacado" : undefined,
    updatedAt: p.updatedAt,
  }),
  one: "proyecto",
  many: "proyectos",
  filters: { all: "Todos", published: "Publicados", draft: "Borradores" },
  newHref: "/admin/proyectos/nuevo",
  newLabel: "Nuevo proyecto",
  searchPlaceholder: "Ej.: canal, puente…",
  empty: "Todavía no hay proyectos. Crea el primero con «Nuevo proyecto».",
};

export function ProjectsPage() {
  return <ContentListPage config={CONFIG} />;
}
