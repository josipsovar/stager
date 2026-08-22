# LinkedIn Stager

Generates self-contained "stager" pages: staged companion LinkedIn posts (with
matching first comments and article preview images) that a customer's team
can review and copy to LinkedIn after a story about them goes live. Each
generated page is a single `.html` file with all data and images inlined —
no server, works from `file://`.

## How it works

1. Author your data as JSON (see `data/example.json` for the schema: `customers`,
   `people`, `stories`, `posts`). Story/avatar images can be local file paths
   (inlined as base64 at build time) or already-hosted URLs.
2. Run the generator. It emits **one HTML file per customer**, containing only
   that customer's people, stories, and posts — other customers' data is never
   included in the file at all (not just hidden by JS), so there's no way for
   one customer to see another's staged content.
3. Send the customer their file (or host it). They pick their name from the
   tabs, optionally filter by story, and use the "Copy post" / "Copy first
   comment" / "Download image" buttons to stage their LinkedIn post. Post body
   and comment text are rendered read-only in the page — edits happen natively
   in LinkedIn after copying.

## Commands

```bash
npm install

# Build one HTML file per customer from data/example.json into dist/
npm run build:example

# Build a specific data file / output location
npx tsx src/build-standalone-stager.ts data/example.json dist
npx tsx src/build-standalone-stager.ts data/example.json dist/one-customer.html --customer=northwind

# Build the admin curation view (all customers, with a live/hide toggle per post)
npm run build:admin:example
```

## Admin view

`build-admin.ts` renders **all** customers into one page for internal
curation, with a customer switcher and a per-post "Hide from customer" /
"Show to customer" toggle. Toggles are stored as a `live` overlay in the
browser's `localStorage` (keyed by post id) — nothing is written back to the
JSON automatically. To make a hide/show decision permanent, set `"live": false`
(or remove it) on the post in the source data file and rebuild.

## Data schema

See `src/types.ts`. Key relationships:

- `customer.people` — array of person ids belonging to that customer (drives
  the tab bar).
- `post.assignees` — array of person ids a post is staged for. The same post
  object can be assigned to more than one person without duplicating it.
- `post.storySlug` — links a post to the `story` it's amplifying (headline,
  publication, preview image, published date).
- `post.live` — defaults to `true`. Set `false` to keep a draft out of the
  customer-facing build without deleting it.

## Notes

- `dist/` is git-ignored; it's regenerated from the data files.
- `withReadCta` (in `src/render.ts`) is idempotent: it only appends the
  "Read the full piece on … here: …" line if the story URL isn't already
  present in the post body, so rebuilding never double-appends it.
