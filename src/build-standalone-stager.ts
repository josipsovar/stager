import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { renderStagerHtml } from "./render.js";
import type { StagerData, Customer } from "./types.js";

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

function inlineImage(pathOrDataUri: string | undefined, baseDir: string): string | undefined {
  if (!pathOrDataUri) return pathOrDataUri;
  if (pathOrDataUri.startsWith("data:") || /^https?:\/\//.test(pathOrDataUri)) return pathOrDataUri;
  const abs = resolve(baseDir, pathOrDataUri);
  if (!existsSync(abs)) {
    throw new Error(`Image not found: ${abs} (referenced as "${pathOrDataUri}")`);
  }
  const mime = MIME_BY_EXT[extname(abs).toLowerCase()];
  if (!mime) throw new Error(`Unsupported image type: ${abs}`);
  const buf = readFileSync(abs);
  return `data:${mime};base64,${buf.toString("base64")}`;
}

function inlineAllImages(data: StagerData, baseDir: string): StagerData {
  return {
    ...data,
    people: data.people.map((p) => ({ ...p, avatar: inlineImage(p.avatar, baseDir) })),
    stories: data.stories.map((s) => ({ ...s, image: inlineImage(s.image, baseDir) })),
  };
}

/** Scopes STAGER_DATA down to a single customer: only their people, only stories
 * their posts reference, only posts assigned to their people. This is the
 * cross-customer wall enforced structurally (not just in the UI). */
function scopeToCustomer(data: StagerData, customer: Customer): StagerData {
  const personIds = new Set(customer.people);
  const posts = data.posts.filter((p) => p.assignees.some((a) => personIds.has(a)));
  const storySlugs = new Set(posts.map((p) => p.storySlug));
  return {
    customers: [customer],
    people: data.people.filter((p) => personIds.has(p.id)),
    stories: data.stories.filter((s) => storySlugs.has(s.slug)),
    posts,
    publications: data.publications,
  };
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function main() {
  const [, , dataArg, outArg] = process.argv;
  if (!dataArg) {
    console.error("Usage: tsx src/build-standalone-stager.ts <data.json> [outDir|outFile] [--customer=<id>]");
    process.exit(1);
  }

  const customerFlag = process.argv.find((a) => a.startsWith("--customer="));
  const onlyCustomerId = customerFlag ? customerFlag.split("=")[1] : undefined;

  const dataPath = resolve(process.cwd(), dataArg);
  const baseDir = dirname(dataPath);
  const raw: StagerData = JSON.parse(readFileSync(dataPath, "utf8"));
  const data = inlineAllImages(raw, baseDir);

  const customers = onlyCustomerId ? data.customers.filter((c) => c.id === onlyCustomerId) : data.customers;
  if (customers.length === 0) {
    console.error(`No matching customer${onlyCustomerId ? ` "${onlyCustomerId}"` : ""} in ${dataArg}`);
    process.exit(1);
  }

  // Single explicit output file: only valid for exactly one customer.
  if (outArg && extname(outArg) === ".html") {
    if (customers.length !== 1) {
      console.error("An explicit output .html file requires exactly one customer (use --customer=<id>).");
      process.exit(1);
    }
    const scoped = scopeToCustomer(data, customers[0]);
    const html = renderStagerHtml(scoped, {
      title: `${customers[0].name} — Staged LinkedIn Posts`,
      mode: "customer",
    });
    const outPath = resolve(process.cwd(), outArg);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, html, "utf8");
    console.log(`Wrote ${outPath}`);
    return;
  }

  const outDir = resolve(process.cwd(), outArg || "dist");
  mkdirSync(outDir, { recursive: true });
  for (const customer of customers) {
    const scoped = scopeToCustomer(data, customer);
    const html = renderStagerHtml(scoped, {
      title: `${customer.name} — Staged LinkedIn Posts`,
      mode: "customer",
    });
    const outPath = resolve(outDir, `${slugify(customer.id || customer.name)}.html`);
    writeFileSync(outPath, html, "utf8");
    console.log(`Wrote ${outPath}`);
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();

export { inlineAllImages, scopeToCustomer };
