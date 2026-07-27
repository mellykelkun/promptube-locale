import type { NavigationItem } from "@/shared/types/navigation";

export const ADMIN_NAVIGATION = [
  {
    href: "/",
    label: "Tableau de bord",
    status: "active",
  },
  {
    label: "Catalogue",
    status: "planned",
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
    label: "Audit",
    status: "planned",
  },
  {
    label: "Paramètres",
    status: "planned",
  },
] satisfies readonly NavigationItem[];
