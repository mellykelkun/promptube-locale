import type { NavigationItem } from "@/shared/types/navigation";

export const ADMIN_NAVIGATION = [
  {
    href: "/",
    label: "Tableau de bord",
    status: "active",
  },
  {
    href: "/catalog",
    label: "Catalogue",
    status: "active",
  },
  {
    label: "Publications",
    status: "planned",
  },
  {
    label: "Utilisateurs",
    status: "planned",
  },
  {
    label: "Commandes",
    status: "planned",
  },
  {
    label: "Paiements",
    status: "planned",
  },
  {
    label: "Accès",
    status: "planned",
  },
  {
    href: "/audit",
    label: "Audit",
    status: "active",
  },
  {
    label: "Paramètres",
    status: "planned",
  },
] satisfies readonly NavigationItem[];
