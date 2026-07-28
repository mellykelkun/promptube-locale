#!/usr/bin/env node
import { run } from "./lib.mjs";

await run("node", ["scripts/ops/backup-restore-test.mjs"]);
