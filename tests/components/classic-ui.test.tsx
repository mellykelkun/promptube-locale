import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  ClassicButton,
  ClassicInput,
  ClassicSelect,
  ClassicTable,
  Dialog,
  FieldGroup,
  StatusBar,
  Tabs,
  Toolbar,
  WindowPanel,
} from "@/shared/components/classic-ui";

describe("classic admin UI primitives", () => {
  it("renders a classic window with titlebar, toolbar and statusbar", () => {
    render(
      <WindowPanel status="Prêt" title="Console">
        <Toolbar>Actions</Toolbar>
        <p>Contenu</p>
      </WindowPanel>,
    );

    expect(screen.getByText("Console")).toHaveClass("classic-titlebar");
    expect(screen.getByText("Actions")).toHaveClass("classic-toolbar");
    expect(screen.getByText("Prêt")).toHaveClass("classic-statusbar");
  });

  it("keeps form and table primitives semantic", () => {
    render(
      <>
        <FieldGroup>
          <legend>Paramètres</legend>
          <ClassicInput aria-label="Nom" />
          <ClassicSelect aria-label="État">
            <option>Actif</option>
          </ClassicSelect>
          <ClassicButton>Confirmer</ClassicButton>
        </FieldGroup>
        <ClassicTable>
          <thead>
            <tr>
              <th>Colonne</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Valeur</td>
            </tr>
          </tbody>
        </ClassicTable>
        <Tabs tabs={["Résumé", "Détails"]} />
        <StatusBar>État local</StatusBar>
        <Dialog aria-label="Confirmation">Confirmer l’action</Dialog>
      </>,
    );

    expect(screen.getByRole("group", { name: "Paramètres" })).toHaveClass("classic-panel");
    expect(screen.getByRole("button", { name: "Confirmer" })).toHaveClass("classic-button");
    expect(screen.getByRole("table")).toHaveClass("classic-table");
    expect(screen.getByText("Résumé")).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("dialog", { name: "Confirmation" })).toHaveClass("classic-window");
  });
});
