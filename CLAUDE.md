# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## What this is

A one-file browser tutorial game about wildlife photography. Open
`index.html` in any browser: no server, no build, no dependencies, no
network, no framework, no pictures. The player makes the decisions a
photographer makes in the field and the page develops the frame they would
have got, names the lessons, files the frame under a category and tags it
against three competition rulebooks. Progress saves to localStorage.

It began on 2026-09-13 as *a new photo safari tutorial game based on ideas
from several existing repos* (Dermot's direction), after a prototype made
elsewhere with its own limits. It is not a port of that prototype.

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
- **The verdict is words; a photograph comes only after it.** Ten stops
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
- Eligibility, by rulebook: the camera club takes anything that is the
  entrant's own work; the world nature awards bar captive animals and
  baiting but not built environments, feral animals or gardens; the
  federation's nature section bars any human element except a scientific
  ring, plus cultivated plants, feral and domestic animals and baiting; its
  wildlife section adds wild and free. Recognisable people and mating
  sequences are not published at all.

Change a threshold only when the field notes change; say which note.

**The numbers are one camera's** (Dermot, 2026-09-13: *my tutorial
instructions are specific to my own range of Nikon cameras and might not
generalize*). The game says so on the Camera card (`CAMERA.caveat`) and in
the README rather than pretending otherwise: the thresholds belong to the
author's older Nikon crop-sensor body, the decisions carry over, and a
reader with another camera checks the thresholds against their own. Keep
that caveat visible; don't generalise a number to make it sound universal,
and where a term is Nikon's (*picture control*, *vivid*) say what other
makers call it.

## Adding a stop

Add an entry to `ENCOUNTERS` (light, subject, frame, presences, examine,
enter, decisions, note, afterword), add any new examinables to `EXAMINE`
and any new finding the engine raises to `LESSONS`, and list the stop in
a route in `ROUTES` (today's drive picks from the whole pool by itself).
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

Then `node tools/check.js`: it develops every combination of the stop's
options, requires at least one to be a keeper, holds every finding to a
lesson and every tag to a rulebook, and refuses a decision with a single
option. Prose is general-audience, in the
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
