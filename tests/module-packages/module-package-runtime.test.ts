import { execFile } from "node:child_process";
import { mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

import { describe, expect, it, vi } from "vitest";
import * as yazl from "yazl";

import { modulePackageErrorCodes } from "@/server/module-packages/module-package-error-codes.ts";
import { modulePackageLimits } from "@/server/module-packages/module-package-constants.ts";
import {
  buildModulePackageFromDirectory,
  validateModulePackageArchive,
  validateModulePackageDirectory,
  writeGeneratedManifest,
} from "@/server/module-packages/index.ts";

const tempRoot = ".tmp-tests/module-packages";
const encoder = new TextEncoder();
const execFileAsync = promisify(execFile);

describe("secure module package runtime", () => {
  it("validates a representative package and builds reproducible archives", async () => {
    const directory = await createModuleSource("valid");
    await writeGeneratedManifest(directory);

    const source = await validateModulePackageDirectory(directory);
    const first = await buildModulePackageFromDirectory(directory, join(tempRoot, "out-a"));
    const second = await buildModulePackageFromDirectory(directory, join(tempRoot, "out-b"));
    const archive = await validateModulePackageArchive(first.archivePath);

    expect(source.ok).toBe(true);
    expect(archive.ok).toBe(true);
    expect(first.archiveSha256).toBe(second.archiveSha256);
  });

  it.each([
    ["duplicate property", '{"manifestVersion":"1.0.0","manifestVersion":"1.0.0"}\n'],
    ["invalid JSON", "{not-json}\n"],
  ])("rejects manifest with %s", async (_name, manifest) => {
    const directory = await createModuleSource(`bad-json-${_name}`);
    await writeFile(join(directory, "promptube-module.json"), manifest);

    const result = await validateModulePackageDirectory(directory);

    expect(result.ok).toBe(false);
    expect(result.report.issues[0]?.code).toBe(modulePackageErrorCodes.manifestInvalid);
  });

  it.each([
    ["unknown property", (manifest: MutableManifest) => void (manifest.unexpected = true)],
    ["extra real file", (manifest: MutableManifest) => void manifest.files.pop()],
    [
      "referenced missing file",
      (manifest: MutableManifest) =>
        void manifest.files.push({
          path: "documentation/ghost.md",
          size: 12,
          sha256: "1".repeat(64),
        }),
    ],
    [
      "duplicate path",
      (manifest: MutableManifest) => void manifest.files.push({ ...manifest.files[0]! }),
    ],
    ["wrong size", (manifest: MutableManifest) => void (manifest.files[0]!.size += 1)],
    ["wrong sha", (manifest: MutableManifest) => void (manifest.files[0]!.sha256 = "0".repeat(64))],
    ["wrong order", (manifest: MutableManifest) => void manifest.files.reverse()],
  ])("rejects manifest with %s", async (_name, mutate) => {
    const directory = await createModuleSource(`bad-manifest-${_name}`);
    const manifest = await writeGeneratedManifest(directory);
    const mutable = structuredClone(manifest) as unknown as MutableManifest;
    mutate(mutable);
    await writeFile(join(directory, "promptube-module.json"), JSON.stringify(mutable, null, 2));

    const result = await validateModulePackageDirectory(directory);

    expect(result.ok).toBe(false);
  });

  it.each([
    ["traversal", "../bad.md"],
    ["absolute path", "/badbad.x"],
    ["backslash", "instructions\\role.md"],
    ["case collision", "readme.md"],
  ])("rejects archive path with %s", async (name, path) => {
    const archivePath = join(tempRoot, `bad-path-${name}.zip`);
    if (name === "traversal" || name === "absolute path") {
      await writeZipReplacingPath(archivePath, "badbad.md", path);
    } else {
      await writeZip(archivePath, [
        ["promptube-module.json", "{}\n"],
        ["README.md", "# Module\n"],
        ["instructions/role.md", "# Role\n"],
        ["rules/safety.md", "# Safety\n"],
        ["workflows/main.md", "# Main\n"],
        [path, "# Bad\n"],
      ]);
    }

    const result = await validateModulePackageArchive(archivePath);

    expect(result.ok).toBe(false);
    expect(result.report.issues[0]?.code).toBe(modulePackageErrorCodes.archiveInvalid);
  });

  it("rejects a source package containing a symbolic link", async () => {
    const directory = await createModuleSource("symlink");
    await symlink("README.md", join(directory, "instructions", "linked.md"));

    const result = await validateModulePackageDirectory(directory);

    expect(result.ok).toBe(false);
    expect(result.report.issues[0]?.code).toBe(modulePackageErrorCodes.archiveInvalid);
  });

  it("rejects a source package containing a special file", async () => {
    const directory = await createModuleSource("special-file");
    await execFileAsync("mkfifo", [join(directory, "rules", "pipe.md")]);

    const result = await validateModulePackageDirectory(directory);

    expect(result.ok).toBe(false);
    expect(result.report.issues[0]?.code).toBe(modulePackageErrorCodes.archiveInvalid);
  });

  it("rejects source paths deeper than the package contract allows", async () => {
    const directory = await createModuleSource("deep-path");
    const nested = join(directory, "documentation", "a", "b", "c", "d", "e", "f", "g", "h", "i");
    await mkdir(nested, { recursive: true });
    await writeFile(join(nested, "deep.md"), "# Deep\n");

    const result = await validateModulePackageDirectory(directory);

    expect(result.ok).toBe(false);
    expect(result.report.issues[0]?.code).toBe(modulePackageErrorCodes.archiveInvalid);
  });

  it("rejects per-file and archive size limits before acceptance", async () => {
    const directory = await createModuleSource("size");
    await writeFile(
      join(directory, "instructions", "large.md"),
      Buffer.alloc(modulePackageLimits.maxFileBytes + 1),
    );
    const hugeArchive = join(tempRoot, "huge.zip");
    await writeFile(hugeArchive, Buffer.alloc(modulePackageLimits.maxArchiveBytes + 1));

    const source = await validateModulePackageDirectory(directory);
    const archive = await validateModulePackageArchive(hugeArchive);

    expect(source.ok).toBe(false);
    expect(source.report.issues[0]?.code).toBe(modulePackageErrorCodes.resourceLimit);
    expect(archive.ok).toBe(false);
    expect(archive.report.issues[0]?.code).toBe(modulePackageErrorCodes.resourceLimit);
  });

  it("rejects too many files and excessive compression ratio", async () => {
    const manyFiles = await createModuleSource("many-files");
    for (let index = 0; index < modulePackageLimits.maxArchiveFileEntries; index += 1) {
      await writeFile(join(manyFiles, "documentation", `file-${index}.md`), "# File\n");
    }
    const zipBomb = join(tempRoot, "zip-bomb.zip");
    await writeZip(zipBomb, [
      ["promptube-module.json", "{}\n"],
      ["README.md", "A".repeat(200_000)],
    ]);

    const many = await validateModulePackageDirectory(manyFiles);
    const bomb = await validateModulePackageArchive(zipBomb);

    expect(many.ok).toBe(false);
    expect(many.report.issues[0]?.code).toBe(modulePackageErrorCodes.resourceLimit);
    expect(bomb.ok).toBe(false);
    expect(bomb.report.issues[0]?.code).toBe(modulePackageErrorCodes.resourceLimit);
  });

  it("rejects invalid Markdown and does not use network fetch for HTTPS links", async () => {
    const directory = await createModuleSource("markdown");
    await writeFile(
      join(directory, "instructions", "role.md"),
      "[Lien](https://example.com)\n<script>x</script>\n",
    );
    await writeGeneratedManifest(directory);
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const result = await validateModulePackageDirectory(directory);

    expect(result.ok).toBe(false);
    expect(result.report.issues[0]?.code).toBe(modulePackageErrorCodes.markdownInvalid);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("fails closed when the cumulative package validation timeout is exceeded", async () => {
    const directory = await createModuleSource("timeout");
    await writeFile(join(directory, "documentation", "extra.md"), "# Extra\n");
    await writeGeneratedManifest(directory);
    const now = vi.spyOn(performance, "now");
    now.mockReturnValueOnce(0).mockReturnValue(20_000);

    const result = await validateModulePackageDirectory(directory);

    expect(result.ok).toBe(false);
    expect(result.report.issues[0]?.code).toBe(modulePackageErrorCodes.resourceLimit);
    now.mockRestore();
  });
});

type MutableManifest = {
  unexpected?: boolean;
  files: Array<{ path: string; size: number; sha256: string }>;
};

async function createModuleSource(name: string): Promise<string> {
  const directory = join(tempRoot, name);
  await rm(directory, { recursive: true, force: true });
  await mkdir(join(directory, "instructions"), { recursive: true });
  await mkdir(join(directory, "rules"), { recursive: true });
  await mkdir(join(directory, "workflows"), { recursive: true });
  await mkdir(join(directory, "documentation"), { recursive: true });
  await writeFile(join(directory, "README.md"), "# Promptube module\n\nPréversion interne.\n");
  await writeFile(
    join(directory, "instructions", "role.md"),
    "# Rôle\n\nLire, cadrer et répondre avec preuves.\n",
  );
  await writeFile(
    join(directory, "rules", "safety.md"),
    "# Sécurité\n\nNe pas exposer de secret.\n",
  );
  await writeFile(
    join(directory, "workflows", "main.md"),
    "# Workflow\n\nInspecter puis produire le livrable.\n",
  );
  await writeFile(
    join(directory, "promptube-module.json"),
    JSON.stringify(
      {
        manifestVersion: "1.0.0",
        module: {
          id: "promptube-software-architect",
          slug: "architecte-projet-logiciel",
          name: "Promptube — Architecte de projet logiciel",
          version: "1.0.0-alpha.1",
          language: "fr",
          category: "developpement-logiciel",
          subcategory: "ingenierie-logicielle-assistee-par-ia",
          entrypoint: "README.md",
        },
        files: [],
        compatibility: {
          requiredCapabilities: ["multi-file-reading", "structured-reasoning"],
          testedEnvironments: [],
        },
        license: {
          id: "previsualisation-privee-interne",
          version: "0.1.0",
        },
      },
      null,
      2,
    ),
  );
  return directory;
}

async function writeZip(
  path: string,
  entries: readonly (readonly [string, string])[],
): Promise<void> {
  await mkdir(tempRoot, { recursive: true });
  const zip = new yazl.ZipFile();
  const chunks: Buffer[] = [];
  const finished = new Promise<Buffer>((resolve, reject) => {
    zip.outputStream.on("data", (chunk) =>
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)),
    );
    zip.outputStream.on("end", () => resolve(Buffer.concat(chunks)));
    zip.outputStream.on("error", reject);
  });
  for (const [metadataPath, content] of entries) {
    zip.addBuffer(Buffer.from(encoder.encode(content)), metadataPath, {
      mtime: new Date("1980-01-01T00:00:00.000Z"),
      mode: 0o100644,
      compress: true,
      compressionLevel: 9,
      forceDosTimestamp: true,
    });
  }
  zip.end();
  await writeFile(path, await finished);
}

async function writeZipReplacingPath(
  path: string,
  fromPath: string,
  toPath: string,
): Promise<void> {
  if (fromPath.length !== toPath.length) {
    throw new Error("Replacement path must keep the ZIP record size stable.");
  }
  const temporary = `${path}.tmp.zip`;
  await writeZip(temporary, [
    ["promptube-module.json", "{}\n"],
    ["README.md", "# Module\n"],
    ["instructions/role.md", "# Role\n"],
    ["rules/safety.md", "# Safety\n"],
    ["workflows/main.md", "# Main\n"],
    [fromPath, "# Bad\n"],
  ]);
  const source = await readFile(temporary);
  const patched = Buffer.from(source);
  const from = Buffer.from(fromPath);
  const to = Buffer.from(toPath);
  let offset = patched.indexOf(from);
  while (offset !== -1) {
    to.copy(patched, offset);
    offset = patched.indexOf(from, offset + to.length);
  }
  await writeFile(path, patched);
}
