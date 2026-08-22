// Interactive scaffold for adding a new client (customer) to a stager data file,
// so onboarding a client doesn't mean hand-editing the JSON. Prompts for the
// client, its people, and (optionally) a starter story with empty posts to fill
// in later, in the same shape as data/example.json.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline";
import type { StagerData, Customer, Person, Story, Post } from "./types.js";

// A hand-rolled question queue instead of node:readline/promises: that module's
// question() loses buffered lines whenever more than one arrives before the next
// question() call attaches its listener (e.g. a user pasting several answers, or
// piped/scripted input) — every line here is queued off the 'line' event as soon
// as it arrives, so none are ever dropped regardless of timing.
function createPrompter() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const lineQueue: string[] = [];
  const waiters: Array<(line: string) => void> = [];
  rl.on("line", (line) => {
    const waiter = waiters.shift();
    if (waiter) waiter(line);
    else lineQueue.push(line);
  });
  function nextLine(): Promise<string> {
    const queued = lineQueue.shift();
    if (queued !== undefined) return Promise.resolve(queued);
    return new Promise((resolve) => waiters.push(resolve));
  }
  return {
    ask(prompt: string): Promise<string> {
      process.stdout.write(prompt);
      return nextLine();
    },
    close() {
      rl.close();
    },
  };
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function uniqueSlug(base: string, taken: Set<string>): string {
  let slug = base || "item";
  let n = 2;
  while (taken.has(slug)) {
    slug = `${base}-${n}`;
    n++;
  }
  return slug;
}

async function main() {
  const dataArg = process.argv[2] || "data/example.json";
  const dataPath = resolve(process.cwd(), dataArg);

  const data: StagerData = existsSync(dataPath)
    ? JSON.parse(readFileSync(dataPath, "utf8"))
    : { customers: [], people: [], stories: [], posts: [] };

  const prompter = createPrompter();
  const ask = (q: string) => prompter.ask(q);

  try {
    console.log(`Adding a new client to ${dataArg}${existsSync(dataPath) ? "" : " (new file)"}\n`);

    const customerName = (await ask("Client name (e.g. \"Acme Robotics\"): ")).trim();
    if (!customerName) {
      console.error("Client name is required.");
      process.exitCode = 1;
      return;
    }
    const existingCustomerIds = new Set(data.customers.map((c) => c.id));
    const customerIdInput = (await ask(`Client id [${slugify(customerName)}]: `)).trim();
    const customerId = uniqueSlug(slugify(customerIdInput || customerName), existingCustomerIds);

    const existingPersonIds = new Set(data.people.map((p) => p.id));
    const newPeople: Person[] = [];
    console.log("\nAdd people for this client (press Enter on an empty name to stop).");
    for (;;) {
      const name = (await ask(`  Person ${newPeople.length + 1} name: `)).trim();
      if (!name) break;
      const title = (await ask("    Title (e.g. \"CEO, Acme Robotics\"): ")).trim();
      const personId = uniqueSlug(slugify(name), existingPersonIds);
      existingPersonIds.add(personId);
      newPeople.push({ id: personId, name, title });
    }
    if (newPeople.length === 0) {
      console.error("\nAt least one person is required.");
      process.exitCode = 1;
      return;
    }

    const customer: Customer = { id: customerId, name: customerName, people: newPeople.map((p) => p.id) };

    const newStories: Story[] = [];
    const newPosts: Post[] = [];
    const wantsStory = (await ask("\nAdd a starter story now? [y/N]: ")).trim().toLowerCase();
    if (wantsStory === "y" || wantsStory === "yes") {
      const headline = (await ask("  Headline: ")).trim();
      const publicationUrl = (await ask("  Publication URL: ")).trim();
      let publicationDomain = "";
      try {
        publicationDomain = new URL(publicationUrl).hostname.replace(/^www\./, "");
      } catch {
        publicationDomain = (await ask("  Publication domain (e.g. techcrunch.com): ")).trim();
      }
      const publishedAt = (await ask(`  Published date (YYYY-MM-DD) [${new Date().toISOString().slice(0, 10)}]: `)).trim()
        || new Date().toISOString().slice(0, 10);
      const image = (await ask("  Preview image path (optional, relative to data file): ")).trim();

      const existingStorySlugs = new Set(data.stories.map((s) => s.slug));
      const slug = uniqueSlug(`${customerId}-${slugify(headline).split("-").slice(0, 4).join("-")}`, existingStorySlugs);
      const story: Story = { slug, headline, publicationUrl, publicationDomain, publishedAt };
      if (image) story.image = image;
      newStories.push(story);

      const postsPerPersonRaw = (await ask("  Starter (empty) posts per person [3]: ")).trim();
      const postsPerPerson = Number.isFinite(Number(postsPerPersonRaw)) && postsPerPersonRaw ? Number(postsPerPersonRaw) : 3;
      for (const person of newPeople) {
        for (let i = 1; i <= postsPerPerson; i++) {
          newPosts.push({
            id: `${person.id}-${i}`,
            storySlug: slug,
            assignees: [person.id],
            live: true,
            body: "",
            firstComment: "",
          });
        }
      }
    }

    data.customers.push(customer);
    data.people.push(...newPeople);
    data.stories.push(...newStories);
    data.posts.push(...newPosts);

    writeFileSync(dataPath, JSON.stringify(data, null, 2) + "\n", "utf8");
    console.log(`\nWrote ${dataPath}`);
    console.log(`Added client "${customerName}" (id: ${customerId}) with ${newPeople.length} people`
      + (newStories.length ? ` and ${newPosts.length} starter posts.` : "."));
    console.log(`\nNext: fill in the post bodies for "${customerId}" in ${dataArg}, then build their page with:`);
    console.log(`  npx tsx src/build-standalone-stager.ts ${dataArg} dist --customer=${customerId}`);
  } finally {
    prompter.close();
  }
}

main();
