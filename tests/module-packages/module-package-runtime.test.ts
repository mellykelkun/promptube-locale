import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { EventEmitter } from "node:events";
import {
  link,
  mkdir,
  open as fsOpen,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

import { describe, expect, it, vi } from "vitest";
import type * as yauzl from "yauzl";
import * as yazl from "yazl";

import { modulePackageErrorCodes } from "@/server/module-packages/module-package-error-codes.ts";
import { modulePackageLimits } from "@/server/module-packages/module-package-constants.ts";
import type {
  MarkdownValidationInput,
  MarkdownValidationResult,
} from "@/server/markdown/markdown-types.ts";
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
  }, 15_000);

  it("keeps the three initial private module archives reproducible", async () => {
    const expected = [
      [
        "architecte-projet-logiciel",
        "e96096a93338719cfe1e10048a2400777bcbd79da8b69692b635027828ee842a",
      ],
      [
        "developpeur-methodique",
        "f578aa4118d6d91354ec35b6553def0e72e5b3371b849b94a15cf9822705b0f7",
      ],
      [
        "auditeur-preparation-livraison",
        "1e29ca4c3c75e2f3af1792640697e88a99e88523a0d65e31a294234ba8b218b3",
      ],
    ] as const;

    for (const [slug, sha256] of expected) {
      const source = join("private-modules", "developpement-logiciel", slug);
      const first = await buildModulePackageFromDirectory(source, join(tempRoot, "initial-a"));
      const second = await buildModulePackageFromDirectory(source, join(tempRoot, "initial-b"));

      expect(first.archiveSha256).toBe(sha256);
      expect(second.archiveSha256).toBe(sha256);
    }
  }, 15_000);

  it.each([
    ["duplicate property", '{"manifestVersion":"1.0.0","manifestVersion":"1.0.0"}\n'],
    ["invalid JSON", "{not-json}\n"],
  ])("rejects manifest with %s", async (_name, manifest) => {
    const directory = await createModuleSource(`bad-json-${_name}`);
    await writeFile(join(directory, "promptube-module.json"), manifest);

    const result = await validateModulePackageDirectory(directory);

    expect(result.ok).toBe(false);
    expect(result.report.issues[0]?.code).toBe(modulePackageErrorCodes.manifestInvalid);
    expect(result.report.manifestVersion).toBeNull();
  });

  it("reports a null manifest version when the manifest is absent", async () => {
    const directory = await createModuleSource("missing-manifest");
    await rm(join(directory, "promptube-module.json"));

    const result = await validateModulePackageDirectory(directory);

    expect(result.ok).toBe(false);
    expect(result.report.issues[0]?.code).toBe(modulePackageErrorCodes.archiveInvalid);
    expect(result.report.manifestVersion).toBeNull();
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

  it("rejects an existing hard-linked source file before opening it", async () => {
    const directory = await createModuleSource("hardlink-existing");
    const outside = join(tempRoot, "hardlink-source.md");
    const hardLinkedPath = join(directory, "instructions", "hard-linked.md");
    await writeFile(outside, "# Shared inode\n");
    await link(outside, hardLinkedPath);
    const opened: string[] = [];

    const result = await validateModulePackageDirectory(directory, {
      archive: {
        fileRead: {
          open: ((path, flags, mode) => {
            opened.push(String(path));
            return fsOpen(path, flags, mode);
          }) as typeof fsOpen,
        },
      },
    });

    expect(result.ok).toBe(false);
    expect(result.report.issues[0]?.code).toBe(modulePackageErrorCodes.archiveInvalid);
    expect(result.report.issues[0]?.path).toBe("instructions/hard-linked.md");
    expect(opened.some((path) => path.endsWith("hard-linked.md"))).toBe(false);
  });

  it("rejects a source file hard-linked between lstat and descriptor fstat", async () => {
    const directory = await createModuleSource("hardlink-during-open");
    const lateLink = join(tempRoot, "late-hardlink.md");
    await rm(lateLink, { force: true });
    let linked = false;

    const result = await validateModulePackageDirectory(directory, {
      archive: {
        fileRead: {
          open: (async (path, flags, mode) => {
            if (!linked && String(path).endsWith("instructions/role.md")) {
              linked = true;
              await link(String(path), lateLink);
            }
            return await fsOpen(path, flags, mode);
          }) as typeof fsOpen,
        },
      },
    });

    expect(result.ok).toBe(false);
    expect(result.report.issues[0]?.code).toBe(modulePackageErrorCodes.archiveInvalid);
    expect(result.report.issues[0]?.path).toBe("instructions/role.md");
    expect(linked).toBe(true);
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

  it("rejects an oversized archive before opening it for full read", async () => {
    const hugeArchive = join(tempRoot, "huge-before-open.zip");
    await mkdir(tempRoot, { recursive: true });
    await writeFile(hugeArchive, Buffer.alloc(modulePackageLimits.maxArchiveBytes + 1));
    const opened: string[] = [];

    const result = await validateModulePackageArchive(hugeArchive, {
      archive: {
        fileRead: {
          open: ((path, flags, mode) => {
            opened.push(String(path));
            return fsOpen(path, flags, mode);
          }) as typeof fsOpen,
        },
      },
    });

    expect(result.ok).toBe(false);
    expect(result.report.issues[0]?.code).toBe(modulePackageErrorCodes.resourceLimit);
    expect(opened).toEqual([]);
  });

  it("rejects an oversized source file before opening it for full read", async () => {
    const directory = await createModuleSource("source-before-open");
    const largePath = join(directory, "instructions", "large.md");
    await writeFile(largePath, Buffer.alloc(modulePackageLimits.maxFileBytes + 1));
    const opened: string[] = [];

    const result = await validateModulePackageDirectory(directory, {
      archive: {
        fileRead: {
          open: ((path, flags, mode) => {
            opened.push(String(path));
            return fsOpen(path, flags, mode);
          }) as typeof fsOpen,
        },
      },
    });

    expect(result.ok).toBe(false);
    expect(result.report.issues[0]?.code).toBe(modulePackageErrorCodes.resourceLimit);
    expect(opened.some((path) => path.endsWith("large.md"))).toBe(false);
  });

  it("stops source traversal before reading beyond file count and total size limits", async () => {
    const manyFiles = await createModuleSource("early-count-limit");
    for (let index = 0; index < modulePackageLimits.maxArchiveFileEntries; index += 1) {
      await writeFile(join(manyFiles, "documentation", `entry-${index}.md`), "# Entry\n");
    }
    const countOpened: string[] = [];

    const countResult = await validateModulePackageDirectory(manyFiles, {
      archive: {
        fileRead: {
          open: ((path, flags, mode) => {
            countOpened.push(String(path));
            return fsOpen(path, flags, mode);
          }) as typeof fsOpen,
        },
      },
    });

    const cumulative = await createModuleSource("early-total-limit");
    const oversizedFiles = 26;
    for (let index = 0; index < oversizedFiles; index += 1) {
      await writeFile(
        join(cumulative, "documentation", `chunk-${index}.md`),
        Buffer.alloc(modulePackageLimits.maxFileBytes),
      );
    }
    const cumulativeOpened: string[] = [];
    const cumulativeResult = await validateModulePackageDirectory(cumulative, {
      archive: {
        fileRead: {
          open: ((path, flags, mode) => {
            cumulativeOpened.push(String(path));
            return fsOpen(path, flags, mode);
          }) as typeof fsOpen,
        },
      },
    });

    expect(countResult.ok).toBe(false);
    expect(countResult.report.issues[0]?.code).toBe(modulePackageErrorCodes.resourceLimit);
    expect(countOpened.length).toBeLessThanOrEqual(modulePackageLimits.maxArchiveFileEntries);
    expect(cumulativeResult.ok).toBe(false);
    expect(cumulativeResult.report.issues[0]?.code).toBe(modulePackageErrorCodes.resourceLimit);
    expect(cumulativeOpened.length).toBeLessThan(oversizedFiles + 5);
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

  it("aborts in-flight Markdown validation and does not process following files after timeout", async () => {
    const directory = await createModuleSource("abort-timeout");
    await writeFile(join(directory, "documentation", "next.md"), "# Next\n");
    await writeGeneratedManifest(directory);
    let clock = 0;
    let scheduledTimeout: (() => void) | null = null;
    let aborted = false;
    let cleared = false;
    const seenPaths: string[] = [];

    const result = await validateModulePackageDirectory(directory, {
      now: () => clock,
      setTimeout: ((callback: () => void) => {
        scheduledTimeout = () => {
          clock = modulePackageLimits.maxPackageValidationMs + 1;
          callback();
        };
        return 1 as unknown as ReturnType<typeof setTimeout>;
      }) as typeof setTimeout,
      clearTimeout: (() => {
        cleared = true;
      }) as typeof clearTimeout,
      markdown: async (input) => {
        seenPaths.push(input.path);
        await new Promise<void>((resolve) => {
          input.signal?.addEventListener(
            "abort",
            () => {
              aborted = true;
              resolve();
            },
            { once: true },
          );
          scheduledTimeout?.();
        });
        return createValidMarkdownResult(input);
      },
    });

    expect(result.ok).toBe(false);
    expect(result.report.issues[0]?.code).toBe(modulePackageErrorCodes.resourceLimit);
    expect(aborted).toBe(true);
    expect(cleared).toBe(true);
    expect(seenPaths).toEqual(["README.md"]);
  });

  it("uses a bounded Markdown correlation id for a valid near-limit package path", async () => {
    const directory = await createModuleSource("long-correlation");
    const longPath = join(
      directory,
      "documentation",
      "a".repeat(78),
      "b".repeat(78),
      `${"c".repeat(57)}.md`,
    );
    await mkdir(join(directory, "documentation", "a".repeat(78), "b".repeat(78)), {
      recursive: true,
    });
    await writeFile(longPath, "# Long path\n");
    await writeGeneratedManifest(directory);
    const correlations: string[] = [];

    const result = await validateModulePackageDirectory(directory, {
      markdown: async (input) => {
        correlations.push(input.correlationId);
        return createValidMarkdownResult(input);
      },
    });

    expect(result.ok).toBe(true);
    expect(correlations.every((id) => id.length <= 128)).toBe(true);
    expect(correlations.some((id) => id.includes("documentation/"))).toBe(false);
  });

  it("does not publish an oversized built archive to the final path", async () => {
    const directory = await createModuleSource("oversized-built-archive");
    for (let index = 0; index < 160; index += 1) {
      await writeFile(
        join(directory, "documentation", `random-${index}.md`),
        randomBytes(70 * 1024),
      );
    }
    const output = join(tempRoot, "oversized-output");
    await rm(output, { recursive: true, force: true });

    await expect(buildModulePackageFromDirectory(directory, output)).rejects.toThrow();

    expect(await listDirectory(output)).toEqual([]);
  });

  it("removes temporary archives and keeps the final path empty when built Markdown is invalid", async () => {
    const directory = await createModuleSource("invalid-build-markdown");
    await writeFile(join(directory, "instructions", "role.md"), "<script>alert(1)</script>\n");
    const output = join(tempRoot, "invalid-build-output");
    await rm(output, { recursive: true, force: true });

    await expect(buildModulePackageFromDirectory(directory, output)).rejects.toThrow();

    expect(await listDirectory(output)).toEqual([]);
  });

  it("closes the ZIP reader after a validation failure", async () => {
    const archivePath = join(tempRoot, "close-on-failure.zip");
    await mkdir(tempRoot, { recursive: true });
    await writeFile(archivePath, "not-empty");
    const zip = new FakeZipFile();

    const result = await validateModulePackageArchive(archivePath, {
      archive: {
        openZip: async () => zip as unknown as yauzl.ZipFile,
      },
    });

    expect(result.ok).toBe(false);
    expect(result.report.issues[0]?.code).toBe(modulePackageErrorCodes.archiveInvalid);
    expect(zip.close).toHaveBeenCalledTimes(1);
  });
});

type MutableManifest = {
  unexpected?: boolean;
  files: Array<{ path: string; size: number; sha256: string }>;
};

class FakeZipFile extends EventEmitter {
  readonly close = vi.fn();

  readEntry(): void {
    this.emit("entry", {
      fileName: "../bad.md",
      generalPurposeBitFlag: 0,
      compressionMethod: 8,
      externalFileAttributes: 0,
      uncompressedSize: 10,
      compressedSize: 10,
    });
  }

  openReadStream(): void {
    throw new Error("The invalid entry must fail before stream opening.");
  }
}

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

async function listDirectory(path: string): Promise<string[]> {
  try {
    return (await readdir(path)).sort();
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

function createValidMarkdownResult(input: MarkdownValidationInput): MarkdownValidationResult {
  return {
    report: {
      validationId: "markdown-validation-test",
      contractVersion: "0.1.0",
      pipelineVersion: "test",
      filePath: input.path,
      sourceSha256: "0".repeat(64),
      correlationId: input.correlationId,
      validatedAt: "2026-08-01T00:00:00.000Z",
      dependencyVersions: {},
      metrics: {
        bytes: input.bytes.byteLength,
        lines: 1,
        nodes: 1,
        maxDepth: 1,
        links: 0,
        definitions: 0,
        tables: 0,
        tableRows: 0,
        tableColumns: 0,
        tableCells: 0,
        codeBlockBytes: 0,
        durationMs: 0,
      },
      verdict: "MARKDOWN_VALID",
      issues: [],
    },
    document: {
      root: {
        type: "root",
        children: [],
      },
    },
  } as unknown as MarkdownValidationResult;
}
