import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import DashboardPage from "@/app/page";

describe("admin dashboard foundation", () => {
  it("renders the semantic admin shell and marks future sections as unavailable", () => {
    render(<DashboardPage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Fondation de l’administration Promptube",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Navigation principale" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Tableau de bord/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByText("Catalogue").closest("[aria-disabled='true']")).toBeInTheDocument();
    expect(screen.getByText(/aucune donnée ni fonctionnalité métier/i)).toBeInTheDocument();
  });
});
