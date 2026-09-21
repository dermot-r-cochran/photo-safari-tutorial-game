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
  Standard on a landscape is *flat* only in kind light at a clean ISO —
  in harsh light or at ISO 1600 it is the right call, the style guide's
  third reason to switch, so the finding is gated off there (2026-09-20).
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

- **Two bodies, one lens on each, chosen before the day** (Dermot's
  direction, 2026-09-20: *allowed to choose the camera body and lens
  combination at each stop, but no swapping or changing lenses in the
  field; the main camera and companion camera are chosen before each
  drive, walk or hide starts* — the field notes' own two-body split, "no
  lens changes in the wet and no dust on either sensor"; the same day,
  verbatim: *This does not count against the number of questions or
  decisions at each stop*, and the four combinations — *DSLR crop sensor
  plus 18-400mm autofocus, Mirrorless crop sensor plus 150-500mm auto
  tracking, DSLR crop sensor plus 70mm macro, DSLR crop sensor plus 50mm
  prime autofocus*). `BODIES` holds the DSLR and the mirrorless; `KITS`
  those four combinations, each with the label the page shows (the
  75–240 stays on the shelf, as the notes have it);
  each route carries a default pair on different bodies, and the player
  picks their own on the *Before you set out* card — which opens the
  route, with its title and line, before the first scene is written
  (Dermot, 2026-09-21: *with the choice of location but before the
  description of the first scene*); setting out is what opens the first
  stop — then which camera is in hand at each stop — a choice beside the questions, never one of
  them, recorded in the transcript and on the frame. The lens on the
  camera in hand gives what it can of the focal length an option reaches
  for (`reach`, `wideEnd`, and `tiny` at half the size or less) and
  focuses as close as it does (`notMacro`, at `CAMERA.closeFocus`, about
  1:4, for any lens not marked `macro`); the body decides whether there
  is a mirror to thump. Presets and options name a focal length, never a
  lens. A stop's `kit` is the one it was learned on (the zoom unless it
  says); the check develops every path on every kit, requires a keeper on
  the stop's own kit and on one of the two its route carries, and holds
  every route's pair to two bodies. What is *not* modelled, because no
  note has measured it: the mirrorless's high-ISO advantage (it scores on
  the DSLR's thresholds, and the caveat says so) and whether the macro
  and the 150–500 are stabilised (unset scores as the zoom does; the 50
  mm and the 75–240 are marked unstabilised from the notes).

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
enter, decisions, note, afterword, and `kit` if it was learned on
something other than the zoom), add any new examinables to `EXAMINE`
and any new finding the engine raises to `LESSONS`, and list the stop in
a route in `ROUTES` (today's drive picks from the safari route's stops by
itself, so the day stays one day; home ground is its own walk). **An
arranged encounter is not a stop on a game drive** (Dermot's direction,
2026-09-20: *the fishing eagle tutorial stop should not sit in the middle
of a normal game drive and neither should the giraffe centre*): the boat
on Lake Naivasha and the Giraffe Centre are the route `arranged`, *Off the
drive*, between the safari day and home ground, and out of today's pool.
A new stop where the animal was fed, called or fenced goes there, not on
the safari. Every stop is on exactly one route of its own; the check
fails a stop on none or on two.
**A stop asks two or three questions, each with two to four answers**
(Dermot's ruling, 2026-09-20, verbatim: *Two or three questions, each
with two to four options* — settling the day's sequence, which began
from his 2026-09-19 *max two questions with three options each for each
stop* and his 2026-09-13 *always have at least two or three choices for
the camera settings at each step*). The check fails a path with fewer
than two questions or more than three, and a question with fewer than two
answers or more than four. Inside those bounds the third question and the
fourth answer are ordinary, not exceptional (Dermot, the same day: *I did
mean generally where the lesson would benefit or the extra choices look
reasonable*) — add one wherever it teaches something or is a choice a
photographer at that stop would plausibly have had, as long as each
alternative still costs something real in the model. The first fourth
answer is the hyena's, the dawn's manual numbers left on the dial beside
the three it already had; on his *Approved* the same day the 19 September
cut's material came back where it fitted — the lion's ISO as a third
question and its off-track framing as a fourth answer, the topi's wide
end as a fourth answer, Kilimanjaro's camera as a third question with the
noon manual miss as its fourth answer, and the woodland's Auto-ISO tripod
run as a fourth answer; the minimum gave the dusk lion its second
question the same day — the second lion the card already
shows, and what depth costs at dusk (f/16 on the beanbag lands the
shutter where the mirror's thump reaches the frame). **The second question may vary with
the answer to the first** (Dermot, 2026-09-20): an option in the first
decision may carry `then`, a question of its own with the same shape,
asked next in place of the stop's second decision; options without one
fall through to it, and a stop whose second decision is only ever reached
by `then` need not list one. `decisionsFor(enc, choices)` is the one
place the path is worked out — the renderer, `assemble` and the check's
`combos` all go through it, and a `chosen` history entry carries the
choices before it so a transcript replays the question as it was asked.
The first branch is Naivasha (Dermot, 2026-09-20: *Naivasha branch
accepted*): after *Ask him not to*, the second question is the wait's
own — a bird that sits is a different problem from one coming down on
a fish — while the throw paths keep the stop's shared camera question.
The second is the balloon: with the balloon panned off, the sky is the
picture and the second question is the dial, which is where *Flatter
than the house look* is reached. The check also holds the walk to its
shape on a made-up stop. Every lesson is reachable since 2026-09-20 —
*Overexposed* by the hyena's dawn manual numbers left on the dial, a stop
bright at EV 14, its fourth camera answer — and the check's never-raised
warning should stay at zero; a lesson allowed to sit unreachable is a
decision to retire it. Each alternative costs something real in the model —
ISO spent on a speed the subject did not need, diffraction bought for
depth the distance already had, a hand's width of focus at three metres —
so the verdict has something to say about it. Where a stop had three
questions, the one whose lesson another stop already carries went (the
topi's lens, the lion's ISO and its off-track ask, the mountain's camera);
where a question had two answers, a third was written from the same
outing with its own cost (a meter split between sky and subject, the
`halfway` lesson; a `neutral` picture control, which decides nothing and
costs a raw pass; a shutter floor raised halfway to the birds setting; a
stranger's child laughing; the lioness walking; the boat and the bucket
kept in the frame; the wide end with the subject a dot). The woodland's
three answers carry four lessons between them, so that none of the mode,
wind, mirror-slap and macro-diffraction lessons became unreachable: the
aperture-priority option pins ISO 100 so A runs the shutter out to a
second and the caps move, and the f/22 option is focused through the
finder, so the mirror's thump lands beside the diffraction.

**A stop is tried again until it yields a keeper, or abandoned at a
price** (Dermot's direction, 2026-09-19: *do not allow a drive on until
lesson is learnt or else count it as 10 shots if that stop is
abandoned*, replacing the 2026-09-13 *Try again* beside *Drive on*).
After a verdict that is not a keeper the page offers *Try the stop
again* and *Abandon the stop*, and nothing else; *Drive on* appears only
from a keeper. A `retry` history entry winds the stop back to its first
decision, the earlier frame stays in the transcript as part of the
record, and the contact sheet and the endcard count only the last frame
pressed at each stop (`latestFrames`). An `abandon` entry moves the
drive on without a keeper: the stop's line reads *abandoned after 2,
counted as 10*, and `strokesAt` scores it at `ABANDON.strokes` (ten, in
the data section beside `RETRY`) or the presses made there if more. The
check holds the price to more than one stroke and the label to naming
it.

**Starting a route again is the next day on it, and the day's card is
kept** (Dermot, 2026-09-19: *The Restart Drive button should be Next
Day, Tomorrow or similar*, then, asked whether the day is cleared or
archived, *Option 1 agreed*: a card per day, kept; the transcript not).
The About card's button reads *Next day on this drive* (or *walk*, the
route's own noun). On confirming, `archiveDay` writes the day's record —
the date, the scorecard line and each stop's line with its category and
tags, never the transcript — to the front of that route's past days
(`saveKey + ".days"`, newest first, `NEXT_DAY.keep` of them), and only
if a shutter was pressed; then the route's state is cleared. *Past days*
renders under the contact sheet as one `<details>` a day, the date and
the card on the summary and the stops' lines inside. The words are
`NEXT_DAY` in the data section beside `RETRY` and `ABANDON`; the check
holds the label and confirmation to `{noun}`, the heading to existing
and the keep to at least one.

**The contact sheet is a golf scorecard** (Dermot, 2026-09-13: *the game
scoring is a bit like golf; a keeper on the first shot is a bit like a
hole-in-one*). Every press of the shutter at a stop is a stroke, retries
included; the sheet's top line and the endcard give strokes over stops
played against a par of one a stop, and the count of keepers first time;
each stop's line reads *keeper first time*, *keeper in 3*, *folder
after 2* (a stop still open) or *abandoned after 2, counted as 10*. The words live in `SCORE` in the data section; the arithmetic
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
