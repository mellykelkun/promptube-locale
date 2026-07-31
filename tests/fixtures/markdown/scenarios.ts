export type MarkdownFixture = Readonly<{
  name: string;
  source?: string;
  bytes?: Uint8Array;
  path?: string;
  manifestFiles?: readonly string[];
  hook?:
    "unknown-node" | "forbidden-property" | "sanitize-mismatch" | "network-proof" | "render-parity";
}>;

const headingDocument = Array.from(
  { length: 6 },
  (_, index) => `${"#".repeat(index + 1)} Titre ${index + 1}`,
).join("\n\n");

const deepQuote = `${"> ".repeat(18)}trop profond\n`;
const excessiveNodes = `${"x\n\n".repeat(12_501)}x\n`;
const largeCodeBlock = `\`\`\`text\n${`${"x".repeat(1_024)}\n`.repeat(257)}\`\`\`\n`;
const excessiveTable = `${Array.from({ length: 33 }, (_, index) => `c${index}`).join(" | ")}\n${Array.from(
  { length: 33 },
  () => "---",
).join(" | ")}\n`;
const longDestination = `https://example.com/${"a".repeat(2_050)}`;

export const validMarkdownFixtures: readonly MarkdownFixture[] = [
  { name: "acceptation 01 - document CommonMark simple", source: "# Titre\n\nParagraphe.\n" },
  { name: "acceptation 02 - titres de niveaux 1 à 6", source: `${headingDocument}\n` },
  {
    name: "acceptation 03 - emphases et texte barré",
    source: "*italique*, **fort** et ~~barré~~.\n",
  },
  {
    name: "acceptation 04 - listes ordonnées et non ordonnées",
    source: "- un\n- deux\n\n1. premier\n2. second\n",
  },
  {
    name: "acceptation 05 - liste de tâches statique",
    source: "- [x] fait\n- [ ] restant\n",
  },
  {
    name: "acceptation 06 - tableau GFM",
    source: "| A | B |\n| --- | :---: |\n| 1 | 2 |\n",
  },
  {
    name: "acceptation 07 - lien HTTPS valide",
    source: "[Documentation](https://example.com/guide)\n",
  },
  {
    name: "acceptation 08 - autolien HTTPS valide",
    source: "<https://example.com/guide>\n",
  },
  {
    name: "acceptation 09 - lien interne inventorié",
    source: "[Guide](guide.md)\n",
    path: "docs/README.md",
    manifestFiles: ["docs/README.md", "docs/guide.md"],
  },
  {
    name: "acceptation 10 - définition de lien valide",
    source: "[Guide][guide]\n\n[guide]: https://example.com/guide\n",
  },
  {
    name: "acceptation 11 - script littéral dans un bloc de code",
    source: "```html\n<script>alert(1)</script>\n```\n",
  },
  {
    name: "acceptation 12 - URL dangereuse littérale dans un bloc de code",
    source: "`javascript:alert(1)`\n",
  },
  {
    name: "acceptation 13 - Mermaid rendu comme code inerte",
    source: "```mermaid\ngraph TD\n  A --> B\n```\n",
  },
  {
    name: "acceptation 14 - caractères français UTF-8",
    source: "Éléments sécurisés, déjà vérifiés.\n",
  },
  {
    name: "acceptation 15 - document proche de la limite de ligne",
    source: `${"a".repeat(32_000)}\n`,
  },
];

export const invalidMarkdownFixtures: readonly MarkdownFixture[] = [
  {
    name: "rejet 01 - UTF-8 invalide",
    bytes: new Uint8Array([0xc3, 0x28, 0x0a]),
  },
  {
    name: "rejet 02 - BOM interdit",
    bytes: new Uint8Array([0xef, 0xbb, 0xbf, 0x78, 0x0a]),
  },
  { name: "rejet 03 - octet NUL", bytes: new Uint8Array([0x78, 0x00, 0x0a]) },
  { name: "rejet 04 - contrôle bidirectionnel", source: "avant\u202Eaprès\n" },
  { name: "rejet 05 - front matter YAML", source: "---\ntitle: Test\n---\nTexte\n" },
  { name: "rejet 06 - front matter TOML", source: '+++\ntitle = "Test"\n+++\nTexte\n' },
  { name: "rejet 07 - balise HTML simple", source: "<div>texte</div>\n" },
  { name: "rejet 08 - commentaire HTML", source: "<!-- commentaire -->\n" },
  { name: "rejet 09 - balise script", source: "<script>alert(1)</script>\n" },
  { name: "rejet 10 - attribut événement", source: '<div onclick="alert(1)">x</div>\n' },
  { name: "rejet 11 - fragment SVG", source: "<svg><circle /></svg>\n" },
  { name: "rejet 12 - fragment MathML", source: "<math><mi>x</mi></math>\n" },
  { name: "rejet 13 - image Markdown", source: "![alt](asset.png)\n" },
  { name: "rejet 14 - image par référence", source: "![alt][image]\n\n[image]: asset.png\n" },
  { name: "rejet 15 - image data", source: "![alt](data:image/png;base64,AAAA)\n" },
  { name: "rejet 16 - composant MDX", source: '<Composant propriete="x" />\n' },
  { name: "rejet 17 - expression MDX", source: "Valeur {utilisateur}\n" },
  { name: "rejet 18 - import MDX", source: 'import Composant from "./Composant"\n' },
  { name: "rejet 19 - protocole javascript", source: "[x](javascript:alert(1))\n" },
  { name: "rejet 20 - protocole data", source: "[x](data:text/plain,test)\n" },
  { name: "rejet 21 - protocole file", source: "[x](file:///etc/passwd)\n" },
  { name: "rejet 22 - protocole mailto", source: "[x](mailto:test@example.com)\n" },
  { name: "rejet 23 - identifiants HTTPS", source: "[x](https://user:pass@example.com/)\n" },
  { name: "rejet 24 - URL sans protocole", source: "[x](//example.com/path)\n" },
  { name: "rejet 25 - localhost", source: "[x](https://LOCALHOST./)\n" },
  { name: "rejet 26 - adresse privée littérale", source: "[x](https://0x7f000001/)\n" },
  {
    name: "rejet 27 - lien relatif traversant",
    source: "[x](../secret.md)\n",
    path: "docs/README.md",
  },
  { name: "rejet 28 - lien relatif absolu", source: "[x](/guide.md)\n" },
  { name: "rejet 29 - lien relatif avec backslash", source: "[x](docs\\guide.md)\n" },
  { name: "rejet 30 - lien relatif encodé", source: "[x](docs%2Fguide.md)\n" },
  { name: "rejet 31 - lien interne absent", source: "[x](absent.md)\n" },
  { name: "rejet 32 - lien interne avec fragment", source: "[x](guide.md#titre)\n" },
  { name: "rejet 33 - nœud AST inconnu", hook: "unknown-node" },
  { name: "rejet 34 - propriété data.hName injectée", hook: "forbidden-property" },
  { name: "rejet 35 - attribut supprimé par le sanitizer", hook: "sanitize-mismatch" },
  { name: "rejet 36 - profondeur excessive", source: deepQuote },
  { name: "rejet 37 - nombre excessif de nœuds", source: excessiveNodes },
  { name: "rejet 38 - bloc de code trop volumineux", source: largeCodeBlock },
  { name: "rejet 39 - tableau trop large", source: excessiveTable },
  { name: "rejet 40 - destination de lien trop longue", source: `[x](${longDestination})\n` },
  { name: "rejet 41 - aucune tentative réseau", hook: "network-proof" },
];

export const deferredMarkdownFixtures: readonly MarkdownFixture[] = [
  { name: "rejet 42 - divergence réelle serveur/client", hook: "render-parity" },
];

export function fixtureBytes(fixture: MarkdownFixture): Uint8Array {
  return fixture.bytes ?? new TextEncoder().encode(fixture.source ?? "# fixture\n");
}
