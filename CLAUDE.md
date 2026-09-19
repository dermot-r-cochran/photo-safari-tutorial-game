# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## What this is

A one-file browser tutorial game about wildlife photography. Open
`index.html` in any browser: no server, no build, no dependencies, no
network, no framework, no pictures. The player makes the decisions a
photographer makes in the field and the page develops the frame they would
have got, names the lessons, files the frame under a category and, if it
is a keeper, tags it against three competition rulebooks. Progress saves
to localStorage.

It began on 2026-09-13 as *a new photo safari tutorial game based on ideas
from several existing repos* (Dermot's direction), after a prototype made
elsewhere with its own limits. It is not a port of that prototype. A link
to the prototype sat on the About card and in the README for one day,
2026-09-13, and came out on 2026-09-14 at Dermot's direction: the prototype
is more visual but too simplistic, so this tutorial does not point at it.
On 2026-09-19 he retired the hosted prototypes altogether: they are not
named or linked anywhere in this repository.

## The prime directive

**Everything the player can meet lives in the data structures at the top of
`index.html`'s script, and the engine below them never needs editing to add
a stop.** Preserve that; the rules below follow from it, and they are the
`four-islands-quest` rules, which this repository inherits whole:

- **No dependencies, no build step, no network calls, no framework.** Not in
  the page, not in the tools. `tools/check.js` runs on the Node that ships
  with the CI runner and installs nothing.
- **One reviewable file.** The game diffs cleanly in git because it is plain
  literals in one place. Don't split it, minify it, or move content into
  JSON the page fetches.
- **Never rewrite `index.html` programmatically.** Author by hand or with an
  assistant. The check reads the script by loading it into a bare VM
  context — no `document`, so the page never boots — and calls the model
  through the `SAFARI` export at the end of the engine's pure section.
- **The verdict is words; a photograph comes only after it.** Twelve stops
  carry a `photo` — the author's own frame from that outing, at portfolio
  site size under `images/` — rendered as a comparison card *after* the
  player's verdict, never at the top of a stop (it would answer the
  framing decision) and never as the result (one picture cannot stand in
  for every outcome). Dermot's ruling, 2026-09-13, on *add existing photos
  as illustrations or would that be confusing?*: the card only. The page
  works without the files — a missing picture hides its own card — and
  `tools/check.js` requires every picture to be shown at a stop and every
  `photo` to have a file, title, alt and caption. The site JPEGs carry no
  EXIF, so the card states no settings; do not invent them. Only the
  author's own photographs, copied from the portfolio, under its licence.
- **A stop may carry a `miss` beside its `photo`** (Dermot's direction,
  2026-09-15: his photographs, *especially the near-miss failures*, may be
  reused in the tutorial, *especially if there are both positive and
  negative examples of the same scenario*). The miss is the author's own
  frame of the same scenario got wrong; the two render side by side after
  the verdict, the miss first under *The frame this stop was got wrong on*,
  and a miss never stands without the photo it answers (the check holds
  both). A miss may come straight from the archive, unpublished, at site
  size, under the same licence; its caption may state the settings it was
  taken at, because the point of it is the settings. The first pair is
  `sixtieth`: the 1/60 s dawn run at Nairobi beside *The Break*.
- **A card may disagree with its stop's verdict**, as long as the caption
  says so (Dermot, 2026-09-15, on *Two and a Half Seconds* at the `woodland`
  stop: "I like the two-and-a-half-seconds as a creative shot despite the
  blur"). The verdict is the rule for the picture the stop is about; the
  card can show what the author kept when the rule was broken on purpose,
  and the caption names the tension rather than hiding it.
  **A stop carries a photograph only if the frame reads on the card**
  (Dermot, 2026-09-15: *drop the photo from the balloon stop* — the
  balloon was a speck in a flat sky, so the stop now has no card; ten
  stops carried one until then). A frame that was learned on but does
  not show its subject at card size is left out rather than captioned
  around.

## The register

**Written by a novice for other novices and younger photographers**
(Dermot, 2026-09-13: *I am a novice teaching other novices or younger
photographers, not claiming to be an expert (yet)*). The lessons are what
one photographer learned, usually by getting it wrong first; the
photographs are the frames it was learned on, captioned as such — *the
frame this stop was learned on*, never *the right answer*. Keep that
voice: no claims of expertise, no judging register, and where a photograph
differs from its stop (a different hour, a different animal) the caption
says so.

**Lessons learned from now on may be worked into the tutorial** (Dermot's
standing direction, 2026-09-13). When a day in the field adds to or
corrects an entry in the portfolio's `FIELD-NOTES.md`, or a site rule
changes, the tutorial may take it up without being asked: a new stop, a
new option at an existing stop, or a corrected threshold in the model, in
the same register and with the same discipline — the situation was real,
the number has a note behind it, and `tools/check.js` still passes. Say
which note it came from. The tutorial is a work in progress by design and
may say so.

## The model, and where its numbers come from

The engine's pure section (`assemble`, `expose`, `develop`, `eligibility`)
is a small model of a real camera and the rules the author's portfolio
runs on. Its thresholds are those of the author's field notes and site
conventions in `dermot-cochran-photography` (`FIELD-NOTES.md`, `STYLE.md`
and the category and competition sections of its `CLAUDE.md`), restated
here as tutorial content:

- A 14-megapixel crop sensor with 5.1-micron pixels: diffraction softens
  from f/11 and is obvious by f/16; at 1:1 the effective aperture doubles.
  ISO 400 clean, 800 fine, 1600 chroma noise a vivid picture control
  amplifies, 3200 a last resort.
- Auto ISO behaves as the notes say: in A it holds ISO 100 until the
  shutter would drop under the floor, raises ISO to the cap, then lets the
  shutter lengthen; in S and M it raises ISO to reach the exposure and stops
  at the cap, leaving the frame dark rather than blurred.
- Motion needs: flying 1/2000 s, running 1/1000 s, walking 1/250 s; a still
  subject hand-held 1/(focal × 1.5) with two stops from the stabiliser; on
  a support, anything faster than 1/2 s for a subject that stirs (the caps
  move); mirror slap between 1/15 s and 1/2 s unless live view.
- Depth of field from the thin-lens approximation with a 0.02 mm circle of
  confusion; thin when it is under six tenths of the subject's depth.
- Vivid clips white plumage first and blows an already-saturated channel;
  in hard light or at high ISO it crushes shadows and amplifies noise.
- Category: what the subject is, not what it lies on — a wild lion on a
  track is Wildlife; a balloon, a rail or distant watchers make a frame
  Documentary; a plant is Macro at 1:1 and Nature below it.
- Eligibility, by rulebook: the camera club's open competition takes
  anything that is the entrant's own work (its nature rounds follow the
  federation's definitions, so `DCC` is the open competition only — Dermot,
  2026-09-15: a baited eagle is allowed in DCC open but not DCC nature); the world nature awards bar captive animals and
  baiting but not built environments, feral animals or gardens; the
  federation's nature section bars any human element except a scientific
  ring, plus cultivated plants, feral and domestic animals and baiting; its
  wildlife section adds wild and free. Baiting bars a frame from the
  nature *and* the wildlife competitions alike (Dermot's correction,
  2026-09-13: *the fishing eagle baited would also be excluded from most
  wildlife competitions not just nature*) — the tags always did this; the
  words now say it. Recognisable people and mating sequences are not
  published at all.

Change a threshold only when the field notes change; say which note.

**The numbers are one camera's** (Dermot, 2026-09-13: *my tutorial
instructions are specific to my own range of Nikon cameras and might not
generalize*). The game says so on the Camera card (`CAMERA.caveat`) and in
the README rather than pretending otherwise: the thresholds belong to the
author's older crop-sensor body, the decisions carry over, and a
reader with another camera checks the thresholds against their own. Keep
that caveat visible; don't generalise a number to make it sound universal,
and where a term is one maker's (*picture control*, *vivid*) say what other
makers call it.

**No makes or models** (Dermot's rule, 2026-09-17, made for the range game
and applied here the same day: he is transparent about his gear on the
photography site, but does not want the tutorial or the game to carry any
implied product endorsement or criticism). The camera is "an older
crop-sensor DSLR", the lenses are their focal lengths, and no maker or
model name appears in the page, the README or the check's messages. The
quoted direction above keeps its wording because it is his words, not the
tutorial's. The site JPEGs under `images/` carry no EXIF, so nothing leaks
that way.

## Adding a stop

Add an entry to `ENCOUNTERS` (light, subject, frame, presences, examine,
enter, decisions, note, afterword), add any new examinables to `EXAMINE`
and any new finding the engine raises to `LESSONS`, and list the stop in
a route in `ROUTES` (today's drive picks from the safari route's stops by
itself, so the day stays one day; home ground is its own walk).
**Every decision offers at least two options, and the camera decisions
two or three** (Dermot's direction, 2026-09-13: *always have at least two
or three choices for the camera settings at each step*). A single option
is a paragraph, not a choice; the check fails a decision with fewer than
two. Each alternative costs something real in the model — ISO spent on a
speed the subject did not need, diffraction bought for depth the distance
already had, a hand's width of focus at three metres — so the verdict has
something to say about it.

**A stop can be tried again before driving on** (same direction). After
a verdict that is not a keeper the page offers *Try again* beside *Drive
on* (Dermot, same day: no need to offer it when the frame is a keeper): a
`retry` history entry winds the stop back to its first decision, the earlier
frame stays in the transcript as part of the record, and the contact
sheet and the endcard count only the last frame pressed at each stop
(`latestFrames`).

**The contact sheet is a golf scorecard** (Dermot, 2026-09-13: *the game
scoring is a bit like golf; a keeper on the first shot is a bit like a
hole-in-one*). Every press of the shutter at a stop is a stroke, retries
included; the sheet's top line and the endcard give strokes over stops
played against a par of one a stop, and the count of keepers first time;
each stop's line reads *keeper first time*, *keeper in 3* or *folder
after 2*. The words live in `SCORE` in the data section; the arithmetic
in `strokesAt`, `scoreLine` and `scorecard`. Par is deliberately one a
stop everywhere — the stops differ in difficulty, and the table of keeper
combinations in PR #6 shows how, but a par per stop would be a claim
about the player rather than the frame.

**A frame that is not a keeper says why** (Dermot's direction,
2026-09-13). Every finding the engine raises is marked as one that
*sinks* the frame (one for the folder), one that *bars* it from the site
altogether (a recognisable person, a mating sequence), or neither; the
verdict opens with *Not a keeper: …* naming the sinking findings, those
findings are set in the drop colour, and the contact sheet carries the
same names in brackets. A new finding that should sink a frame is added
with `"sinks"` (or `"bars"`), never by setting the flag beside it; the
check fails a non-keeper with no such finding and a keeper with one.

**A frame that is not a keeper is tagged for nothing** (Dermot's
direction, 2026-09-14: *if an image is not a keeper then do not suggest
competition tags*). `eligibility()` returns no tags unless the frame is a
keeper; the verdict's *Filed as* line keeps the category and says the
frame is entered nowhere, the contact sheet shows the category without
tags, and the endcard's eligible counts are therefore counts of keepers.
Until this ruling only a frame barred from the site lost its tags, so a
motion-blurred lion still read as eligible for four competitions. The
check fails a non-keeper carrying a tag, and a keeper without DCC, since
the open competition takes any keeper.

Then `node tools/check.js`: it develops every combination of the stop's
options, requires at least one to be a keeper, holds every finding to a
lesson and every tag to a rulebook, refuses a decision with a single
option, holds every non-keeper to a finding that says why, and holds
every non-keeper to no tags at all. Prose is general-audience, in the
register of the existing stops; every situation so far is one the author
was actually in, and the animals did what they did.

## Publishing

`.github/workflows/pages.yml` serves `index.html` and `images/` from
GitHub Pages on every push to `main` (Dermot's choice, 2026-09-13, over a subdomain of the
photography site; a subdomain can point at the same Pages site later with
a CNAME). CI (`ci.yml`) runs the check on every PR and installs nothing.

## Licence

Engine MIT (`LICENSE`); the stops, lessons and notes CC BY 4.0
(`CONTENT-LICENSE.md`), like the demo world of `four-islands-quest`; the
photographs CC BY-NC-ND 4.0 (`LICENSE-PHOTOS.md`), the portfolio's own
terms, and excluded from the CC BY grant. The field notes the lessons
restate are the author's own.
