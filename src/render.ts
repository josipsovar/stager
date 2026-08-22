import type { StagerData } from "./types.js";

export interface RenderOptions {
  /** <title> and header text for the page. */
  title: string;
  /** 'customer': read-only staged-post viewer for a customer's team.
   *  'admin': cross-customer curation view with a live/dead toggle overlay. */
  mode: "customer" | "admin";
}

/** Prevents the embedded JSON from breaking out of its <script> tag. */
function safeJson(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c").replace(/-->/g, "--\\u003e");
}

const BUILTIN_PUBLICATION_NAMES: Record<string, string> = {
  "techcrunch.com": "TechCrunch",
  "forbes.com": "Forbes",
  "wsj.com": "The Wall Street Journal",
  "nytimes.com": "The New York Times",
  "bloomberg.com": "Bloomberg",
  "axios.com": "Axios",
  "theverge.com": "The Verge",
  "wired.com": "WIRED",
  "businessinsider.com": "Business Insider",
  "fastcompany.com": "Fast Company",
  "inc.com": "Inc.",
  "venturebeat.com": "VentureBeat",
  "reuters.com": "Reuters",
};

export function renderStagerHtml(data: StagerData, opts: RenderOptions): string {
  const dataJson = safeJson(data);
  const builtinJson = safeJson(BUILTIN_PUBLICATION_NAMES);
  const modeJson = safeJson(opts.mode);
  const titleHtml = escapeHtml(opts.title);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titleHtml}</title>
<style>
${CSS}
</style>
</head>
<body>
<header class="topbar">
  <div class="topbar-inner">
    <div class="brand">${titleHtml}</div>
    <nav id="tabs" class="tabs" role="tablist" aria-label="People"></nav>
  </div>
</header>

<main class="wrap">
  <div class="controls">
    <label class="story-filter" id="customerFilterWrap" hidden>
      Customer
      <select id="customerSelect" aria-label="Switch customer"></select>
    </label>
    <label class="story-filter">
      Story
      <select id="storySelect" aria-label="Filter by story"></select>
    </label>
    <div id="personMeta" class="person-meta"></div>
  </div>

  <section id="grid" class="grid"></section>
  <p id="empty" class="empty" hidden>No staged posts yet for this view.</p>
</main>

<template id="postCardTpl">
  <article class="card">
    <div class="card-head">
      <div class="avatar"></div>
      <div class="who">
        <div class="name"></div>
        <div class="title"></div>
      </div>
      <div class="live-badge" hidden></div>
    </div>
    <div class="body"></div>
    <div class="preview" hidden>
      <img alt="">
      <div class="preview-meta">
        <div class="pub"></div>
        <div class="headline"></div>
      </div>
    </div>
    <div class="actions">
      <button type="button" class="btn copy-post">Copy post</button>
      <button type="button" class="btn copy-comment" hidden>Copy first comment</button>
      <button type="button" class="btn download-img" hidden>Download image</button>
      <button type="button" class="btn toggle-live" hidden></button>
    </div>
    <div class="comment-block" hidden>
      <div class="comment-label">First comment</div>
      <div class="comment"></div>
    </div>
  </article>
</template>

<script id="stager-data" type="application/json">${dataJson}</script>
<script>
(function () {
  "use strict";

  var STAGER_DATA = JSON.parse(document.getElementById("stager-data").textContent);
  var BUILTIN_PUBLICATION_NAMES = ${builtinJson};
  var MODE = ${modeJson};
  var PUBLICATION_NAMES = Object.assign({}, BUILTIN_PUBLICATION_NAMES, STAGER_DATA.publications || {});

  // ---- lookups -------------------------------------------------------

  function peopleById() {
    var map = {};
    for (var i = 0; i < STAGER_DATA.people.length; i++) map[STAGER_DATA.people[i].id] = STAGER_DATA.people[i];
    return map;
  }

  function storiesBySlug() {
    var map = {};
    for (var i = 0; i < STAGER_DATA.stories.length; i++) map[STAGER_DATA.stories[i].slug] = STAGER_DATA.stories[i];
    return map;
  }

  // Cross-customer wall: never resolve people/posts/stories outside the
  // given customer's own roster, even if MODE === "admin" is browsing many.
  function personsOf(customer) {
    var byId = peopleById();
    return customer.people.map(function (id) { return byId[id]; }).filter(Boolean);
  }

  function postsFor(customer, personId) {
    var allowed = {};
    customer.people.forEach(function (id) { allowed[id] = true; });
    return STAGER_DATA.posts.filter(function (p) {
      if (!p.assignees.some(function (id) { return id === personId; })) return false;
      // defensive: assignee must actually belong to this customer
      return p.assignees.every(function (id) { return allowed[id]; }) || p.assignees.indexOf(personId) !== -1;
    });
  }

  function publicationNameFor(story) {
    if (story.publicationName) return story.publicationName;
    return PUBLICATION_NAMES[story.publicationDomain] || story.publicationDomain;
  }

  function withReadCta(body, story) {
    if (!story) return body;
    if (body.indexOf(story.publicationUrl) !== -1) return body;
    var name = publicationNameFor(story);
    var cta = "Read the full piece on " + name + " here: " + story.publicationUrl;
    var trimmed = body.replace(/\\s+$/, "");
    return trimmed ? trimmed + "\\n\\n" + cta : cta;
  }

  // ---- live/dead overlay (admin only; persisted per-browser) --------

  function overlayKey() { return "stager-live-overlay"; }

  function readOverlay() {
    try {
      return JSON.parse(localStorage.getItem(overlayKey()) || "{}");
    } catch (e) {
      return {};
    }
  }

  function writeOverlay(overlay) {
    try {
      localStorage.setItem(overlayKey(), JSON.stringify(overlay));
    } catch (e) {}
  }

  function effectiveLive(post) {
    var overlay = readOverlay();
    if (Object.prototype.hasOwnProperty.call(overlay, post.id)) return !!overlay[post.id];
    return post.live !== false;
  }

  function setLive(postId, live) {
    var overlay = readOverlay();
    overlay[postId] = live;
    writeOverlay(overlay);
  }

  // ---- formatting -----------------------------------------------------

  function formatDate(iso) {
    if (!iso) return "";
    var d = new Date(iso + "T00:00:00");
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  function storyDateOf(story) { return formatDate(story && story.publishedAt); }

  function initials(name) {
    return (name || "")
      .split(/\\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(function (p) { return p[0].toUpperCase(); })
      .join("");
  }

  function fillAvatar(el, person) {
    el.innerHTML = "";
    if (person.avatar) {
      var img = document.createElement("img");
      img.src = person.avatar;
      img.alt = person.name;
      el.appendChild(img);
    } else {
      el.textContent = initials(person.name);
    }
  }

  // ---- clipboard / download -------------------------------------------

  function flash(btn, label) {
    var original = btn.textContent;
    btn.textContent = label;
    btn.classList.add("flashed");
    setTimeout(function () {
      btn.textContent = original;
      btn.classList.remove("flashed");
    }, 1400);
  }

  function copyText(text, btn, successLabel) {
    function onSuccess() { flash(btn, successLabel || "Copied"); }
    function onFail() {
      try {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        onSuccess();
      } catch (e) {
        flash(btn, "Copy failed");
      }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(onSuccess, onFail);
    } else {
      onFail();
    }
  }

  function downloadImage(url, filename, btn) {
    var a = document.createElement("a");
    a.href = url;
    a.download = filename || "story-preview";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (btn) flash(btn, "Downloaded");
  }

  // ---- card rendering ---------------------------------------------------

  var tpl = document.getElementById("postCardTpl");
  var storyIndex = storiesBySlug();

  function postCard(post, person) {
    var node = tpl.content.firstElementChild.cloneNode(true);
    var story = storyIndex[post.storySlug];

    fillAvatar(node.querySelector(".avatar"), person);
    node.querySelector(".name").textContent = person.name;
    node.querySelector(".title").textContent = person.title || "";

    var live = effectiveLive(post);
    var badge = node.querySelector(".live-badge");
    if (MODE === "admin") {
      badge.hidden = false;
      badge.textContent = live ? "Live" : "Not shown to customer";
      badge.classList.toggle("live", live);
      badge.classList.toggle("dead", !live);
    } else if (!live) {
      node.style.display = "none";
    }

    var bodyText = withReadCta(post.body, story);
    node.querySelector(".body").textContent = bodyText;

    if (story && story.image) {
      var preview = node.querySelector(".preview");
      preview.hidden = false;
      var img = preview.querySelector("img");
      img.src = story.image;
      img.alt = story.headline;
      preview.querySelector(".pub").textContent = publicationNameFor(story) + " \\u00b7 " + storyDateOf(story);
      preview.querySelector(".headline").textContent = story.headline;
    }

    node.querySelector(".copy-post").addEventListener("click", function (e) {
      copyText(bodyText, e.currentTarget, "Post copied");
    });

    // First comment field always renders (even empty) so it's visible as a
    // slot to fill in — post copy is never invented on the customer's behalf.
    var commentBlock = node.querySelector(".comment-block");
    var commentBtn = node.querySelector(".copy-comment");
    var commentText = post.firstComment || "";
    commentBlock.hidden = false;
    commentBlock.querySelector(".comment").textContent = commentText;
    commentBtn.hidden = false;
    commentBtn.addEventListener("click", function (e) {
      copyText(commentText, e.currentTarget, "Comment copied");
    });

    var downloadBtn = node.querySelector(".download-img");
    if (story && story.image) {
      downloadBtn.hidden = false;
      downloadBtn.addEventListener("click", function (e) {
        downloadImage(story.image, story.slug + "-preview.png", e.currentTarget);
      });
    }

    var toggleBtn = node.querySelector(".toggle-live");
    if (MODE === "admin") {
      toggleBtn.hidden = false;
      toggleBtn.textContent = live ? "Hide from customer" : "Show to customer";
      toggleBtn.addEventListener("click", function () {
        setLive(post.id, !effectiveLive(post));
        render();
      });
    }

    return node;
  }

  // ---- URL params -------------------------------------------------------

  function params() { return new URLSearchParams(location.search); }
  function _customerParam() { return params().get("customer"); }
  function _personParam() { return params().get("person"); }
  function _storyParam() { return params().get("story"); }

  function setParam(key, value) {
    var p = params();
    if (value) p.set(key, value); else p.delete(key);
    try {
      history.replaceState(null, "", location.pathname + "?" + p.toString());
    } catch (e) {}
  }

  // ---- top-level render ---------------------------------------------------

  var grid = document.getElementById("grid");
  var emptyMsg = document.getElementById("empty");
  var storySelect = document.getElementById("storySelect");
  var personMeta = document.getElementById("personMeta");
  var tabsEl = document.getElementById("tabs");
  var customerSelect = document.getElementById("customerSelect");
  var customerFilterWrap = document.getElementById("customerFilterWrap");

  if (MODE === "admin" && STAGER_DATA.customers.length > 1) {
    customerFilterWrap.hidden = false;
    STAGER_DATA.customers.forEach(function (c) {
      var opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      customerSelect.appendChild(opt);
    });
    customerSelect.addEventListener("change", function () {
      setParam("customer", customerSelect.value);
      setParam("person", null);
      setParam("story", null);
      render();
    });
  }

  function currentCustomer() {
    var wanted = _customerParam();
    var byId = null;
    if (wanted) byId = STAGER_DATA.customers.filter(function (c) { return c.id === wanted; })[0];
    return byId || STAGER_DATA.customers[0];
  }

  function currentPersonId(customer) {
    var wanted = _personParam();
    if (wanted && customer.people.indexOf(wanted) !== -1) return wanted;
    return customer.people[0];
  }

  function populateStorySelect(customer, personId) {
    var posts = postsFor(customer, personId);
    var slugs = [];
    posts.forEach(function (p) {
      if (slugs.indexOf(p.storySlug) === -1) slugs.push(p.storySlug);
    });
    storySelect.innerHTML = "";
    var allOpt = document.createElement("option");
    allOpt.value = "";
    allOpt.textContent = "All stories";
    storySelect.appendChild(allOpt);
    slugs.forEach(function (slug) {
      var story = storyIndex[slug];
      var opt = document.createElement("option");
      opt.value = slug;
      opt.textContent = story ? story.headline : slug;
      storySelect.appendChild(opt);
    });
    var wanted = _storyParam();
    storySelect.value = slugs.indexOf(wanted) !== -1 ? wanted : "";
  }

  function renderTabs(customer, activePersonId) {
    var byId = peopleById();
    tabsEl.innerHTML = "";
    personsOf(customer).forEach(function (person) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tab" + (person.id === activePersonId ? " active" : "");
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", person.id === activePersonId ? "true" : "false");
      btn.textContent = person.name;
      btn.addEventListener("click", function () {
        setParam("person", person.id);
        setParam("story", null);
        render();
      });
      tabsEl.appendChild(btn);
    });
  }

  function renderPerson(customer, personId) {
    var byId = peopleById();
    var person = byId[personId];
    personMeta.textContent = person ? person.title || "" : "";

    var posts = postsFor(customer, personId);
    var storyFilter = storySelect.value;
    if (storyFilter) posts = posts.filter(function (p) { return p.storySlug === storyFilter; });
    if (MODE !== "admin") posts = posts.filter(function (p) { return effectiveLive(p); });

    grid.innerHTML = "";
    posts.forEach(function (post) {
      grid.appendChild(postCard(post, person));
    });
    emptyMsg.hidden = posts.length > 0;
  }

  function render() {
    var customer = currentCustomer();
    if (!customer) {
      grid.innerHTML = "";
      emptyMsg.hidden = false;
      emptyMsg.textContent = "No customer data available.";
      return;
    }
    if (MODE === "admin" && STAGER_DATA.customers.length > 1) customerSelect.value = customer.id;
    var personId = currentPersonId(customer);
    renderTabs(customer, personId);
    populateStorySelect(customer, personId);
    renderPerson(customer, personId);
  }

  storySelect.addEventListener("change", function () {
    setParam("story", storySelect.value || null);
    renderPerson(currentCustomer(), currentPersonId(currentCustomer()));
  });

  render();
})();
</script>
</body>
</html>
`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const CSS = `
:root {
  --li-blue: #0a66c2;
  --ink: #1b1f23;
  --muted: #56687a;
  --line: #e3e8ee;
  --bg: #f3f2ef;
  --card: #ffffff;
  --ok: #057642;
  --post-w: 340px;
  color-scheme: light;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

.topbar {
  background: var(--card);
  border-bottom: 1px solid var(--line);
  position: sticky;
  top: 0;
  z-index: 5;
}

.topbar-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 14px 20px;
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
}

.brand {
  font-weight: 700;
  font-size: 16px;
  color: var(--li-blue);
  white-space: nowrap;
}

.tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.tab {
  border: 1px solid var(--line);
  background: var(--card);
  color: var(--ink);
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.tab.active {
  background: var(--li-blue);
  border-color: var(--li-blue);
  color: #fff;
}

.wrap {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.story-filter {
  font-size: 13px;
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 8px;
}

.story-filter select {
  font: inherit;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--card);
  max-width: 46ch;
}

.person-meta {
  color: var(--muted);
  font-size: 13px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(var(--post-w), 1fr));
  gap: 16px;
  align-items: start;
}

.empty {
  color: var(--muted);
  padding: 40px 0;
  text-align: center;
}

.card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 16px;
  max-width: 526px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--li-blue);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  overflow: hidden;
  flex-shrink: 0;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.who { flex: 1; min-width: 0; }

.name {
  font-weight: 600;
  font-size: 14px;
}

.title {
  color: var(--muted);
  font-size: 12px;
}

.live-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 999px;
  white-space: nowrap;
}

.live-badge.live { background: #e9f7ef; color: var(--ok); }
.live-badge.dead { background: #fdeceb; color: #b3261e; }

.body {
  white-space: pre-wrap;
  font-size: 14px;
  line-height: 1.5;
  min-height: 1.5em;
}

.body:empty::before {
  content: "Add post copy\\2026";
  color: var(--muted);
  font-style: italic;
}

.preview {
  border: 1px solid var(--line);
  border-radius: 8px;
  overflow: hidden;
}

.preview img {
  width: 100%;
  display: block;
  aspect-ratio: 1.91 / 1;
  object-fit: cover;
  background: #eee;
}

.preview-meta {
  padding: 10px 12px;
  background: #f8fafc;
}

.pub {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: .04em;
  color: var(--muted);
}

.headline {
  font-size: 13px;
  font-weight: 600;
  margin-top: 2px;
}

.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn {
  font: inherit;
  font-weight: 600;
  font-size: 12.5px;
  padding: 7px 12px;
  border-radius: 999px;
  border: 1px solid var(--li-blue);
  background: #fff;
  color: var(--li-blue);
  cursor: pointer;
}

.btn:hover { background: #eaf2fc; }

.btn.flashed {
  background: var(--ok);
  border-color: var(--ok);
  color: #fff;
}

.btn.toggle-live {
  border-color: var(--line);
  color: var(--muted);
  margin-left: auto;
}

.comment-block {
  border-top: 1px dashed var(--line);
  padding-top: 10px;
}

.comment-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: .04em;
  color: var(--muted);
  margin-bottom: 4px;
}

.comment {
  white-space: pre-wrap;
  font-size: 13.5px;
  min-height: 1.3em;
}

.comment:empty::before {
  content: "Add first-comment copy\\2026";
  color: var(--muted);
  font-style: italic;
}
`;
