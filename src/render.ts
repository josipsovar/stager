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
    <div class="brand">Stager</div>
    <div id="custName" class="cust-name" contenteditable="true" spellcheck="false" title="Click to edit the client name" hidden></div>
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
  <article class="card-wrap">
    <div class="variant"></div>
    <div class="live-badge" hidden></div>
    <div class="li-card">
      <div class="li-head">
        <div class="avatar-wrap">
          <div class="avatar"></div>
          <button type="button" class="avatar-edit" title="Change photo" aria-label="Change photo">
            <svg viewBox="0 0 20 20"><path d="M6.5 4h7l1 2H16a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h1.5l1-2zM10 8a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z"></path></svg>
          </button>
          <input type="file" accept="image/*" class="avatar-file" hidden>
        </div>
        <div class="who">
          <div class="name"></div>
          <div class="headline"></div>
          <div class="meta">
            <span class="meta-preview">Preview</span>
            <span class="meta-dot">·</span>
            <span class="vis-icon" aria-hidden="true"></span>
            <span class="vis-label"></span>
          </div>
        </div>
        <button type="button" class="more-btn" tabindex="-1" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="16" height="16"><circle cx="2" cy="8" r="1.5"></circle><circle cx="8" cy="8" r="1.5"></circle><circle cx="14" cy="8" r="1.5"></circle></svg>
        </button>
      </div>
      <div class="li-body">
        <div class="body"></div>
        <button type="button" class="see-more" hidden>…see more</button>
      </div>
      <div class="preview" hidden>
        <img alt="">
        <div class="preview-meta">
          <div class="headline"></div>
          <div class="pub"></div>
        </div>
      </div>
      <div class="li-reactions" aria-hidden="true">
        <span class="react"><svg viewBox="0 0 24 24"><path d="M2 21h3V10H2v11zm19-10c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L12.17 2 6.59 7.59C6.22 7.95 6 8.45 6 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-1.91l-.01-.01L21 11z"></path></svg>Like</span>
        <span class="react"><svg viewBox="0 0 24 24"><path d="M6 6h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H9l-4 4v-4H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"></path></svg>Comment</span>
        <span class="react"><svg viewBox="0 0 24 24"><path d="M17 2l4 4-4 4V7H7a3 3 0 0 0-3 3v2H2v-2a5 5 0 0 1 5-5h10V2zM7 22l-4-4 4-4v3h10a3 3 0 0 0 3-3v-2h2v2a5 5 0 0 1-5 5H7v3z"></path></svg>Repost</span>
        <span class="react"><svg viewBox="0 0 24 24"><path d="M2 21l21-9L2 3v7l15 2-15 2z"></path></svg>Send</span>
      </div>
    </div>
    <div class="comment-block" hidden>
      <div class="avatar-wrap">
        <div class="avatar avatar-sm"></div>
      </div>
      <div class="comment-bubble">
        <div class="comment-label">First comment (post this right after)</div>
        <div class="comment"></div>
      </div>
    </div>
    <div class="actions">
      <button type="button" class="btn copy-post">Copy post</button>
      <button type="button" class="btn copy-comment" hidden>Copy first comment</button>
      <button type="button" class="btn download-img" hidden>Download image</button>
      <button type="button" class="btn toggle-live" hidden></button>
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

  // ---- in-browser edits (client name / avatar / post text; persisted per-browser) ---------
  //
  // Click-to-edit changes here are NOT written back to the data file — they live in this
  // browser's localStorage only, layered on top of the baked-in data at render time. Useful for
  // fine-tuning copy or swapping a headshot without a rebuild; not a substitute for updating the
  // source JSON if the change should ship to everyone who opens this file.

  function editsKey() { return "stager-edits-overlay"; }

  function readEdits() {
    try {
      return JSON.parse(localStorage.getItem(editsKey()) || "{}");
    } catch (e) {
      return {};
    }
  }

  function writeEdits(edits) {
    try {
      localStorage.setItem(editsKey(), JSON.stringify(edits));
    } catch (e) {}
  }

  function setCustomerNameOverride(customerId, name) {
    var edits = readEdits();
    edits.customerNames = edits.customerNames || {};
    edits.customerNames[customerId] = name;
    writeEdits(edits);
  }

  function effectiveCustomerName(customer) {
    var edits = readEdits();
    return (edits.customerNames && edits.customerNames[customer.id]) || customer.name;
  }

  function setAvatarOverride(personId, dataUrl) {
    var edits = readEdits();
    edits.avatars = edits.avatars || {};
    edits.avatars[personId] = dataUrl;
    writeEdits(edits);
  }

  function effectiveAvatarSrc(person) {
    var edits = readEdits();
    return (edits.avatars && edits.avatars[person.id]) || person.avatar;
  }

  function setPostFieldOverride(postId, field, value) {
    var edits = readEdits();
    edits.posts = edits.posts || {};
    edits.posts[postId] = edits.posts[postId] || {};
    edits.posts[postId][field] = value;
    writeEdits(edits);
  }

  function effectivePostBodyBase(post) {
    var edits = readEdits();
    var o = edits.posts && edits.posts[post.id];
    return o && typeof o.body === "string" ? o.body : post.body;
  }

  function effectivePostComment(post) {
    var edits = readEdits();
    var o = edits.posts && edits.posts[post.id];
    return o && typeof o.firstComment === "string" ? o.firstComment : post.firstComment || "";
  }

  function effectivePostAngle(post) {
    var edits = readEdits();
    var o = edits.posts && edits.posts[post.id];
    return o && typeof o.angle === "string" ? o.angle : post.angle || "";
  }

  // ---- formatting -----------------------------------------------------

  function formatDate(iso) {
    if (!iso) return "";
    var d = new Date(iso + "T00:00:00");
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  function storyDateOf(story) { return formatDate(story && story.publishedAt); }

  // Mimics LinkedIn's feed truncation: cut at a word boundary near ~250 chars
  // (character-based, not line-based, so it never lands on a blank line and
  // produces a stray ellipsis). Returns null when the text doesn't need it.
  var BODY_TRUNCATE_AT = 250;
  function truncateBody(text) {
    if (text.length <= BODY_TRUNCATE_AT) return null;
    var cut = text.slice(0, BODY_TRUNCATE_AT);
    var lastSpace = cut.lastIndexOf(" ");
    if (lastSpace > 100) cut = cut.slice(0, lastSpace);
    return cut.replace(/\\s+$/, "") + "\\u2026";
  }

  function initials(name) {
    return (name || "")
      .split(/\\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(function (p) { return p[0].toUpperCase(); })
      .join("");
  }

  function fillAvatar(el, person, srcOverride) {
    el.innerHTML = "";
    var src = srcOverride || person.avatar;
    if (src) {
      var img = document.createElement("img");
      img.src = src;
      img.alt = person.name;
      el.appendChild(img);
    } else {
      el.textContent = initials(person.name);
    }
  }

  // Updates every visible avatar for this person (they can appear on more than one card at
  // once) right after a photo is picked, without waiting for the next full render().
  function applyAvatarToDom(personId, dataUrl, personName) {
    var wraps = document.querySelectorAll(".avatar-wrap");
    for (var i = 0; i < wraps.length; i++) {
      if (wraps[i].dataset.personId !== personId) continue;
      var el = wraps[i].querySelector(".avatar");
      el.innerHTML = "";
      var img = document.createElement("img");
      img.src = dataUrl;
      img.alt = personName || "";
      el.appendChild(img);
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

  // ---- click-to-edit post text (body keeps its "…see more" truncation; expands on focus) ----

  function setupEditableBody(bodyEl, seeMoreBtn, fullText, onSave) {
    bodyEl.contentEditable = "true";
    bodyEl.spellcheck = false;
    bodyEl.dataset.full = fullText;

    function showTruncated() {
      var full = bodyEl.dataset.full;
      var truncated = truncateBody(full);
      bodyEl.textContent = truncated || full;
      seeMoreBtn.hidden = !truncated;
    }
    function showFull() {
      bodyEl.textContent = bodyEl.dataset.full;
      seeMoreBtn.hidden = true;
    }
    function placeCaretAtEnd() {
      var range = document.createRange();
      range.selectNodeContents(bodyEl);
      range.collapse(false);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }

    seeMoreBtn.addEventListener("click", function (e) {
      e.preventDefault();
      showFull();
      bodyEl.focus();
      placeCaretAtEnd();
    });
    bodyEl.addEventListener("focus", showFull);
    bodyEl.addEventListener("blur", function () {
      var text = bodyEl.innerText.replace(/\\u00a0/g, " ").replace(/\\n{3,}/g, "\\n\\n");
      bodyEl.dataset.full = text;
      onSave(text);
      showTruncated();
    });

    showTruncated();
  }

  function setupEditableComment(commentEl, initialText, onSave) {
    commentEl.contentEditable = "true";
    commentEl.spellcheck = false;
    commentEl.textContent = initialText;
    commentEl.addEventListener("blur", function () {
      onSave(commentEl.innerText.replace(/\\u00a0/g, " "));
    });
  }

  // Single-line editable field (the version-title pill) — same idea as the comment, just trimmed.
  // Reads textContent, not innerText: the pill is uppercased via CSS, and Chromium's innerText
  // reflects that rendered transform rather than what was actually typed.
  function setupEditableLabel(el, initialText, onSave) {
    el.contentEditable = "true";
    el.spellcheck = false;
    el.textContent = initialText;
    el.addEventListener("blur", function () {
      onSave((el.textContent || "").replace(/\\u00a0/g, " ").trim());
    });
  }

  // ---- card rendering ---------------------------------------------------

  var tpl = document.getElementById("postCardTpl");
  var storyIndex = storiesBySlug();

  var VISIBILITY_META = {
    PUBLIC: { label: "Anyone", icon: '<svg viewBox="0 0 16 16"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zM2.05 8.5h2.02c.07 1.2.28 2.32.6 3.24A5.53 5.53 0 012.05 8.5zm0-1a5.53 5.53 0 012.62-3.24c-.32.92-.53 2.04-.6 3.24H2.05zM8 2.02c.5.66 1.1 2.02 1.24 3.48H6.76C6.9 4.04 7.5 2.68 8 2.02zM6.6 6.5h2.8c.07.47.1.98.1 1.5s-.03 1.03-.1 1.5H6.6c-.07-.47-.1-.98-.1-1.5s.03-1.03.1-1.5zm.16 4h2.48c-.2.86-.6 1.7-1.24 2.48-.64-.78-1.04-1.62-1.24-2.48zm3.5 0h2.02a5.53 5.53 0 01-2.62 3.24c.32-.92.53-2.04.6-3.24zm0-1c-.07-1.2-.28-2.32-.6-3.24a5.53 5.53 0 012.62 3.24h-2.02z"></path></svg>' },
    CONNECTIONS: { label: "Connections only", icon: '<svg viewBox="0 0 16 16"><path d="M5.5 7a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5zm5 0a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5zM5.5 8c-1.93 0-4 1-4 3v2h5v-2c0-.79.27-1.5.73-2.06C6.65 8.32 6.1 8 5.5 8zm5 0c-.6 0-1.15.32-1.73.94.46.56.73 1.27.73 2.06v2h5v-2c0-2-2.07-3-4-3z"></path></svg>' },
    LOGGED_IN: { label: "LinkedIn members only", icon: '<svg viewBox="0 0 16 16"><path d="M13.5 2h-11A1.5 1.5 0 001 3.5v9A1.5 1.5 0 002.5 14h11a1.5 1.5 0 001.5-1.5v-9A1.5 1.5 0 0013.5 2zM5 11.5H3V6.8h2v4.7zM4 6a1.15 1.15 0 110-2.3A1.15 1.15 0 014 6zm9 5.5h-2V9.1c0-.6-.2-1-.75-1-.4 0-.65.27-.75.54-.04.1-.05.24-.05.38v2.48h-2s.03-4 0-4.7h2v.67c.27-.42.75-1 1.8-1 1.3 0 2.25.85 2.25 2.68v3.35z"></path></svg>' }
  };

  function postCard(post, person) {
    var node = tpl.content.firstElementChild.cloneNode(true);
    var story = storyIndex[post.storySlug];

    var variantEl = node.querySelector(".variant");
    setupEditableLabel(variantEl, effectivePostAngle(post), function (text) {
      setPostFieldOverride(post.id, "angle", text);
    });

    var avatarWrap = node.querySelector(".avatar-wrap");
    avatarWrap.dataset.personId = person.id;
    fillAvatar(avatarWrap.querySelector(".avatar"), person, effectiveAvatarSrc(person));
    var avatarFile = avatarWrap.querySelector(".avatar-file");
    avatarWrap.querySelector(".avatar-edit").addEventListener("click", function () {
      avatarFile.click();
    });
    avatarFile.addEventListener("change", function () {
      var file = avatarFile.files && avatarFile.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        setAvatarOverride(person.id, reader.result);
        applyAvatarToDom(person.id, reader.result, person.name);
      };
      reader.readAsDataURL(file);
    });
    node.querySelector(".name").textContent = person.name;
    node.querySelector(".headline").textContent = person.title || "";

    var vis = VISIBILITY_META[post.visibility] || VISIBILITY_META.PUBLIC;
    node.querySelector(".vis-icon").innerHTML = vis.icon;
    node.querySelector(".vis-label").textContent = vis.label;

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

    var bodyEl = node.querySelector(".body");
    var seeMoreBtn = node.querySelector(".see-more");
    var initialBodyText = withReadCta(effectivePostBodyBase(post), story);
    setupEditableBody(bodyEl, seeMoreBtn, initialBodyText, function (text) {
      setPostFieldOverride(post.id, "body", text);
    });

    if (story && story.image) {
      var preview = node.querySelector(".preview");
      preview.hidden = false;
      var img = preview.querySelector("img");
      img.src = story.image;
      img.alt = story.headline;
      preview.querySelector(".headline").textContent = story.headline;
      preview.querySelector(".pub").textContent = publicationNameFor(story) + " \\u00b7 " + storyDateOf(story);
    }

    node.querySelector(".copy-post").addEventListener("click", function (e) {
      copyText(bodyEl.dataset.full, e.currentTarget, "Post copied");
    });

    // First comment field always renders (even empty) so it's visible as a
    // slot to fill in — post copy is never invented on the customer's behalf.
    var commentBlock = node.querySelector(".comment-block");
    var commentBtn = node.querySelector(".copy-comment");
    var commentEl = commentBlock.querySelector(".comment");
    commentBlock.hidden = false;
    var commentAvatarWrap = commentBlock.querySelector(".avatar-wrap");
    commentAvatarWrap.dataset.personId = person.id;
    fillAvatar(commentAvatarWrap.querySelector(".avatar"), person, effectiveAvatarSrc(person));
    setupEditableComment(commentEl, effectivePostComment(post), function (text) {
      setPostFieldOverride(post.id, "firstComment", text);
    });
    commentBtn.hidden = false;
    commentBtn.addEventListener("click", function (e) {
      copyText(commentEl.innerText, e.currentTarget, "Comment copied");
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
  var custNameEl = document.getElementById("custName");

  custNameEl.addEventListener("blur", function () {
    var id = custNameEl.dataset.customerId;
    var name = custNameEl.textContent.trim();
    if (id && name) setCustomerNameOverride(id, name);
  });

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
    custNameEl.hidden = false;
    custNameEl.dataset.customerId = customer.id;
    if (document.activeElement !== custNameEl) custNameEl.textContent = effectiveCustomerName(customer);
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

[hidden] { display: none !important; }

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
  font-size: 13px;
  letter-spacing: .02em;
  color: var(--li-blue);
  white-space: nowrap;
}

.cust-name {
  font-weight: 700;
  font-size: 17px;
  color: var(--ink);
  white-space: nowrap;
  border-radius: 5px;
  padding: 2px 6px;
  margin: -2px -6px;
  cursor: text;
}

.cust-name:hover { background: #eaf2fc; }

.cust-name:focus {
  background: #fff;
  outline: none;
  box-shadow: 0 0 0 2px rgba(10, 102, 194, .3);
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

.card-wrap {
  max-width: 542px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.variant {
  align-self: flex-start;
  font: 700 10.5px/1 ui-monospace, Menlo, Consolas, monospace;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: #5b34d6;
  background: #efe9ff;
  padding: 5px 10px;
  border-radius: 6px;
  min-width: 2ch;
  cursor: text;
}

.variant:hover { background: #e3d6fc; }

.variant:focus {
  background: #fff;
  outline: none;
  box-shadow: 0 0 0 2px rgba(91, 52, 214, .35);
}

.variant:empty::before {
  content: "Add a version title\\2026";
  color: #8a7bc2;
}

/* ---- the LinkedIn-look-alike post card itself ---- */

.li-card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 12px 16px 4px;
  box-shadow: 0 0 0 1px rgba(0,0,0,.02);
}

.li-head {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--li-blue);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 15px;
  overflow: hidden;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-edit {
  position: absolute;
  right: -2px;
  bottom: -2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--li-blue);
  color: #fff;
  border: 2px solid var(--card);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  cursor: pointer;
  opacity: 0;
  transition: opacity .12s;
}

.avatar-wrap:hover .avatar-edit,
.avatar-wrap:focus-within .avatar-edit {
  opacity: 1;
}

.avatar-edit svg {
  width: 11px;
  height: 11px;
  fill: currentColor;
  display: block;
}

.who { flex: 1; min-width: 0; padding-top: 1px; }

.name {
  font-weight: 600;
  font-size: 14px;
  color: var(--ink);
}

.headline {
  color: var(--muted);
  font-size: 12px;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}

.meta {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--muted);
  font-size: 12px;
  margin-top: 1px;
}

.meta-dot { font-size: 10px; }

.vis-icon svg {
  width: 12px;
  height: 12px;
  fill: var(--muted);
  display: block;
}

.more-btn {
  border: none;
  background: none;
  color: var(--muted);
  padding: 4px;
  margin: -4px -4px 0 0;
  border-radius: 50%;
  cursor: default;
  flex-shrink: 0;
}

.more-btn svg { fill: currentColor; display: block; }

.li-body { margin-top: 8px; }

.body {
  white-space: pre-wrap;
  font-size: 14px;
  line-height: 1.4;
  min-height: 1.4em;
  color: var(--ink);
  border-radius: 4px;
  cursor: text;
}

.body:hover { background: #fafafa; }

.body:focus {
  background: #fbfdff;
  outline: none;
  box-shadow: 0 0 0 2px rgba(10, 102, 194, .25);
}

.body:empty::before {
  content: "Add post copy\\2026";
  color: var(--muted);
  font-style: italic;
}

.see-more {
  border: none;
  background: none;
  color: var(--muted);
  font: inherit;
  font-weight: 600;
  padding: 2px 0 0;
  cursor: pointer;
}

.see-more:hover { text-decoration: underline; }

.preview {
  border: 1px solid var(--line);
  border-radius: 8px;
  overflow: hidden;
  margin-top: 10px;
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
  border-top: 1px solid var(--line);
}

.preview-meta .headline {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
  -webkit-line-clamp: 2;
  margin-bottom: 2px;
}

.pub {
  font-size: 12px;
  color: var(--muted);
}

.li-reactions {
  display: flex;
  gap: 4px;
  margin-top: 10px;
  padding: 4px 0 6px;
  border-top: 1px solid var(--line);
}

.li-reactions .react {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: var(--muted);
  font-size: 13px;
  font-weight: 600;
  padding: 8px 4px;
  border-radius: 4px;
  user-select: none;
}

.li-reactions .react svg {
  width: 18px;
  height: 18px;
  fill: var(--muted);
}

/* ---- live badge (admin) ---- */

.live-badge {
  align-self: flex-start;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 999px;
  white-space: nowrap;
}

.live-badge.live { background: #e9f7ef; color: var(--ok); }
.live-badge.dead { background: #fdeceb; color: #b3261e; }

/* ---- first-comment slot: styled like a reply, avatar + bubble ---- */

.comment-block {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  background: #f7f9fb;
  border: 1px solid var(--line);
  border-radius: 8px;
}

.avatar-sm {
  width: 28px;
  height: 28px;
  font-size: 11px;
}

.comment-bubble {
  flex: 1;
  min-width: 0;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 8px 12px;
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
  border-radius: 4px;
  cursor: text;
}

.comment:hover { background: #f3f4f5; }

.comment:focus {
  background: #fff;
  outline: none;
  box-shadow: 0 0 0 2px rgba(10, 102, 194, .25);
}

.comment:empty::before {
  content: "Add first-comment copy\\2026";
  color: var(--muted);
  font-style: italic;
}

/* ---- staging tools (ours, deliberately distinct from the LinkedIn look-alike) ---- */

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  background: #f6f7f8;
  border: 1px dashed var(--line);
  border-radius: 8px;
  padding: 8px 10px;
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
`;
