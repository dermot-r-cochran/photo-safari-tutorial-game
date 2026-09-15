# Photo Safari

A tutorial game about wildlife photography, in one file. Open
`index.html` in any browser — no server, no build, no dependencies, no
network — or play it as served from `main` at
https://dermot-r-cochran.github.io/photo-safari-tutorial-game/ , which is
the same file and nothing else. Progress saves to that browser's
localStorage only, per drive.

## What it is

You are in a vehicle on the Mara at first light with a crop-sensor DSLR
and an 18–400 mm zoom, and something is standing on a termite mound
against the sun. The game puts to you the choices a photographer makes
in the field — what to expose for, which mode, how tight, whether to
wait for the cloud, whether to let the boatman throw the fish — and then
develops the frame you would have got: sharp or blurred, clean or noisy,
a keeper or one for the folder, and, if a keeper, which competitions it
can enter.

The frame is a verdict in words, the way a contact sheet is a set of
decisions, and every verdict names the lesson behind it. Every step is a
real choice — two or three settings or framings, each with a cost — and
when a frame is one for the folder — kept, not shown — you can try the
stop again before driving on; the contact sheet keeps the last frame you
pressed and scores the drive like golf: every press of the shutter is a
stroke, a keeper first time is the hole in one, and par is a keeper first
time at every stop. After the
verdict, at twelve of the stops, the page shows the frame the stop was
learned on — the author's own photograph from that outing — as a
comparison, never as the answer: your choices may have got you a better
frame, or a worse one, and the words say which. At one stop so far the
frame that was got wrong sits beside the one that was got right, the
same scenario two days apart, and the captions say what changed.

This is written by a novice for other novices and for younger
photographers. Nothing in it is expert opinion. Every lesson was
learned by getting it wrong first, and the photographs are the evidence.

**The camera is the author's own**, and the numbers are its numbers: an
older Nikon crop-sensor DSLR, 14 megapixels, with an 18–400 mm zoom and
a 70 mm macro. The lessons were learned on that body's thresholds —
where its ISO gets noisy, where its pixels diffract, that it has a
mirror and no lock-up for it — and they may not carry to yours. A
newer body is cleaner at high ISO, may have no mirror at all, and may
call the vivid setting a picture style or a film simulation. The
decisions generalise; the thresholds are the ones to check against your
own camera's manual and your own frames.

Three drives:

- **The safari drive** — eleven stops on the Mara and at Amboseli, first
  light to dusk. A topi against the sunrise, a young lion on a vehicle
  track, a roller in eight colours, vultures at a kill, a hyena nobody
  can find, elephants under Kilimanjaro at noon, a fish eagle and a
  boatman with a bucket, a giraffe at a rail, a courting pair, a lion
  in the last of the light.
- **Home ground** — a beech wood, an island and a hill near home, the
  week after, on foot: the one mode the safari never needed, a ringed
  gull, a goat that nobody owns.
- **Today's drive** — six stops picked from the whole pool by the date,
  in the order of the day. The same day gives everyone the same drive;
  tomorrow is different.

## What it teaches

The lessons are the author's own field notes and site rules, written
into the game as they were learned:

- **The three modes.** *M for macro, A for walking around, S for
  shooting birds* — and why: aperture priority lengthens the shutter
  once Auto ISO hits its cap, which is fine for a lion and fatal for a
  mushroom in a breeze; shutter priority is the only mode that promises
  1/2000 s to a landing vulture; manual leaves a frame dark rather than
  blurred, and a dark raw file is recoverable.
- **Exposure, sharpness, depth and noise**, from a small model of a real
  camera: a 14-megapixel crop sensor with 5-micron pixels, so
  diffraction softens from f/11 and is plain by f/16; ISO 400 clean, 800
  fine, 1600 showing chroma noise that a vivid picture control amplifies;
  depth of field about a millimetre at 1:1 and f/8; mirror slap between
  1/15 s and 1/2 s on a support unless live view keeps the mirror up.
- **The vivid dial.** The house look for scenery, and the wrong setting
  for a white bird in hard light or a subject that is already saturated.
- **What is in the frame besides the subject.** A vehicle track, a
  balloon, a feeding rail, three people on a far vehicle, a numbered leg
  ring — and what each does to the frame's category and to its
  competition eligibility, which are different questions.
- **The rulebooks**, which disagree with each other on purpose. The
  game tags every keeper with the competitions it could enter, by the
  short names the author's portfolio uses: **DCC**, Dublin Camera Club's
  open competition (any subject, wholly your own work); **WNPA**, the
  World Nature Photography Awards (no captive animals, no baiting, but
  built environments and feral animals allowed); and **IPF-Nature** and
  **IPF-Wildlife**, the Irish Photographic Federation's nature and
  wildlife sections under the FIAP definitions (no human element at all,
  except a scientific ring; no feral animals; wild and free for the
  wildlife section). Each tag expands to its full name on the page, and
  each rulebook card links to the rules themselves — the cards are one
  reader's summary written for a game, not the rules. A frame that is
  not a keeper carries no tags: it is entered nowhere, so what the
  rulebooks would have said of it is beside the point.
- **Ethics that the picture cannot show.** A baited eagle, a captive
  giraffe, a mating pair, a driver asked to leave the track, a
  recognisable stranger — and the note each frame must carry, or the
  folder it must stay in.
- **The note.** Never describe what is visible; add what is not. Except
  when the subject genuinely fails to read, and then the note may say
  where to look.

## How it is built

The whole game is `index.html`. Everything the player can meet lives in
seven data structures at the top of its script — `CAMERA`, `PRESETS`,
`ENCOUNTERS`, `EXAMINE`, `RULEBOOKS`, `LESSONS`, `ROUTES` — and the
engine below them never needs editing to add a stop. A stop is a scene
(the light as an exposure value, the subject's motion, distance and
depth, what else is in the frame), two or three decisions with their
options, a note and an afterword. An option may name a settings preset,
set individual fields, and override the subject, light or frame. The
engine assembles the choices, resolves the exposure the camera would
actually make, and raises findings — each one a key into `LESSONS`.

`tools/check.js` runs the model without a browser: every stop under
every combination of its options, every finding a real lesson, every tag
a real rulebook, every drive resolving, today's drive deterministic. It
is what CI runs, and it installs nothing.

The engine descends from the author's one-file quest engine,
[four-islands-quest](https://github.com/dermot-r-cochran/four-islands-quest):
the same transcript, the same look-at row, the same structural saves,
the same daily seed. The situations, settings and rules come from the
author's photography portfolio and its field notes. The Grok prototype
that prompted this one is a different program with its own limits; this
is not a port of it.

## Licence

The engine is MIT (`LICENSE`); the tutorial content — the stops, the
lessons, the notes — is CC BY 4.0 (`CONTENT-LICENSE.md`); the
photographs are CC BY-NC-ND 4.0 (`LICENSE-PHOTOS.md`), the portfolio's
own terms. Fork the engine and write your own drive; a drive you write
is yours alone, and a fork that drops the pictures loses nothing the
game needs.
