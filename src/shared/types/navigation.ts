export type NavigationItem =
  | {
      href: string;
      label: string;
      status: "active";
    }
  | {
      label: string;
      status: "planned";
    };
