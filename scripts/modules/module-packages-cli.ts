import { basename } from "node:path";

import {
  buildModulePackageFromDirectory,
  validateModulePackageArchive,
  validateModulePackageDirectory,
  writeGeneratedManifest,
} from "../../src/server/module-packages/index.ts";

const command = process.argv[2];
const target = process.argv[3];

try {
  if (command === "manifest") {
    await runManifest(target);
  } else if (command === "validate") {
    await runValidate(target);
  } else if (command === "build") {
    await runBuild(target);
  } else if (command === "build:all") {
    await runBuildAll();
  } else if (command === "check") {
    await runCheck();
  } else {
    printUsage();
    process.exitCode = 2;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Module package command failed.");
  process.exitCode = 1;
}

async function runManifest(
  path = "private-modules/developpement-logiciel/architecte-projet-logiciel",
) {
  const manifest = await writeGeneratedManifest(path);
  console.log(`manifest ok ${manifest.module.id} ${manifest.files.length} files`);
}

async function runValidate(
  path = "private-modules/developpement-logiciel/architecte-projet-logiciel",
) {
  const result = path.endsWith(".zip")
    ? await validateModulePackageArchive(path)
    : await validateModulePackageDirectory(path);
  printValidationResult(path, result);
  if (!result.ok) {
    process.exitCode = 1;
  }
}

async function runBuild(
  path = "private-modules/developpement-logiciel/architecte-projet-logiciel",
) {
  await writeGeneratedManifest(path);
  const built = await buildModulePackageFromDirectory(path);
  const validation = await validateModulePackageArchive(built.archivePath);
  printBuildResult(built.archivePath, built.archiveSha256, built.archiveBytes);
  printValidationResult(built.archivePath, validation);
  if (!validation.ok) {
    process.exitCode = 1;
  }
}

async function runBuildAll() {
  for (const path of [
    "private-modules/developpement-logiciel/architecte-projet-logiciel",
    "private-modules/developpement-logiciel/developpeur-methodique",
    "private-modules/developpement-logiciel/auditeur-preparation-livraison",
  ]) {
    await runBuild(path);
    if (process.exitCode) {
      return;
    }
  }
}

async function runCheck() {
  await runBuildAll();
}

function printValidationResult(
  path: string,
  result: Awaited<ReturnType<typeof validateModulePackageDirectory>>,
) {
  const label = result.ok ? "valid" : "invalid";
  console.log(
    `${label} ${basename(path)} files=${result.report.fileCount} bytes=${result.report.uncompressedBytes}`,
  );
  for (const issue of result.report.issues) {
    console.log(`issue ${issue.code}${issue.path ? ` ${issue.path}` : ""}: ${issue.message}`);
  }
}

function printBuildResult(path: string, sha256: string, bytes: number) {
  console.log(`built ${path} sha256=${sha256} bytes=${bytes}`);
}

function printUsage() {
  console.error("Usage: module-packages-cli.ts <manifest|validate|build|build:all|check> [path]");
}
