# LinkedIn Stager

Generates self-contained "stager" pages: staged companion LinkedIn posts (with
matching first comments and article preview images) that a customer's team
can review and copy to LinkedIn after a story about them goes live. Each
generated page is a single `.html` file with all data and images inlined —
no server, works from `file://`.

## How it works

1. Author your data as JSON (see `data/example.json` for the schema: `customers`,
   `people`, `stories`, `posts`), or scaffold a new client interactively with
   `npm run new-client` (see below). Story/avatar images can be local file paths
   (inlined as base64 at build time) or already-hosted URLs.
2. Run the generator. It emits **one HTML file per customer**, containing only
   that customer's people, stories, and posts — other customers' data is never
   included in the file at all (not just hidden by JS), so there's no way for
   one customer to see another's staged content.
3. Send the customer their file (or host it). They pick their name from the
   tabs, optionally filter by story, and see each staged post rendered as a
   preview of the real LinkedIn post card (avatar, headline, audience,
   article link preview, reaction icons). A separate "Staging tools" panel
   below each preview has the "Copy post" / "Copy first comment" / "Download
   image" buttons used to stage it on LinkedIn.
4. The client name, post body, first comment, and each person's avatar are
   all click-to-edit directly on the page (hover an avatar for the photo
   upload button). See **In-browser editing** below for how those edits are
   saved.

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

# Interactively scaffold a new client (customer + people + optional starter story/posts)
npm run new-client -- data/example.json
```

## Adding a new client

`npm run new-client -- <data.json>` walks you through adding one client without
hand-editing JSON: client name, its people (name + title, repeat as needed),
and optionally a starter story with a set number of empty posts per person
(matching the shape already used for the example clients). It appends the new
entries to the given data file and prints the exact build command for that
client's id when it's done. Fill in the empty post/comment bodies afterward,
then build as usual.

## In-browser editing

Client name, post body, first comment, and avatars are all editable directly
on the page (click into text to edit; hover an avatar for the upload
button). These edits are saved to that browser's `localStorage` as soon as
you click/tab away — refreshing the page keeps them. They are **not** written
back to the source JSON: they live only in the browser that made them, the
same way the admin live/hide toggle already works (see below). To make an
edit permanent for everyone who opens the file, copy it back into the data
file and rebuild. Post body edits still get the "Read the full piece on …"
line appended automatically if you didn't paste the story link back in
yourself (`withReadCta` is idempotent either way).

## Post variants ("three versions")

A person can have more than one post staged for the same story — `new-client`
defaults to three per person (`post.angle`: "Primary" / "Personal angle" /
"Data-driven"), each rendered as its own card with that label shown as a
small pill. Add, remove, or relabel variants by editing `posts` in the data
file; there's no in-browser way to add a new post card, only to edit the
copy on the ones already there.

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
- `post.angle` — optional short label ("Primary", "Data-driven", …) shown as
  a pill on the card, for when a person has several post variants staged for
  the same story. See **Post variants** below.
- `post.visibility` — `"PUBLIC"` (default), `"CONNECTIONS"`, or `"LOGGED_IN"`.
  Mirrors LinkedIn's own Posts API `visibility` enum and drives the
  audience icon/label shown in the preview, so a value stored here maps
  directly onto that field if direct publishing via the API is ever added
  (see `src/types.ts` for the other field mappings — this project only
  generates copy/paste pages today, it doesn't call LinkedIn's API).

## Notes

- `dist/` is git-ignored; it's regenerated from the data files.
- `withReadCta` (in `src/render.ts`) is idempotent: it only appends the
  "Read the full piece on … here: …" line if the story URL isn't already
  present in the post body, so rebuilding never double-appends it.
