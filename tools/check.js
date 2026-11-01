#!/usr/bin/env node
"use strict";
/* check — run the game's model without a browser.
 *
 * Loads the <script> out of index.html into a bare VM context (no
 * `document`, so the page never boots), then develops every stop under
 * every combination of its options and holds the result to the shape
 * the page relies on: every finding names a lesson that exists, every
 * tag is a rulebook, no number is NaN, every drive resolves, and the
 * day's drive is the same for the same date. Before any of that, the
 * model's own numbers — the thresholds the README states — are held on
 * a made-up stop. Node only — nothing to install, in CI or out.
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

// every path through a stop's questions: an option may carry `then`, a
// second question of its own, so the paths are walked, not multiplied
function combos(enc) {
  const out = [];
  (function walk(choices) {
    const asked = S.decisionsFor(enc, choices);
    if (asked.length === choices.length) { out.push(choices); return; }
    const d = asked[choices.length];
    for (let i = 0; i < d.options.length; i++) walk(choices.concat(i));
  })([]);
  return out;
}
// every question a stop can ask, on any path
function questions(enc) {
  const out = [];
  const add = (d) => { out.push(d); for (const o of d.options || []) if (o.then) add(o.then); };
  for (const d of enc.decisions || []) add(d);
  return out;
}

// the branching walk itself, held to its shape on a made-up stop before
// any real stop relies on it
{
  const q = (id, n, thens) => ({ id, prompt: id + "?", options: Array.from({ length: n }, (_, i) => Object.assign({ label: id + i }, thens && thens[i] ? { then: thens[i] } : {})) });
  const fake = { decisions: [q("a", 3, [null, q("b1", 2)]), q("b", 3)] };
  const paths = combos(fake).map((c) => c.join(""));
  const want = ["00", "01", "02", "10", "11", "20", "21", "22"];
  if (paths.join() !== want.join()) fail("decisionsFor walks the wrong paths: " + paths.join(" "));
  if (S.decisionsFor(fake, []).length !== 1) fail("decisionsFor asks more than the first question before it is answered");
  if (S.decisionsFor(fake, [1]).map((d) => d.id).join() !== "a,b1") fail("decisionsFor does not follow an option's `then`");
  if (S.decisionsFor(fake, [0]).map((d) => d.id).join() !== "a,b") fail("decisionsFor does not fall back to the stop's next decision");
  if (questions(fake).map((d) => d.id).join() !== "a,b1,b") fail("questions() misses a branch");
}

// the model's numbers are the README's: every threshold "What it teaches"
// states is held here on a made-up stop, so a number that drifts in the
// engine or in the prose is caught before a reader checks it against
// their own camera (the README-proof convention, 2026-10-10)
{
  const stop = (light, subject, frame, set) => ({
    light: Object.assign({ ev: 13 }, light),
    subject: Object.assign({ motion: "still", distance: 30, depth: 1 }, subject),
    frame: Object.assign({ kind: "wildlife", tells: [] }, frame),
    decisions: [{ id: "one", prompt: "?", options: [{ label: "x", set: set || {} }] }]
  });
  const run = (what, light, subject, frame, set, kit) => {
    try { return S.develop(stop(light, subject, frame, set), [0], kit || "zoom"); }
    catch (e) { fail("the model's numbers: " + what + " threw: " + e.message); return null; }
  };
  const has = (r, key) => !!r && r.findings.some((f) => f.key === key);
  const sinks = (r, key) => !!r && r.findings.some((f) => f.key === key && f.sinks);
  const expect = (cond, what) => { if (!cond) fail("the model's numbers: " + what); };
  const std = { picture: "standard" };

  // motion floors: flying 1/2000 s, running 1/1000 s, walking 1/250 s
  for (const [motion, floor, ev] of [["flying", 2000, 16], ["running", 1000, 15], ["walking", 250, 13]]) {
    const slow = run(motion, { ev }, { motion }, {}, Object.assign({ mode: "S", shutter: 2 / floor, iso: 100 }, std));
    const fast = run(motion, { ev }, { motion }, {}, Object.assign({ mode: "S", shutter: 1 / floor, iso: 100 }, std));
    expect(sinks(slow, "motionBlur"), motion + " at 1/" + floor / 2 + " s should blur and sink the frame");
    expect(fast && fast.keeper && !has(fast, "motionBlur"), motion + " at 1/" + floor + " s should be sharp and a keeper");
  }
  // hand-held, a still subject: 1/(focal × 1.5), two stops back for the stabiliser; the 50 mm has none
  const h100 = run("hand-held 400 mm", {}, {}, {}, Object.assign({ mode: "S", shutter: 1 / 100, iso: 100 }, std));
  const h200 = run("hand-held 400 mm", {}, {}, {}, Object.assign({ mode: "S", shutter: 1 / 200, iso: 100 }, std));
  expect(sinks(h100, "shake"), "hand-held at 400 mm, 1/100 s is under the 1/150 s the stabiliser allows and should shake");
  expect(h200 && !has(h200, "shake"), "hand-held at 400 mm, 1/200 s is over the floor and should hold");
  const f60 = run("the 50 mm hand-held", {}, {}, {}, Object.assign({ mode: "S", shutter: 1 / 60, iso: 100, focal: 50 }, std), "fifty");
  const f100 = run("the 50 mm hand-held", {}, {}, {}, Object.assign({ mode: "S", shutter: 1 / 100, iso: 100, focal: 50 }, std), "fifty");
  expect(sinks(f60, "shake"), "the unstabilised 50 mm at 1/60 s is under 1/75 s and should shake");
  expect(f100 && !has(f100, "shake"), "the unstabilised 50 mm at 1/100 s should hold");
  // on a support: safe from shake at any length, but a subject that stirs blurs past 1/2 s
  const tripod = { support: "tripod", liveView: true };
  const quarter = run("stirs on a support", { ev: 7 }, { motion: "stirs" }, {}, Object.assign({ mode: "S", shutter: 1 / 4, iso: 100 }, tripod, std), "long");
  const second = run("stirs on a support", { ev: 7 }, { motion: "stirs" }, {}, Object.assign({ mode: "S", shutter: 1, iso: 100 }, tripod, std), "long");
  expect(quarter && quarter.keeper && !has(quarter, "windBlur") && !has(quarter, "shake"), "a subject that stirs at 1/4 s on a support should hold");
  expect(sinks(second, "windBlur"), "a subject that stirs at 1 s on a support should blur: the caps move");
  // mirror slap between 1/15 s and 1/2 s on a support, unless live view; the mirrorless has no mirror
  const slap = (set, kit) => run("mirror slap", { ev: 9 }, {}, {}, Object.assign({ mode: "S", shutter: 1 / 8, iso: 100, support: "tripod", liveView: false }, set, std), kit);
  expect(sinks(slap({}), "mirrorSlap"), "the DSLR at 1/8 s on a support through the finder should take the mirror's thump");
  expect(!has(slap({ liveView: true }), "mirrorSlap"), "live view keeps the mirror up, so 1/8 s on a support should hold");
  expect(!has(slap({}, "long"), "mirrorSlap"), "the mirrorless has no mirror to thump at 1/8 s");
  expect(!has(slap({ shutter: 1 / 30 }), "mirrorSlap"), "1/30 s is outside the mirror's band");
  // ISO 400 clean, 800 fine, 1600 chroma noise that vivid amplifies, 3200 a last resort
  const at = (iso, picture) => run("ISO " + iso, {}, {}, {}, { mode: "A", aperture: 8, iso, picture: picture || "standard" });
  expect(!has(at(400), "noise1600") && !has(at(400), "noise3200"), "ISO 400 should be clean");
  expect(!has(at(800), "noise1600") && !has(at(800), "noise3200"), "ISO 800 should be fine");
  expect(has(at(1600), "noise1600") && !sinks(at(1600), "noise1600"), "ISO 1600 should show chroma noise without sinking the frame");
  expect(has(at(3200), "noise3200"), "ISO 3200 should be the last resort");
  expect(has(at(1600, "vivid"), "vividHarsh") && !has(at(800, "vivid"), "vividHarsh"), "vivid should amplify the noise at 1600 and not at 800");
  // diffraction softens from f/16 and sinks at f/22; at 1:1 the aperture doubles, so f/11 sinks and f/8 passes
  const atF = (aperture, frame, kit) => run("f/" + aperture, { ev: 13 }, {}, frame || {}, Object.assign({ mode: "A", aperture, iso: 100 }, tripod, std), kit);
  expect(!has(atF(11), "diffraction"), "f/11 should not diffract");
  expect(has(atF(16), "diffraction") && !sinks(atF(16), "diffraction"), "f/16 should soften without sinking the frame");
  expect(sinks(atF(22), "diffraction"), "f/22 should sink the frame to diffraction");
  const oneToOne = { kind: "plant", magnification: 1 };
  const close = { distance: 0.14, depth: 0.01 };
  const m11 = run("f/11 at 1:1", { ev: 6 }, close, oneToOne, Object.assign({ mode: "A", aperture: 11, iso: 100, focal: 70 }, tripod, std), "macro");
  const m8 = run("f/8 at 1:1", { ev: 6 }, close, oneToOne, Object.assign({ mode: "A", aperture: 8, iso: 100, focal: 70 }, tripod, std), "macro");
  expect(sinks(m11, "diffraction"), "f/11 at 1:1 is f/22 in effect and should sink the frame");
  expect(m8 && !has(m8, "diffraction") && has(m8, "macro") && m8.category === "Macro", "f/8 at 1:1 should pass, and one cap filling the frame is Macro");
  const m5 = run("1:5 on the macro", { ev: 6 }, close, { kind: "plant", magnification: 0.2 }, Object.assign({ mode: "A", aperture: 8, iso: 100, focal: 70 }, tripod, std), "macro");
  expect(m5 && has(m5, "closeUp") && m5.category === "Nature", "1:5 is close-up work and files as Nature");
  // depth of field about a millimetre at 1:1 and f/8
  const dof = S.depthOfField(8, 70, 0.14);
  expect(dof > 0.0005 && dof < 0.002, "depth of field at 1:1 and f/8 should be about a millimetre, not " + dof);
  // Auto ISO: in A it holds ISO 100 until the shutter would drop under the floor, raises to the cap, then
  // lets the shutter lengthen; in S and M it stops at the cap and leaves the frame dark; manual holds its shutter
  const aBright = run("A in good light", { ev: 13 }, {}, {}, Object.assign({}, S.PRESETS.walkAround, std));
  expect(aBright && aBright.exposure.iso === 200 && aBright.exposure.shutter <= 1 / 250 + 1e-9, "A at EV 13 should stop at ISO 200 with the shutter on its 1/250 s floor");
  const aDim = run("A at first light", { ev: 7 }, { motion: "stirs" }, {}, Object.assign({}, S.PRESETS.walkAround, { support: "beanbag" }, std));
  expect(aDim && aDim.exposure.iso === 800 && aDim.exposure.shutter > 1 / 20 && aDim.keeper, "A at EV 7 should reach its cap of 800 and let the shutter run out to about 1/16 s");
  const sDim = run("S at first light", { ev: 7 }, { motion: "stirs" }, {}, Object.assign({}, S.PRESETS.birds, std));
  expect(sDim && sDim.exposure.iso === 1600 && Math.abs(sDim.exposure.shutter - 1 / 2000) < 1e-9 && sinks(sDim, "under"), "S at EV 7 should keep 1/2000 s, stop at ISO 1600 and leave the frame dark");
  const mDim = run("M at first light", { ev: 7 }, { motion: "stirs" }, {}, Object.assign({ mode: "M", aperture: 8, shutter: 1 / 2000, iso: "auto", isoMax: 1600 }, std));
  expect(mDim && mDim.exposure.iso === 1600 && Math.abs(mDim.exposure.shutter - 1 / 2000) < 1e-9 && sinks(mDim, "manualDark"), "M at EV 7 should hold 1/2000 s, stop at ISO 1600 and leave the frame dark rather than blurred");
  // the vivid dial: it clips white plumage and blows a saturated channel; standard on scenery is flat only in kind light
  const vivid = { mode: "A", aperture: 8, iso: 100, picture: "vivid" };
  expect(sinks(run("vivid on white", {}, { white: true }, {}, vivid), "vividWhite"), "vivid on a white subject should clip the whites and sink the frame");
  expect(sinks(run("vivid on saturated", {}, { saturated: true }, {}, vivid), "vividSaturated"), "vivid on a saturated subject should blow a channel and sink the frame");
  expect(!has(run("standard on white", {}, { white: true }, {}, Object.assign({ mode: "A", aperture: 8, iso: 100 }, std)), "vividWhite"), "standard on a white subject should hold the whites");
  const scene = (frame) => run("standard on scenery", { ev: 13 }, {}, Object.assign({ kind: "landscape" }, frame), Object.assign({ mode: "A", aperture: 8, iso: 100, focal: 18 }, std));
  expect(has(scene({}), "flat"), "standard on scenery in kind light should read flatter than the house look");
  expect(!has(scene({ harsh: true }), "flat") && has(scene({ harsh: true }), "harsh"), "standard on scenery in harsh light is the right call, not flat");
  // the lens in hand: its reach, its wide end and how close it focuses
  const far = run("500 mm on the zoom", {}, {}, {}, { mode: "A", aperture: 8, iso: 100, focal: 500 });
  expect(far && has(far, "reach") && far.exposure && far.settings.focal === 400, "500 mm on the 18–400 should stop at 400 and say the lens ran out");
  const wide = run("18 mm on the long zoom", {}, {}, { kind: "landscape" }, { mode: "A", aperture: 8, iso: 100, focal: 18 }, "long");
  expect(wide && has(wide, "wideEnd") && wide.settings.focal === 150, "18 mm on the 150–500 should stop at 150 and say the lens would not go wide");
  const dot = run("400 mm on the 50", {}, {}, {}, { mode: "A", aperture: 8, iso: 100, focal: 400 }, "fifty");
  expect(has(dot, "tiny"), "400 mm reached for on the 50 mm leaves the subject a dot that does not read");
  const nm = run("1:1 on the zoom", { ev: 6 }, close, oneToOne, Object.assign({ mode: "A", aperture: 8, iso: 100, focal: 70 }, tripod, std));
  expect(nm && has(nm, "notMacro") && has(nm, "closeUp") && nm.category === "Nature", "1:1 reached for on the zoom should stop at about 1:4 and file as Nature");
  expect(!has(m8, "notMacro"), "the 70 mm macro should reach 1:1");
}

// what each presence does to the frame's category and its tags: the
// README's "what is in the frame besides the subject" and "ethics that
// the picture cannot show", each held on the same made-up stop. The
// path is a keeper in kind light, so only the presence decides the
// outcome; the outcomes are the rulebooks as CLAUDE.md's "The model"
// reads them, and the stops carry each presence the way it is tried here
{
  const stop = (frame, subject) => ({
    light: { ev: 13 },
    subject: Object.assign({ motion: "still", distance: 30, depth: 1 }, subject),
    frame: Object.assign({ kind: "wildlife", tells: [] }, frame),
    decisions: [{ id: "one", prompt: "?", options: [{ label: "x", set: Object.assign({}, S.PRESETS.walkAround, { picture: "standard", focal: 200 }) }] }]
  });
  const run = (what, frame, subject) => {
    try { return S.develop(stop(frame, subject), [0], "zoom"); }
    catch (e) { fail("the presences: " + what + " threw: " + e.message); return null; }
  };
  const has = (r, key) => !!r && r.findings.some((f) => f.key === key);
  const expect = (cond, what) => { if (!cond) fail("the presences: " + what); };
  const files = (what, frame, category, tags, subject) => {
    const r = run(what, frame, subject);
    if (!r) return r;
    if (r.category !== category) fail("the presences: " + what + " should file as " + category + ", not " + r.category);
    if (r.tags.join() !== tags.join()) fail("the presences: " + what + " should carry " + (tags.join(", ") || "no tags") + ", not " + (r.tags.join(", ") || "none"));
    return r;
  };
  const every = ["DCC", "WNPA", "IPF-Nature", "IPF-Wildlife"], open = ["DCC"], awards = ["DCC", "WNPA"];
  // nothing in the frame but the subject: Wildlife, and every rulebook open
  const plain = files("a wild subject alone", {}, "Wildlife", every);
  expect(plain && plain.keeper, "a wild subject alone in kind light should be a keeper");
  // a minor tell (a vehicle track) shuts the federation's sections but does not change
  // what the subject is; framed tight, an excludable tell is outside the edge and they open again
  const track = { label: "the vehicle track", excludable: true, minor: true };
  const t = files("a track in a loose frame", { framing: "loose", tells: [track] }, "Wildlife", awards);
  expect(has(t, "tell"), "a track in the frame should be named as a tell");
  const tt = files("a track framed out", { framing: "tight", tells: [track] }, "Wildlife", every);
  expect(has(tt, "tellExcluded") && !has(tt, "tell"), "a tight frame should put an excludable tell outside the edge");
  // a major tell (a feeding rail, a balloon) makes the frame Documentary
  files("a rail in the frame", { tells: [{ label: "the feeding rail", excludable: false }] }, "Documentary", awards);
  const balloon = { label: "the balloon", excludable: true };
  files("a balloon over scenery", { kind: "landscape", framing: "loose", tells: [balloon] }, "Documentary", awards);
  files("scenery with the balloon framed out", { kind: "landscape", framing: "tight", tells: [balloon] }, "Landscape", ["DCC", "WNPA", "IPF-Nature"]);
  // a scientific ring is the one human element the federation allows
  const ring = files("a numbered leg ring", { tells: [{ label: "the numbered leg ring", ring: true, excludable: false }] }, "Wildlife", every);
  expect(has(ring, "ring") && !has(ring, "tell"), "a ring should be noted as allowed, not as a tell");
  // three people on a far vehicle, as the stops carry them: the vehicle a tell, the figures distant;
  // loose, the frame is Documentary and the federation shut; tight, they are out of it
  const watchers = { label: "the other vehicle and its watchers", excludable: true };
  const far = files("distant figures in a loose frame", { people: "distant", framing: "loose", tells: [watchers] }, "Documentary", awards);
  expect(has(far, "distantPeople"), "distant figures should be noted as fine");
  files("distant figures framed out", { people: "distant", framing: "tight", tells: [watchers] }, "Wildlife", every);
  // a recognisable stranger and a mating pair bar the frame from the site: for the folder, and no tags at all
  for (const [what, frame, key] of [["a recognisable stranger", { people: "recognisable" }, "people"], ["a mating pair", { mating: true }, "mating"]]) {
    const r = files(what, frame, "Wildlife", []);
    expect(r && !r.keeper && r.unpublishable && r.findings.some((f) => f.key === key && f.bars), what + " should bar the frame from the site");
  }
  // the animals that live where people do: a built place, with the building in the frame as its tell,
  // is Urban Wildlife, the world awards' own section and not the federation's; feral is the same split
  const built = files("a free-living animal in a built place", { built: true, tells: [{ label: "the coffee machinery", excludable: false }] }, "Urban Wildlife", awards);
  expect(has(built, "urban"), "a built place should raise the urban note");
  const feral = files("a feral animal", { feral: true }, "Wildlife", awards);
  expect(has(feral, "feral"), "feral should be named");
  // baited, captive, softened afterwards, disturbed: still a keeper, and the open competition only
  for (const [what, frame, key] of [["baited", { baited: true }, "baited"], ["captive", { captive: true }, "captive"], ["a background softened afterwards", { processed: true }, "processed"], ["a subject disturbed for the frame", { disturbed: true }, "disturbed"]]) {
    const r = files(what, frame, "Wildlife", open);
    expect(r && r.keeper && has(r, key), what + " should stay a keeper, with the finding that names it");
  }
  files("baited, with the bucket in the frame", { baited: true, kind: "documentary", tells: [{ label: "the bucket", excludable: false }] }, "Documentary", open);
}

// the kit: every kit a body and a lens; every route's pair two kits on
// different bodies (one lens on each, none changed in the field); every
// stop's own kit one that its route carries
for (const [id, k] of Object.entries(S.KITS)) {
  if (!S.BODIES[k.body]) fail("kit " + id + " names body " + k.body + ", which is not in BODIES");
  if (!S.CAMERA.lenses[k.lens]) fail("kit " + id + " names lens " + k.lens + ", which is not in CAMERA.lenses");
}
const routeOf = (stopId) => S.ROUTES.find((r) => !r.daily && r.stops.includes(stopId));
for (const r of S.ROUTES) {
  const k = S.routeKit(r);
  if (!S.KITS[k.main]) fail("route " + r.id + " main kit " + k.main + " is not in KITS");
  // a route may carry one body only (companion: null); with two, they are on different bodies
  if (k.companion !== null && !S.KITS[k.companion]) fail("route " + r.id + " companion kit " + k.companion + " is not in KITS");
  if (S.KITS[k.main] && k.companion && S.KITS[k.companion] && S.KITS[k.main].body === S.KITS[k.companion].body) fail("route " + r.id + " puts both kits on one body");
}

const widest = Math.min(...Object.values(S.CAMERA.lenses).map((l) => l.apWide));
const lessonsUsed = new Set();
for (const [id, enc] of Object.entries(S.ENCOUNTERS)) {
  const own = S.kitFor(undefined, enc);
  if (enc.kit && !S.KITS[enc.kit]) fail(id + " was learned on kit " + enc.kit + ", which is not in KITS");
  // the route as shipped must be playable: one of its two default kits
  // yields a keeper at every stop on it
  const r = routeOf(id);
  const carried = r ? Object.values(S.routeKit(r)).filter(Boolean) : [];
  let carriedKeeper = false;
  if (!enc.decisions || !enc.decisions.length) fail(id + " has no decisions");
  // a stop asks two or three questions on any path, and every question
  // has two to four answers (Dermot, 2026-09-20: "Two or three questions,
  // each with two to four options", generally, wherever the lesson would
  // benefit or the extra choices look reasonable)
  for (const d of questions(enc)) {
    if (!d.options || d.options.length < 2 || d.options.length > 4) fail(id + " decision " + d.id + " offers " + (d.options || []).length + " options — every question has two to four");
    if (d.options && d.options.length === 1) fail(id + " decision " + d.id + " has a single option, which is no decision");
  }
  let anyKeeper = false;
  // every path on every kit develops cleanly and keeps its invariants; a
  // keeper is required on the kit the stop was learned on
  for (const kit of Object.keys(S.KITS)) for (const choices of combos(enc)) {
    if (kit === own && (choices.length < 2 || choices.length > 3)) fail(id + " asks " + choices.length + " question(s) on the path " + JSON.stringify(choices) + " — a stop asks two or three");
    let r;
    try { r = S.develop(enc, choices, kit); }
    catch (e) { fail(id + " on " + kit + " " + JSON.stringify(choices) + " threw: " + e.message); continue; }
    if (kit === own) frames++;
    const x = r.exposure;
    for (const [k, v] of Object.entries({ aperture: x.aperture, shutter: x.shutter, iso: x.iso, delta: x.delta, dof: r.dof })) {
      if (typeof v !== "number" || Number.isNaN(v)) fail(id + " " + JSON.stringify(choices) + ": " + k + " is " + v);
    }
    if (x.shutter < 1 / 4000 - 1e-9 || x.shutter > 30 + 1e-9) fail(id + ": shutter out of range " + x.shutter);
    if (x.aperture < widest - 1e-9 || x.aperture > 22) fail(id + ": aperture out of range " + x.aperture);
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
    if (r.keeper && kit === own) { keepers++; anyKeeper = true; }
    if (r.keeper && carried.includes(kit)) carriedKeeper = true;
  }
  if (!anyKeeper) fail(id + " has no combination of choices that yields a keeper on the " + own + " kit");
  if (r && !carriedKeeper) fail(id + " has no keeper on either kit its route " + r.id + " carries (" + carried.join(", ") + ")");
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
for (const k of ["first", "keeperIn", "folderAfter", "barredAfter", "abandoned", "card", "keepers", "firsts", "abandonedCount"]) {
  if (!S.SCORE || !S.SCORE[k]) fail("SCORE has no " + k);
}
// the card is plain counts: no strokes, no par (Dermot, 2026-09-21)
if (S.SCORE && /stroke|par\b/i.test(Object.values(S.SCORE).join(" "))) fail("SCORE has gone back to strokes or par");
// the next day on a route has a label and a confirmation, each naming the route's word
for (const k of ["label", "confirm"]) if (!S.NEXT_DAY || !S.NEXT_DAY[k] || !S.NEXT_DAY[k].includes("{noun}")) fail("NEXT_DAY." + k + " is missing or does not carry {noun}");
if (!S.NEXT_DAY || !S.NEXT_DAY.past) fail("NEXT_DAY.past has no heading for the past days");
if (!S.NEXT_DAY || !(S.NEXT_DAY.keep >= 1)) fail("NEXT_DAY.keep must keep at least one day");
// every route's noun has its own words for moving on: not every outing is a drive
for (const r of S.ROUTES) if (!S.ONWARD || !S.ONWARD[r.noun]) fail("route " + r.id + " is a " + r.noun + ", and ONWARD has no words for one");
// abandoning a stop has a label and words; it has no price since 2026-09-21
if (!S.ABANDON || !S.ABANDON.label || !S.ABANDON.text || !S.ABANDON.text.length) fail("ABANDON has no label or text");
if (S.ABANDON && "strokes" in S.ABANDON) fail("ABANDON has a price again; the card is plain counts");
for (const [key, r] of Object.entries(S.RULEBOOKS)) {
  if (!r.name || !r.text || !r.text.length) fail("rulebook " + key + " has no name or text");
  if (!/^https:\/\//.test(r.url || "")) fail("rulebook " + key + " has no https url to the rules themselves");
}
for (const key of Object.keys(S.LESSONS)) if (!lessonsUsed.has(key)) console.log("  warn: lesson " + key + " is never raised");
for (const key of Object.keys(S.EXAMINE)) {
  const used = Object.values(S.ENCOUNTERS).some((e) => (e.examine || []).includes(key));
  if (!used) console.log("  warn: examinable " + key + " is never looked at");
}

// every stop is on exactly one route of its own: a stop on none is
// unreachable, and a stop on two is on the wrong drive (the boat on
// Naivasha and the Giraffe Centre are not stops on a game drive —
// Dermot, 2026-09-20)
for (const id of Object.keys(S.ENCOUNTERS)) {
  const on = S.ROUTES.filter((r) => !r.daily && r.stops.includes(id)).map((r) => r.id);
  if (on.length !== 1) fail("stop " + id + " is on " + (on.length ? on.join(" and ") : "no route") + "; every stop is on exactly one route of its own");
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

// the two city stops file as Urban Wildlife: every path at every stop on
// the route `city`, on every kit, is in the one category that is for the
// animals that live where people do, and a keeper there has the world
// awards open and the federation's sections shut (Dermot, 2026-09-21: an
// urban wildlife walk, not architecture)
{
  const city = S.ROUTES.find((r) => r.id === "city");
  if (!city) fail("there is no route `city`");
  else for (const id of city.stops) for (const kit of Object.keys(S.KITS)) for (const choices of combos(S.ENCOUNTERS[id])) {
    let r;
    try { r = S.develop(S.ENCOUNTERS[id], choices, kit); } catch (e) { continue; }   // the path check above has already failed it
    if (r.category !== "Urban Wildlife") fail(id + " " + JSON.stringify(choices) + " on " + kit + " files as " + r.category + ", not Urban Wildlife");
    if (r.keeper && (!r.tags.includes("WNPA") || r.tags.some((t) => t.startsWith("IPF")))) fail(id + " " + JSON.stringify(choices) + " on " + kit + ": a city keeper carries " + r.tags.join(", ") + "; the world awards take it and the federation's sections do not");
  }
}

console.log(`  ${Object.keys(S.ENCOUNTERS).length} stops, ${frames} frames developed, ${keepers} keepers, ${Object.keys(S.LESSONS).length} lessons, ${shown.size} photographs`);
console.log(fails ? `${fails} failure(s)` : "check: ok");
process.exit(fails ? 1 : 0);
