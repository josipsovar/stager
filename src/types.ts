// Data schema for the LinkedIn stager. A "source" JSON file (see data/example.json)
// is authored in this shape, then build-standalone-stager.ts inlines any local image
// paths as base64 data URIs and renders it into a single self-contained HTML file.

export interface Person {
  id: string;
  name: string;
  title: string;
  /** Local file path or data: URI. Falls back to initials-on-circle if omitted. */
  avatar?: string;
}

export interface Customer {
  id: string;
  name: string;
  /** Person ids belonging to this customer, in tab display order. */
  people: string[];
}

export interface Story {
  slug: string;
  headline: string;
  publicationUrl: string;
  publicationDomain: string;
  /** ISO date (YYYY-MM-DD) the story went live. */
  publishedAt: string;
  /** Local file path or data: URI for the article preview card image. */
  image?: string;
  /** Overrides the auto-derived publication display name for this domain. */
  publicationName?: string;
}

export interface Post {
  id: string;
  storySlug: string;
  /** Person ids this staged post is written for. A post may be assigned to more than one person. */
  assignees: string[];
  body: string;
  firstComment?: string;
  /** Defaults to true. Set false to hide from the customer-facing view without deleting it. */
  live?: boolean;
}

export interface StagerData {
  customers: Customer[];
  people: Person[];
  stories: Story[];
  posts: Post[];
  /** Extra domain -> display name overrides, merged over the built-in PUBLICATION_NAMES map. */
  publications?: Record<string, string>;
}
