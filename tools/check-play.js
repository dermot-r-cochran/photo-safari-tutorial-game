#!/usr/bin/env node
"use strict";
/* check-play — boot the page and play every drive without a browser.
 *
 * tools/check.js loads the script into a bare VM context with no
 * `document`, so the page never boots and everything below the SAFARI
 * export (the kit card, the in-hand row, the questions, the verdict box
 * and its photograph, retry and abandon, the contact sheet, the saves,
 * the next day and the past days, the endcard) had no test. This check
 * gives the same script a stub document: every element id the HTML
 * carries, elements that keep what is written to them, a localStorage in
 * memory, a `confirm` the check answers, and a `window.scrollTo` that
 * does nothing. Then it does what a player does: opens the page, sets
 * out on each drive with a pair of cameras, looks at something, picks up
 * the companion, answers the questions, presses the shutter, reads the
 * verdict and the frame it was learned on, tries a stop again, abandons
 * one, drives on to the endcard, reopens the page on its save, and
 * starts the next day. Which paths are keepers is read from the model
 * through the SAFARI export, so a stop that changes is still played
 * right; only the element ids are read out of the markup, and the page
 * gets no test hook. Node only — nothing to install.
 *
 *     node tools/check-play.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) { console.error("no <script> block in index.html"); process.exit(1); }

let fails = 0, checks = 0;
const fail = (msg) => { fails++; console.error("  FAIL: " + msg); };
const ok = () => { checks++; };

// ---- the stub document ----

class Text {
  constructor(s) { this.nodeType = 3; this.textContent = String(s); this.parent = null; }
  remove() { if (this.parent) { const i = this.parent.children.indexOf(this); if (i >= 0) this.parent.children.splice(i, 1); this.parent = null; } }
}

class El {
  constructor(tag, id) {
    this.nodeType = 1; this.tagName = tag.toUpperCase(); this.id = id || ""; this.children = []; this.parent = null;
    this.hidden = false; this.className = ""; this.title = ""; this.style = {}; this.disabled = false; this.listeners = {};
    const self = this;
    this.classList = {
      contains: (n) => self.className.split(/\s+/).includes(n),
      add: (n) => { if (!self.classList.contains(n)) self.className = (self.className + " " + n).trim(); },
      remove: (n) => { self.className = self.className.split(/\s+/).filter((x) => x && x !== n).join(" "); },
      toggle: (n, force) => { const on = force === undefined ? !self.classList.contains(n) : !!force; if (on) self.classList.add(n); else self.classList.remove(n); return on; }
    };
    // a select's value is its selected option's, else its first option's, as in a browser
    if (this.tagName === "SELECT") Object.defineProperty(this, "value", {
      get() { const opts = self.children.filter((c) => c.tagName === "OPTION"); const s = opts.find((o) => o.selected) || opts[0]; return s ? s.value : ""; },
      set(v) { for (const o of self.children) if (o.tagName === "OPTION") o.selected = (o.value === v); }
    });
  }
  get textContent() { return this.children.map((c) => c.textContent).join(""); }
  set textContent(v) { this.clear(); this.children.push(Object.assign(new Text(v), { parent: this })); }
  get innerHTML() { return this.children.map((c) => c.nodeType === 3 ? c.textContent : "<" + c.tagName.toLowerCase() + ">" + c.innerHTML + "</" + c.tagName.toLowerCase() + ">").join(""); }
  set innerHTML(v) { this.clear(); if (String(v) !== "") this.children.push(Object.assign(new Text(v), { parent: this })); }
  get lastElementChild() { const els = this.children.filter((c) => c.nodeType === 1); return els.length ? els[els.length - 1] : null; }
  clear() { for (const c of this.children) c.parent = null; this.children = []; }
  appendChild(c) {
    if (c.fragment) { for (const k of c.children.slice()) this.appendChild(k); c.children = []; return c; }
    if (c.parent) c.remove();
    c.parent = this; this.children.push(c); return c;
  }
  append(...cs) { for (const c of cs) this.appendChild(c); }
  remove() { if (this.parent) { const i = this.parent.children.indexOf(this); if (i >= 0) this.parent.children.splice(i, 1); this.parent = null; } }
  scrollIntoView() {}
  focus() {}
  addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); }
  dispatch(type, ev) { for (const fn of (this.listeners[type] || []).slice()) fn(ev || { type }); }
  // every element in the tree below this one, this one included
  all() { return [this].concat(...this.children.filter((c) => c.nodeType === 1).map((c) => c.all())); }
  find(pred) { return this.all().find(pred) || null; }
  findAll(pred) { return this.all().filter(pred); }
}

// a fresh page: every element the HTML gives an id, the script run against it on the given store
function openPage(store, answers) {
  const byId = {};
  for (const tag of html.matchAll(/<(\w+)\b([^>]*)>/g)) {
    const attrs = tag[2], id = (attrs.match(/\bid="([^"]+)"/) || [])[1];
    if (!id) continue;
    const el = new El(tag[1], id);
    el.hidden = /\bhidden\b/.test(attrs);
    byId[id] = el;
  }
  const sandbox = {
    console,
    document: {
      // the ids the markup carries, and any the page gives an element it made (the kit card's selects)
      getElementById: (id) => byId[id] || Object.values(byId).map((el) => el.find((e) => e.id === id)).find(Boolean) || null,
      createElement: (tag) => new El(tag),
      createTextNode: (s) => new Text(s),
      createDocumentFragment: () => Object.assign(new El("#fragment"), { fragment: true })
    },
    localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } },
    confirm: () => { answers.asked++; return answers.yes; },
    window: { scrollTo() {} }
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(m[1], sandbox, { filename: "index.html" });
  return { $: sandbox.document.getElementById, S: sandbox.SAFARI };
}

// ---- the player's hands ----

const click = (el) => el.dispatch("click", { type: "click" });
const button = (el, text) => el.find((e) => e.tagName === "BUTTON" && e.textContent === text);
const buttons = (el) => el.findAll((e) => e.tagName === "BUTTON").map((b) => b.textContent);
const withClass = (el, cls) => el.findAll((e) => e.nodeType === 1 && e.classList.contains(cls));
const last = (arr) => arr[arr.length - 1];
// every path through a stop's questions, as tools/check.js walks them
function combos(S, enc) {
  const out = [];
  (function walk(choices) {
    const asked = S.decisionsFor(enc, choices);
    if (asked.length === choices.length) { out.push(choices); return; }
    const d = asked[choices.length];
    for (let i = 0; i < d.options.length; i++) walk(choices.concat(i));
  })([]);
  return out;
}
const expectedCard = (S, stops, keepers, firsts, abandoned) => {
  const plural = (n, w) => n + " " + w + (n === 1 ? "" : "s");
  return S.fill(S.SCORE.card, { stops: plural(stops, "stop"), keepers: plural(keepers, "keeper"),
    firsts: firsts ? S.fill(S.SCORE.firsts, { n: firsts }) : "", abandoned: abandoned ? S.fill(S.SCORE.abandonedCount, { n: abandoned }) : "" });
};
const localDate = () => { const d = new Date(), z = (n) => (n < 10 ? "0" : "") + n; return d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate()); };

const store = {};
const answers = { yes: true, asked: 0 };
let page;
try {
  page = openPage(store, answers);
} catch (e) {
  fail("the page did not boot: " + (e.stack || e).toString().split("\n").slice(0, 3).join(" | "));
  console.log(checks + " checks, " + fails + " failures");
  process.exit(1);
}
let { $, S } = page;
if (!S) { fail("the script did not export SAFARI"); console.log(checks + " checks, " + fails + " failures"); process.exit(1); }

// ---- the page as it opens ----
{
  const r = S.ROUTES[0];
  if ($("stop-line").textContent !== r.title + " · " + r.sub) fail("the header does not name the first route: " + $("stop-line").textContent);
  for (const x of S.ROUTES) if (!$("routes").find((e) => e.tagName === "BUTTON" && e.textContent.startsWith(x.title))) fail("the drives card has no button for " + x.title);
  const lit = withClass($("routes"), "current");
  if (lit.length !== 1 || !lit[0].textContent.startsWith(r.title)) fail("the drives card does not light the first route: " + lit.map((e) => e.textContent).join(" | "));
  if ($("transcript").children.length) fail("the transcript is not empty before setting out");
  if (!$("actions").textContent.includes(S.KIT_WORDS.prompt)) fail("the page does not open on the kit card: " + $("actions").textContent.slice(0, 120));
  if ($("sheet").textContent !== "nothing yet") fail("an empty contact sheet does not say nothing yet: " + $("sheet").textContent);
  if ($("stops-heading").textContent !== "The " + r.noun) fail("the stops heading is not the route's noun: " + $("stops-heading").textContent);
  if ($("restart").textContent !== S.fill(S.NEXT_DAY.label, { noun: r.noun })) fail("the next-day button does not carry the route's noun: " + $("restart").textContent);
  const cam = $("camera").textContent;
  if (!cam.includes("In hand: the main camera") || !cam.includes(S.CAMERA.caveatShort) || !cam.includes("Why these numbers?")) fail("the camera card lacks the hand, the caveat line or its fold: " + cam.slice(0, 200));
  for (const key of Object.keys(S.RULEBOOKS)) if (!button($("rulebooks"), key + " — " + S.RULEBOOKS[key].name)) fail("the rulebooks card has no button for " + key);
  if (!$("endcard").hidden) fail("the endcard is showing before any drive");
  ok();
}

// ---- every route, from its kit card to its endcard, then its save and its next day ----
S.ROUTES.forEach((r, ri) => {
  const where = r.title;
  try {
    if (ri > 0) {
      click($("routes").find((e) => e.tagName === "BUTTON" && e.textContent.startsWith(r.title)));
      if ($("stop-line").textContent !== r.title + " · " + r.sub) fail(where + ": picking the route did not change the header: " + $("stop-line").textContent);
      if (!$("actions").textContent.includes(S.KIT_WORDS.prompt)) fail(where + ": a fresh route does not open on the kit card");
    }
    const stops = S.routeStops(r);
    const dflt = S.routeKit(r);
    const main = $("kit-main"), comp = $("kit-companion");
    if (!main || !comp) throw new Error("the kit card has no two selects");
    if (main.value !== dflt.main || comp.value !== dflt.companion) fail(where + ": the kit card does not propose the route's pair: " + main.value + " / " + comp.value);
    const bodyOf = (id) => S.KITS[id].body;
    const compIds = () => comp.children.map((o) => o.value);
    if (compIds().some((id) => bodyOf(id) === bodyOf(main.value))) fail(where + ": the companion's list offers a kit on the main camera's body");
    // changing the main camera refills the companion's list with the other body's kits
    const otherMain = Object.keys(S.KITS).find((id) => bodyOf(id) !== bodyOf(dflt.main));
    main.value = otherMain; main.dispatch("change");
    if (compIds().some((id) => bodyOf(id) === bodyOf(otherMain)) || !compIds().length) fail(where + ": after changing the main camera the companion's list is wrong: " + compIds().join(", "));
    // the short city walk sets out on the pair swapped, so tomorrow's proposal has something to remember
    const pair = r.id === "city" && S.KITS[dflt.companion] ? { main: dflt.companion, companion: dflt.main } : dflt;
    main.value = pair.main; main.dispatch("change"); comp.value = pair.companion;
    click(button($("actions"), S.KIT_WORDS.go));
    const kitLine = S.fill(S.KIT_WORDS.chosen, { main: S.kitLabel(pair.main), companion: S.kitLabel(pair.companion) });
    if (!withClass($("transcript"), "chosen").some((e) => e.textContent === kitLine)) fail(where + ": setting out did not write the pair to the transcript");
    const first = S.ENCOUNTERS[stops[0]];
    if (!withClass($("transcript"), "stop-title").some((e) => e.textContent === first.stop + " · " + first.title)) fail(where + ": setting out did not open the first stop");
    if (!$("actions").textContent.includes(S.KIT_WORDS.inHand)) fail(where + ": the first stop has no in-hand row");
    if (!$("stops").textContent.includes("(held)")) fail(where + ": the stops card does not hold the stops ahead");

    let keepers = 0, firsts = 0, abandoned = 0, tagsTotal = 0, barredTried = false;
    const walk = (enc, choices) => {
      for (let d = 0; d < choices.length; d++) {
        const prompt = withClass($("actions"), "prompt")[0];
        const asked = S.decisionsFor(enc, choices.slice(0, d))[d];
        if (!prompt || prompt.textContent !== asked.prompt) throw new Error("question " + (d + 1) + " is not on the page: " + (prompt ? prompt.textContent : "no prompt"));
        const opts = prompt.parent.children.slice(prompt.parent.children.indexOf(prompt) + 1).filter((e) => e.tagName === "BUTTON");
        if (opts.length !== asked.options.length) throw new Error("question " + (d + 1) + " offers " + opts.length + " buttons for " + asked.options.length + " options");
        click(opts[choices[d]]);
        if (last(withClass($("transcript"), "chosen")).textContent !== asked.options[choices[d]].label) throw new Error("the chosen answer is not the last line of the transcript");
      }
      const shutter = button($("actions"), "Press the shutter.");
      if (!shutter) throw new Error("after the questions there is no shutter: " + buttons($("actions")).join(" | "));
      click(shutter);
      return last(withClass($("transcript"), "frame"));
    };
    // the frame the stop was learned on, as the card shows it after the verdict
    const photoCard = (box, enc, got, nth) => {
      const figs = box.findAll((e) => e.tagName === "FIGURE");
      if (!enc.photo) { if (figs.length) fail(where + ", " + enc.title + ": a card with no photograph shows one"); return; }
      const all = [enc.photo].concat(enc.photo.alternates || []);
      const photo = all[nth % all.length];
      if (enc.miss) {
        if (figs.length !== 2) { fail(where + ", " + enc.title + ": a stop with a miss shows " + figs.length + " frames, not two"); return; }
        const fixed = enc.pairLeads;
        const firstIs = fixed || got ? photo : enc.miss;
        const leads = [fixed ? fixed[0] : got ? "The frame you got" : "The frame you took", fixed ? fixed[1] : got ? "The frame the other setting gave" : "The frame the right setting gave"];
        const img0 = figs[0].find((e) => e.tagName === "IMG"), img1 = figs[1].find((e) => e.tagName === "IMG");
        if (!img0 || img0.src !== firstIs.file) fail(where + ", " + enc.title + ": the large frame is " + (img0 && img0.src) + ", not " + firstIs.file);
        if (!img1 || img1.src !== (firstIs === photo ? enc.miss : photo).file) fail(where + ", " + enc.title + ": the small frame is the wrong one");
        if (!figs[0].textContent.startsWith(leads[0] + " — " + firstIs.title)) fail(where + ", " + enc.title + ": the large frame's lead is wrong: " + figs[0].textContent.slice(0, 80));
        if (!figs[1].textContent.startsWith(leads[1] + " — ")) fail(where + ", " + enc.title + ": the small frame's lead is wrong: " + figs[1].textContent.slice(0, 80));
        if (!figs[1].classList.contains("counterpart")) fail(where + ", " + enc.title + ": the small frame is not marked as the counterpart");
      } else {
        if (figs.length !== 1) { fail(where + ", " + enc.title + ": shows " + figs.length + " frames, not one"); return; }
        const img = figs[0].find((e) => e.tagName === "IMG");
        if (!img || img.src !== photo.file || img.alt !== photo.alt) fail(where + ", " + enc.title + ": the frame shown is " + (img && img.src) + ", not " + photo.file);
        if (!figs[0].textContent.startsWith("The frame this stop was learned on — " + photo.title + ". " + photo.caption)) fail(where + ", " + enc.title + ": the caption is wrong: " + figs[0].textContent.slice(0, 80));
      }
      // the photograph comes after the verdict, never before it
      const kids = box.children, firstFig = kids.findIndex((e) => e.tagName === "FIGURE" || withClass(e, "author-frame").length), filed = kids.findIndex((e) => e.classList.contains("filed") && e.textContent.startsWith("Filed as"));
      if (firstFig >= 0 && firstFig < filed) fail(where + ", " + enc.title + ": the photograph sits above the verdict");
    };
    const sheetLine = (enc) => { const li = $("sheet").findAll((e) => e.tagName === "LI").find((e) => e.textContent.startsWith(enc.title + " — ")); return li ? li.textContent : null; };

    stops.forEach((id, i) => {
      const enc = S.ENCOUNTERS[id];
      const here = where + ", " + enc.title;
      const kit = pair.main;
      const paths = combos(S, enc).map((c) => ({ c, r: S.develop(enc, c, kit) }));
      const keeper = paths.find((p) => p.r.keeper), folder = paths.find((p) => !p.r.keeper && !p.r.unpublishable), barred = paths.find((p) => p.r.unpublishable);
      if (!keeper) throw new Error(here + " has no keeper on " + kit + " (tools/check.js should have failed first)");
      if (withClass($("stops"), "current")[0].textContent !== enc.stop + " · " + enc.title) fail(here + ": the stops card does not light this stop: " + $("stops").textContent);
      let presses = 0;
      if (i === 0) {
        // a look at something is written once, however often it is pressed
        const key = (enc.examine || [])[0];
        if (key) {
          const look = button($("actions"), S.EXAMINE[key].label);
          if (!look) fail(here + ": no button to look at " + key);
          else {
            const before = withClass($("transcript"), "examined").length;
            click(look); click(look);
            const after = withClass($("transcript"), "examined").length;
            if (after !== before + 1) fail(here + ": looking twice wrote " + (after - before) + " entries");
            if (!$("transcript").textContent.includes(S.EXAMINE[key].text(enc))) fail(here + ": the look's text is not in the transcript");
          }
        }
        // the companion in hand, and the main camera back
        const compBtn = button($("actions"), S.KIT_WORDS.companion + " — " + S.kitLabel(pair.companion));
        if (!compBtn) fail(here + ": the in-hand row has no companion button: " + buttons($("actions")).join(" | "));
        else {
          click(compBtn);
          if (!$("camera").textContent.includes("In hand: the companion — " + S.BODIES[S.KITS[pair.companion].body].name)) fail(here + ": picking up the companion did not reach the camera card: " + $("camera").textContent.slice(0, 80));
          if (!$("transcript").textContent.includes(S.fill(S.KIT_WORDS.pickedUp, { which: "companion", kit: S.kitLabel(pair.companion) }))) fail(here + ": picking up the companion is not on the transcript");
          click(button($("actions"), S.KIT_WORDS.main + " — " + S.kitLabel(pair.main)));
          if (!$("camera").textContent.includes("In hand: the main camera")) fail(here + ": the main camera did not come back to hand");
        }
      }
      // a frame for the folder: the verdict says why, offers try again and abandon, and nothing else
      if (folder && (i === 0 || i === 1 || (enc.photo && enc.photo.alternates))) {
        const box = walk(enc, folder.c); presses++;
        if (!box || !box.classList.contains("dropped")) fail(here + ": a frame for the folder is not marked dropped");
        const causes = folder.r.findings.filter((f) => f.sinks).map((f) => S.LESSONS[f.key].title.toLowerCase());
        if (!box.textContent.includes("Not a keeper: " + causes.join(" · ") + ".")) fail(here + ": the verdict does not name what sank the frame: " + box.textContent.slice(0, 160));
        if (!box.textContent.includes("Filed as: " + folder.r.category + " · entered nowhere")) fail(here + ": a frame for the folder is not filed as entered nowhere");
        if (box.findAll((e) => e.tagName === "ABBR").length) fail(here + ": a frame for the folder carries competition tags");
        // the choices row offers try again and abandon, and nothing else; the look-at row is beside it
        if (buttons($("actions").children[0]).join("|") !== S.RETRY.label + "|" + S.ABANDON.label) fail(here + ": after a frame for the folder the choices are " + buttons($("actions").children[0]).join(" | "));
        photoCard(box, enc, false, presses - 1);
        if (sheetLine(enc) !== enc.title + " — " + S.fill(S.SCORE.folderAfter, { n: presses }) + (causes.length ? " (" + causes.join(", ") + ")" : "") + " · " + folder.r.category) fail(here + ": the sheet's line after a folder frame reads: " + sheetLine(enc));
        if (i === 1) {
          // abandoned: the drive moves on without a keeper, and the card says so at once
          click(button($("actions"), S.ABANDON.label));
          abandoned++;
          if (last(withClass($("transcript"), "chosen")).textContent !== S.ABANDON.label) fail(here + ": abandoning is not on the transcript");
          if (sheetLine(enc) !== enc.title + " — " + S.fill(S.SCORE.abandoned, { n: presses }) + (causes.length ? " (" + causes.join(", ") + ")" : "") + " · " + folder.r.category) fail(here + ": the sheet's line after abandoning reads: " + sheetLine(enc));
          const next = S.ENCOUNTERS[stops[i + 1]];
          if (next && !withClass($("transcript"), "stop-title").some((e) => e.textContent === next.stop + " · " + next.title)) fail(here + ": abandoning did not open the next stop");
          return;
        }
        click(button($("actions"), S.RETRY.label));
        if (last(withClass($("transcript"), "chosen")).textContent !== S.RETRY.label) fail(here + ": trying again is not on the transcript");
        if (!withClass($("actions"), "prompt")[0] || withClass($("actions"), "prompt")[0].textContent !== S.decisionsFor(enc, [])[0].prompt) fail(here + ": trying again did not wind back to the first question");
      }
      // a frame barred from the site: not published, no tags, and the sheet carries no category
      if (barred && !barredTried) {
        barredTried = true;
        const box = walk(enc, barred.c); presses++;
        const causes = barred.r.findings.filter((f) => f.bars).map((f) => S.LESSONS[f.key].title.toLowerCase());
        if (!box.textContent.includes("The frame — not for the site") || !box.textContent.includes("Not for the site: " + causes.join(" · ") + ".")) fail(here + ": a barred frame's verdict is wrong: " + box.textContent.slice(0, 160));
        if (!box.textContent.includes("Filed as: not published.")) fail(here + ": a barred frame is not filed as not published");
        if (sheetLine(enc) !== enc.title + " — " + S.fill(S.SCORE.barredAfter, { n: presses }) + " (" + causes.join(", ") + ")") fail(here + ": the sheet's line after a barred frame reads: " + sheetLine(enc));
        photoCard(box, enc, true, presses - 1);
        click(button($("actions"), S.RETRY.label));
      }
      // the keeper: the verdict, the filing, the note, the photograph, and the way on
      const box = walk(enc, keeper.c); presses++;
      keepers++; if (presses === 1) firsts++;
      if (!box || !box.classList.contains("keeper")) fail(here + ": a keeper is not marked as one");
      if (!box.textContent.includes("The frame — a keeper")) fail(here + ": a keeper's heading is wrong");
      if (box.textContent.includes("Not a keeper")) fail(here + ": a keeper says it is not one");
      const abbrs = box.findAll((e) => e.tagName === "ABBR");
      if (abbrs.map((a) => a.textContent).join() !== keeper.r.tags.join()) fail(here + ": the keeper's tags on the page are " + abbrs.map((a) => a.textContent).join(", ") + ", the model's " + keeper.r.tags.join(", "));
      for (const a of abbrs) if (a.title !== S.RULEBOOKS[a.textContent].name) fail(here + ": the tag " + a.textContent + " does not expand to its rulebook's name");
      if (!box.textContent.includes("Filed as: " + keeper.r.category + " · ")) fail(here + ": the keeper is not filed under " + keeper.r.category);
      if (enc.note && !withClass(box, "note").some((e) => e.textContent === enc.note)) fail(here + ": the keeper's note is missing");
      for (const f of keeper.r.findings) if (S.LESSONS[f.key] && !box.textContent.includes(S.LESSONS[f.key].title + ". ")) fail(here + ": the finding " + f.key + " is not on the page");
      if (keeper.r.findings.some((f) => S.LESSONS[f.key]) !== (withClass(box, "worth").length === 1)) fail(here + ": a keeper's findings are not under Worth noting");
      tagsTotal += keeper.r.tags.length;
      photoCard(box, enc, true, presses - 1);
      const line = enc.title + " — " + (presses === 1 ? S.SCORE.first : S.fill(S.SCORE.keeperIn, { n: presses })) + " · " + keeper.r.category + (keeper.r.tags.length ? " · " + keeper.r.tags.join(", ") : "");
      if (sheetLine(enc) !== line) fail(here + ": the sheet's line reads: " + sheetLine(enc) + "; expected: " + line);
      const onward = i + 1 < stops.length ? (enc.onward || S.ONWARD[r.noun] || S.ONWARD.drive) : "Call it a day.";
      const go = button($("actions"), onward);
      if (!go) { throw new Error(here + ": after a keeper the way on is not offered as \"" + onward + "\": " + buttons($("actions")).join(" | ")); }
      if (buttons($("actions")).length !== 1 + (enc.examine || []).length) fail(here + ": after a keeper the choices are " + buttons($("actions")).join(" | "));
      click(go);
      if (i + 1 < stops.length && withClass($("stops"), "done").length !== i + 1) fail(here + ": the stops card does not strike the stops done");
    });

    // the endcard: the drive's words, the card's counts, the tally, the way to the next drive
    const end = $("endcard");
    if (end.hidden) fail(where + ": the endcard did not show at the end");
    if (!end.textContent.startsWith(r.end.title)) fail(where + ": the endcard does not open on " + r.end.title);
    const card = expectedCard(S, stops.length, keepers, firsts, abandoned);
    if (!end.textContent.includes("The card: " + card + ".")) fail(where + ": the endcard's card is not \"" + card + "\": " + end.textContent.slice(0, 200));
    if (!$("sheet").textContent.startsWith(card)) fail(where + ": the contact sheet's top line is not the card: " + $("sheet").textContent.slice(0, 120));
    for (const t of r.end.text) if (!end.textContent.includes(t)) fail(where + ": the endcard lacks its words: " + t.slice(0, 60));
    if (!/keeper|Nothing to coach/.test(end.textContent)) fail(where + ": the endcard has no coaching");
    if ($("actions").children.length) fail(where + ": the choices did not clear at the end");
    if (r.end.nextLabel && ri + 1 < S.ROUTES.length) {
      const next = button(end, r.end.nextLabel);
      if (!next) fail(where + ": the endcard has no button for " + r.end.nextLabel);
      else {
        click(next);
        if ($("stop-line").textContent !== S.ROUTES[ri + 1].title + " · " + S.ROUTES[ri + 1].sub) fail(where + ": the endcard's button did not open " + S.ROUTES[ri + 1].title);
        if (!$("endcard").hidden) fail(where + ": the next route opens on this one's endcard");
        // back to this route: its day is still there
        click($("routes").find((e) => e.tagName === "BUTTON" && e.textContent.startsWith(r.title)));
        if ($("endcard").hidden || withClass($("transcript"), "frame").length < stops.length) fail(where + ": coming back to the route lost its day");
      }
    } else if (end.findAll((e) => e.tagName === "BUTTON").length) fail(where + ": the last route's endcard offers a next drive: " + buttons(end).join(" | "));

    // the save: a fresh page on the same browser opens on this route with the day as it was left
    const frames = withClass($("transcript"), "frame").length;
    page = openPage(store, answers); $ = page.$; S = page.S;
    if ($("stop-line").textContent !== r.title + " · " + r.sub) fail(where + ": reopening the page did not come back to this route: " + $("stop-line").textContent);
    if (withClass($("transcript"), "frame").length !== frames) fail(where + ": reopening the page replayed " + withClass($("transcript"), "frame").length + " frames of " + frames);
    if ($("endcard").hidden || !$("sheet").textContent.startsWith(card)) fail(where + ": reopening the page lost the endcard or the card");

    // the next day: declined, nothing moves; agreed, the card goes to the past days under the date and the transcript clears
    const daysBefore = $("days").textContent;
    answers.yes = false; answers.asked = 0;
    click($("restart"));
    if (answers.asked !== 1) fail(where + ": the next day did not ask");
    if (withClass($("transcript"), "frame").length !== frames || $("days").textContent !== daysBefore) fail(where + ": declining the next day changed the page");
    answers.yes = true;
    click($("restart"));
    if ($("transcript").children.length) fail(where + ": the next day did not clear the transcript");
    if ($("sheet").textContent !== "nothing yet") fail(where + ": the next day did not clear the contact sheet: " + $("sheet").textContent.slice(0, 80));
    if (!$("endcard").hidden) fail(where + ": the next day did not put the endcard away");
    const days = $("days");
    if (!days.textContent.startsWith(S.NEXT_DAY.past)) fail(where + ": the past days have no heading: " + days.textContent.slice(0, 60));
    const det = days.findAll((e) => e.tagName === "DETAILS");
    if (det.length !== 1) fail(where + ": " + det.length + " past days after one");
    else {
      const sum = det[0].find((e) => e.tagName === "SUMMARY");
      if (!sum || sum.textContent !== localDate() + " · " + card) fail(where + ": the past day's summary reads: " + (sum && sum.textContent));
      if (det[0].findAll((e) => e.tagName === "LI").length !== stops.length) fail(where + ": the past day does not carry a line per stop");
      // the lines carry the keepers' tags and nothing for the stop abandoned
      if (det[0].findAll((e) => e.tagName === "ABBR").length !== tagsTotal) fail(where + ": the past day's lines carry " + det[0].findAll((e) => e.tagName === "ABBR").length + " tags, not the keepers' " + tagsTotal);
    }
    const dayKeys = Object.keys(store).filter((k) => k.startsWith("photo-safari-" + r.id) && k.endsWith(".days"));
    const saved = dayKeys.length === 1 ? JSON.parse(store[dayKeys[0]]) : null;
    if (!Array.isArray(saved) || saved.length !== 1 || saved[0].card !== card || saved[0].date !== localDate() || !saved[0].kit || saved[0].kit.main !== pair.main) fail(where + ": the past day saved under " + dayKeys.join(", ") + " is wrong: " + JSON.stringify(saved).slice(0, 200));
    if (saved && saved[0].lines && saved[0].lines.length !== stops.length) fail(where + ": the past day saved " + saved[0].lines.length + " lines for " + stops.length + " stops");
    // tomorrow proposes yesterday's pair
    if (!$("actions").textContent.includes(S.KIT_WORDS.prompt)) fail(where + ": the next day does not open on the kit card");
    else if ($("kit-main").value !== pair.main || $("kit-companion").value !== pair.companion) fail(where + ": the next day proposes " + $("kit-main").value + " / " + $("kit-companion").value + ", not yesterday's " + pair.main + " / " + pair.companion);
    ok();
  } catch (e) {
    fail(where + ": " + (e.stack || e).toString().split("\n").slice(0, 3).join(" | "));
    try { page = openPage(store, answers); $ = page.$; S = page.S; } catch (e2) { /* the next route reports its own */ }
  }
});

// ---- a rulebook read mid-drive goes on the transcript with its link ----
try {
  const key = Object.keys(S.RULEBOOKS)[0], rb = S.RULEBOOKS[key];
  click(button($("rulebooks"), key + " — " + rb.name));
  const t = $("transcript");
  if (!withClass(t, "stop-title").some((e) => e.textContent === key + " — " + rb.name)) fail("reading a rulebook did not write its title");
  const a = t.find((e) => e.tagName === "A");
  if (!a || a.href !== rb.url || a.rel !== "noopener") fail("the rulebook's link is wrong: " + (a && a.href));
  if (!t.textContent.includes("one reader's summary")) fail("the rulebook card does not say it is a summary");
  ok();
} catch (e) {
  fail("the rulebook: " + (e.stack || e).toString().split("\n").slice(0, 3).join(" | "));
}

console.log(checks + " checks, " + fails + " failures");
process.exit(fails ? 1 : 0);
