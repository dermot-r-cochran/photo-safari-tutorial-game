#!/usr/bin/env node
"use strict";
/* check — run the game's model without a browser.
 *
 * Loads the <script> out of index.html into a bare VM context (no
 * `document`, so the page never boots), then develops every stop under
 * every combination of its options and holds the result to the shape
 * the page relies on: every finding names a lesson that exists, every
 * tag is a rulebook, no number is NaN, every drive resolves, and the
 * day's drive is the same for the same date. Node only — nothing to
 * install, in CI or out.
 *
 *     node tools/check.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) { console.error("no <script> block in index.html"); process.exit(1); }

const ctx = { console };
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(m[1], ctx, { filename: "index.html" });
const S = ctx.SAFARI;
if (!S) { console.error("the script did not export SAFARI"); process.exit(1); }

let fails = 0, frames = 0, keepers = 0;
const fail = (msg) => { fails++; console.error("  FAIL: " + msg); };

function combos(enc) {
  let out = [[]];
  for (const d of enc.decisions) {
    const next = [];
    for (const c of out) for (let i = 0; i < d.options.length; i++) next.push(c.concat(i));
    out = next;
  }
  return out;
}

const lessonsUsed = new Set();
for (const [id, enc] of Object.entries(S.ENCOUNTERS)) {
  if (!enc.decisions || !enc.decisions.length) fail(id + " has no decisions");
  // a stop asks at most two questions, and every question has three answers
  if ((enc.decisions || []).length > 2) fail(id + " asks " + enc.decisions.length + " questions — a stop asks at most two");
  for (const d of enc.decisions || []) {
    if (!d.options || d.options.length !== 3) fail(id + " decision " + d.id + " offers " + (d.options || []).length + " options — every question has three");
  }
  let anyKeeper = false;
  for (const choices of combos(enc)) {
    let r;
    try { r = S.develop(enc, choices); }
    catch (e) { fail(id + " " + JSON.stringify(choices) + " threw: " + e.message); continue; }
    frames++;
    const x = r.exposure;
    for (const [k, v] of Object.entries({ aperture: x.aperture, shutter: x.shutter, iso: x.iso, delta: x.delta, dof: r.dof })) {
      if (typeof v !== "number" || Number.isNaN(v)) fail(id + " " + JSON.stringify(choices) + ": " + k + " is " + v);
    }
    if (x.shutter < 1 / 4000 - 1e-9 || x.shutter > 30 + 1e-9) fail(id + ": shutter out of range " + x.shutter);
    if (x.aperture < 2.8 || x.aperture > 22) fail(id + ": aperture out of range " + x.aperture);
    for (const f of r.findings) {
      if (!S.LESSONS[f.key]) fail(id + " raised finding " + f.key + ", which is not in LESSONS");
      else {
        lessonsUsed.add(f.key);
        const text = S.fill(S.LESSONS[f.key].text, f.vars);
        if (/\{\w+\}/.test(text)) fail(id + ": lesson " + f.key + " left a placeholder unfilled: " + text);
      }
    }
    for (const t of r.tags) if (!S.RULEBOOKS[t]) fail(id + " tagged " + t + ", which is not a rulebook");
    if (!["Wildlife", "Urban Wildlife", "Landscape", "Nature", "Macro", "Documentary"].includes(r.category)) fail(id + ": category " + r.category);
    // only a keeper is tagged: a frame for the folder is entered nowhere
    if (!r.keeper && r.tags.length) fail(id + " " + JSON.stringify(choices) + ": not a keeper, but carries competition tags");
    if (r.keeper && !r.tags.includes("DCC")) fail(id + " " + JSON.stringify(choices) + ": a keeper without the open competition");
    // a frame that is not a keeper always says why
    if (!r.keeper && !r.findings.some((f) => (r.unpublishable ? f.bars : f.sinks))) fail(id + " " + JSON.stringify(choices) + ": not a keeper, but no finding says why");
    if (r.keeper && r.findings.some((f) => f.sinks || f.bars)) fail(id + " " + JSON.stringify(choices) + ": a keeper with a sinking finding");
    if (r.tags.includes("IPF-Wildlife") && !r.tags.includes("IPF-Nature")) fail(id + ": IPF-Wildlife without IPF-Nature");
    if (r.keeper) { keepers++; anyKeeper = true; }
  }
  if (!anyKeeper) fail(id + " has no combination of choices that yields a keeper");
  for (const key of enc.examine || []) if (!S.EXAMINE[key]) fail(id + " looks at " + key + ", which is not in EXAMINE");
  // `photo` is the frame the stop was learned on; `miss` is the author's
  // frame of the same scenario got wrong, shown beside it. Same shape,
  // same checks, and a miss never stands without the photo it answers.
  if (enc.miss && !enc.photo) fail(id + ": a miss needs a photo to stand beside");
  for (const kind of ["photo", "miss"]) {
    const ph = enc[kind];
    if (!ph) continue;
    if (!/^images\/[a-z0-9-]+\.jpg$/.test(ph.file || "")) fail(id + ": " + kind + " file must live under images/: " + ph.file);
    else {
      const full = path.join(root, ph.file);
      if (!fs.existsSync(full)) fail(id + ": " + kind + " " + ph.file + " is not in the repository");
      else if (fs.statSync(full).size > 800 * 1024) fail(id + ": " + kind + " " + ph.file + " is over 800 KB — site size is 1600 px, roughly 250–550 KB");
    }
    for (const k of ["title", "alt", "caption"]) if (!ph[k]) fail(id + ": " + kind + " has no " + k);
  }
}
// every picture in images/ belongs to a stop
const shown = new Set(Object.values(S.ENCOUNTERS).flatMap((e) => [e.photo && e.photo.file, e.miss && e.miss.file]).filter(Boolean));
const imgDir = path.join(root, "images");
if (fs.existsSync(imgDir)) for (const f of fs.readdirSync(imgDir)) {
  if (!shown.has("images/" + f)) fail("images/" + f + " is shown at no stop");
}
for (const k of ["first", "keeperIn", "folderAfter", "barredAfter", "abandoned", "card", "level", "over", "firsts"]) {
  if (!S.SCORE || !S.SCORE[k]) fail("SCORE has no " + k);
}
// the next day on a route has a label and a confirmation, each naming the route's word
for (const k of ["label", "confirm"]) if (!S.NEXT_DAY || !S.NEXT_DAY[k] || !S.NEXT_DAY[k].includes("{noun}")) fail("NEXT_DAY." + k + " is missing or does not carry {noun}");
if (!S.NEXT_DAY || !S.NEXT_DAY.past) fail("NEXT_DAY.past has no heading for the past days");
if (!S.NEXT_DAY || !(S.NEXT_DAY.keep >= 1)) fail("NEXT_DAY.keep must keep at least one day");
// abandoning a stop has a price, a label that names it, and words
if (!S.ABANDON || !(S.ABANDON.strokes > 1)) fail("ABANDON.strokes must be more than one stroke, or abandoning is free");
if (!S.ABANDON || !S.ABANDON.label || !S.ABANDON.text || !S.ABANDON.text.length) fail("ABANDON has no label or text");
if (S.ABANDON && !String(S.ABANDON.label).includes(String(S.ABANDON.strokes))) fail("ABANDON.label does not name its price of " + S.ABANDON.strokes);
for (const [key, r] of Object.entries(S.RULEBOOKS)) {
  if (!r.name || !r.text || !r.text.length) fail("rulebook " + key + " has no name or text");
  if (!/^https:\/\//.test(r.url || "")) fail("rulebook " + key + " has no https url to the rules themselves");
}
for (const key of Object.keys(S.LESSONS)) if (!lessonsUsed.has(key)) console.log("  warn: lesson " + key + " is never raised");
for (const key of Object.keys(S.EXAMINE)) {
  const used = Object.values(S.ENCOUNTERS).some((e) => (e.examine || []).includes(key));
  if (!used) console.log("  warn: examinable " + key + " is never looked at");
}

for (const r of S.ROUTES) {
  const stops = S.routeStops(r, "2026-09-13");
  if (!stops.length) fail("route " + r.id + " has no stops");
  for (const id of stops) if (!S.ENCOUNTERS[id]) fail("route " + r.id + " names " + id + ", which is no stop");
  if (r.daily) {
    const again = S.routeStops(r, "2026-09-13");
    if (JSON.stringify(stops) !== JSON.stringify(again)) fail("today's drive is not deterministic");
    const other = S.routeStops(r, "2026-09-14");
    if (JSON.stringify(stops) === JSON.stringify(other)) console.log("  warn: two consecutive days gave the same drive");
    const times = stops.map((id) => S.ENCOUNTERS[id].stop);
    if (times.slice().sort().join() !== times.join()) fail("today's drive is not in the order of the day");
  }
}

console.log(`  ${Object.keys(S.ENCOUNTERS).length} stops, ${frames} frames developed, ${keepers} keepers, ${Object.keys(S.LESSONS).length} lessons, ${shown.size} photographs`);
console.log(fails ? `${fails} failure(s)` : "check: ok");
process.exit(fails ? 1 : 0);
