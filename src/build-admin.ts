import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { renderStagerHtml } from "./render.js";
import { inlineAllImages } from "./build-standalone-stager.js";
import type { StagerData } from "./types.js";

function main() {
  const [, , dataArg, outArg] = process.argv;
  if (!dataArg) {
    console.error("Usage: tsx src/build-admin.ts <data.json> [outFile=dist/admin.html]");
    process.exit(1);
  }

  const dataPath = resolve(process.cwd(), dataArg);
  const baseDir = dirname(dataPath);
  const raw: StagerData = JSON.parse(readFileSync(dataPath, "utf8"));
  const data = inlineAllImages(raw, baseDir);

  const html = renderStagerHtml(data, {
    title: "Stager Admin — Curate Staged Posts",
    mode: "admin",
  });

  const outPath = resolve(process.cwd(), outArg || "dist/admin.html");
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, html, "utf8");
  console.log(`Wrote ${outPath}`);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
