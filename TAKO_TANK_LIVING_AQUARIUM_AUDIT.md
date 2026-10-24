# Tako Tank: Living Aquarium Audit

**Branch** `claude/our-tank-game-design-xhmavw`, from build **v329** to **v330**. Phase A (audit), B (the smallest visible behavior changes), C (capacity, long-term economy, the 30-day experience) and the plan for D (a real iPhone) are below. No physical iPhone and no real player took part; everything is read from the code, the unit tests, headless-browser drills and simulations that play the real rules. Measured numbers say **measured**; anything else is read from code. Implemented changes (§4) are separate from proposals (§9).

The design principle under test: *what a player changes today should create something to discover tomorrow.* The audit's short answer: the state for that already exists (favorites from real time spent, holdfast memory, octopus familiarity, keepsakes, journals, bonds), but three links were missing or random: friendships did not come from time together, a fish's first favorite came from a trait table rather than from where it went, and the most personal events (friends, pairs, tricks, parenthood) never reached the animal's own journal or were credited to the wrong person. Those links are now in (§4). Capacity is the one system that works against the principle (§5.1): every simulated household fills the tank to the hard count by day 60 and never again has room for a turtle.


---
# V333 update: the audit decisions, measured

What was asked (the V330 decisions): solve capacity before anything else, with a simulated comparison and no production change until a model is approved; protect attachment (a rehoming proposal); keep life stories; make habitat consequences visible; fix the octopus palette collision; verify synchronization; triage the failing drills; no new scope. Builds v331–v333 on the same branch. The economy is untouched. Everything below is from code, unit tests, headless drills and the household simulation; nothing was run on a physical iPhone.

## A. Capacity: the models, the comparison, the recommendation

**How the models were tested.** The rules carry one switch, `CAP` (`rules.js`, next to `capacity`), with production defaults equal to v330. Every gate goes through it (`capacityOf`, `fryRoom`, `sanctCalm`, `crowdOf`), so the simulation flips the switch and plays the real rules. The household simulation gained the turtle route a prepared player takes (the sanctuary's ledge and grass at level 7, saving from level 7, the first turtle as soon as the shop allows, release when grown), a `LATE` route (a player who fills the tank first and only then wants a turtle), and the report's measures (wellbeing every evening, days over 85 % load, most animals at once, births the rules held back, refusals, sales). Four households × 6 seeds × 120 days per model; medians.

| Model | What it is |
|---|---|
| **v330** | today: count gate (28 places, +4 for births), spawning stops above 80 % load, a turtle wants the tank ≤ 60 % full |
| **room** | v330 plus room-first breeding: spawning stops above 70 %, a fry offer only if the tank stays under 85 % |
| **sanctuary** | room plus a **four-place sanctuary allowance only a turtle may use** once the sanctuary goal is done (one turtle), the allowance counted in the load too while the turtle is here, and the sanctuary's turtle content in a tank up to 85 % full like the fish (not only 60 %) |
| **general** | room plus **four more places for anything** once the sanctuary goal is done |
| **+2 per release** | each of the first two releases adds two places, tested on top of sanctuary and general |

**A.1 A player who prepares (saves from level 7)**

| Household | Model | First turtle (tanks) | Days after level 8 | Turtle comfortable at adoption | Released by day 120 |
|---|---|---|---|---|---|
| 1 casual | v330 | 6/6 | 0 | 0/6 | 6/6 |
| 1 casual | sanctuary | 6/6 | 0.6 | **5/6** | 6/6 |
| 1 regular | v330 | 6/6 | 3.5 | 0/6 | 6/6 |
| 1 regular | sanctuary | 6/6 | 2.5 | 2/6 (the goal was done in 2 tanks) | 6/6 |
| 1 engaged | v330 | 6/6 | 4.0 | 0/6 | 6/6 |
| 1 engaged | sanctuary | 6/6 | 3.8 | **6/6** | 6/6 |
| 4 mixed | v330 | 6/6 | 5.7 | 0/6 | 6/6 |
| 4 mixed | sanctuary | 6/6 | 5.7 | 3/6 | 6/6 |

A saver adopts in every model, within a week of level 8: the count gate is not what stops a prepared player. What v330 cannot give is a **comfortable** turtle: its "room to swim" want (≤ 60 %) is never met in a played tank (87 % load is where every tank settles). Under the sanctuary model the turtle is content wherever the sanctuary goal was done (turtle wellbeing 93 engaged vs 79; 53 casual vs 49).

**A.2 A player who fills the tank first (LATE route)**

| Household | v330: adopted | sanctuary: adopted (day, days after level 8) | Refusals ("no room") in v330 |
|---|---|---|---|
| 1 casual | **0/6** | 3/6 (day 93, +33) | 32 |
| 1 regular | **0/6** | 2/6 (day 116, +69) | 106 |
| 1 engaged | **0/6** | 3/6 (day 41, +16) | 227 |
| 4 mixed | **0/6** | **6/6** (day 64, +42) | 424 |

This is the progression audit's finding again: a normally played tank is count-full by day 60 and v330 refuses the turtle every time. The sanctuary allowance opens the door, **but only where the sanctuary goal was finished** (2–3 of 6 solo tanks, 6 of 6 shared). The goal, not the places, is now the limiter: it is only offered while no other goal is active, so a tank that is on "Three generations" at level 7 never sees it. **The allowance must ship with the goal made reachable** (a fourth card at level 7, or a nudge), otherwise it helps only tanks that happen to be between goals.

**A.3 Load, wellbeing, overcrowding, births (day 120, the saver route, honest shop that fills every place the model gives)**

| Household | Model | Animals d60/90/120 | Load d120 | Mean wellbeing | Animals under 60 | Days over 85 % | Most at once | Born here | Births held back |
|---|---|---|---|---|---|---|---|---|---|
| 1 casual | v330 | 26/28/28 | 87 % | 58.7 | 47 % | 67 | 28 | 11 | 75 |
| 1 casual | sanctuary | 22/28/28 | 87 % | 60.2 | 53 % | 47 | 29 | 9 | 81 |
| 1 casual | sanctuary +2/release | 22/30/30 | 87 % | 61.6 | 48 % | 36 | 32 | 10 | 79 |
| 1 casual | general +2/release | 28/31/31 | 83 % | 59.5 | 47 % | 11 | 36 | 11 | 73 |
| 1 engaged | v330 | 28/28/28 | 87 % | 77.7 | 3 % | 91 | 28 | 8 | 96 |
| 1 engaged | sanctuary | 28/28/28 | 87 % | 80.3 | 4 % | 82 | 29 | 8 | 99 |
| 1 engaged | sanctuary +2/release | 30/30/30 | 87 % | 80.6 | 4 % | 80 | 31 | 8 | 100 |
| 1 engaged | general +2/release | 34/34/34 | 87 % | 77.4 | 3 % | 85 | 34 | 8 | 97 |
| 4 mixed | v330 | 28/29/32 | 125 % | 68.8 | 29 % | 93 | 32 | 12 | 86 |
| 4 mixed | sanctuary | 28/31/30 | 115 % | 67.3 | 26 % | 89 | 32 | 10 | 80 |
| 4 mixed | sanctuary +2/release | 30/30/34 | 118 % | 67.7 | 24 % | 89 | 34 | 10 | 84 |
| 4 mixed | general +2/release | 32/35/35 | 116 % | 67.5 | 22 % | 89 | 38 | 12 | 85 |

What the numbers say:
- **Every place a model adds gets filled**, and the tank goes back to 87 % load. "+2 per release" and "general +4" are not comfort, they are two to four more animals (most at once 32–38). They do not recreate crowding beyond today's 87 %, but they do not relieve it either, and "general" is the loophole the decisions feared (34 fish, no turtle needed). **Not recommended.**
- **The sanctuary allowance adds at most one animal** (28 → 29), and that one is the turtle: no loophole. Its effect is the turtle's own comfort and an open door for the late adopter.
- **Room-first breeding changes little**: tanks sit above 80 % most of the time in every model, so births are held back 75–100 times per 120 days either way; born-here counts stay 8–12. Its one visible effect is a lower load on the way up (76–81 % at day 60 instead of 93–99 %). Low risk; it does not prevent crowding by itself.
- **Wellbeing is not a capacity story.** The share of animals under 60 is 3–4 % in an engaged tank and 47–53 % in a casual one *in every model*: it comes from hunger and unmet needs, not from the count.
- **Shared tanks are overloaded in every model** (115–125 % at day 120, 30–35 animals): four caretakers' octopuses (1.5 load each), births taking the four extra birth places, and purchases filling the count on top. No tested model touches this. It needs its own rule (below).
- The 102 tanks' first-turtle adoption rate across all households, saver route: v330 100 %, sanctuary 100 %; late route: v330 0 %, sanctuary 58 % (14 of 24), 100 % where the sanctuary goal was done.
- Performance: the most animals at once rose from 28 to 29 under the recommended model (34–38 under the rejected ones); the full-tank measurement in §6 of the main audit (28 animals, under 1 ms per frame of simulation headless) covers it.

**A.4 Recommendation (not implemented; the switch stays at v330 until approved)**
1. **Ship the sanctuary allowance** (`CAP.sanct = 'turtle'`): four places only a turtle may take once the sanctuary goal is done, one turtle, counted in the load while it is here, and the sanctuary's turtle content up to 85 % like the fish. Measured: adoption possible in a count-full tank, a content turtle in prepared tanks, one extra animal at most.
2. **Make the sanctuary goal reachable at level 7**: offer it as a fourth card while it is available, or let the level-7 dialog take it directly. Measured limiter of 1.
3. **Room-first breeding** (`CAP.breed = 'room'`): low risk, slightly gentler climb, keep it.
4. **Do not add general places or +2 per release**: they fill with fish and buy nothing for wellbeing (A.3).
5. **For shared tanks, a separate rule to design and measure next**: births use the four birth places only while the load is under 85 %, and a visitor that stays needs a free place; and consider counting each caretaker's own octopus against the tank's places only above two octopuses. These are proposals; not simulated yet.
6. The 120-shell sanctuary adoption is untouched and still applies.

## B. Animal attachment and rehoming (proposal, not implemented)
The baby-gift path (`send`) already moves a bred animal to a friend's tank with its name, seed, genes, traits, parents and generation (`lineOf`), as a wrapped gift that arrives within the hour. Extending it to adults is mostly a matter of what travels and who may do it:
- **What travels**: the whole fish record minus tank-bound links: keep `name, species, kind, seed, palette, sex, born, stage, traits, raisedAs, genes, gen, parents, bornHere, story, disc, found, tricks, skill, toys, bond` (trust is per person, so the sender's bond travels only if the sender is also in the other tank); drop `spotId, haunt, know, pal, mate, partner, home, mem.fam` (places and friends belong to the old tank) but write one story line each way ("Moved to X's tank; left Pip behind" / "Came from Y's tank, where it was best friends with Pip"). The old tank keeps a memorial-like record ("rehomed to …") and the journal line.
- **Who**: the animal's caretaker (`owner`, or anyone for an unowned animal) proposes; the receiving tank's caretaker accepts (the gift already needs opening); either side can decline; nothing is sold.
- **One tank per group**: a move is only to a tank the sender is *not* in (the gift path's rule). A caretaker in exactly one tank cannot "move" anything; the feature only exists between friends' tanks, which is the social design, not a second aquarium.
- **Room**: the receiving tank's count and load gates apply as for a purchase; a turtle moves only into a prepared sanctuary.
- **Why it matters for capacity**: it is the one way to make room that does not feel like selling an animal you know. The simulation sells 0–10 animals per 120 days only under goal pressure; a real player's reluctance to sell is the attachment the brief protects.
- **Risks**: duplicates on a retried send (the gift path's idempotency covers it), an animal mid-pregnancy or guarding eggs (refuse), a rival or best friend left behind (the loss memory handles it as a departure).

## C. Life stories: implemented (v333)
- Every journal line carries the animals it is about: `aboutOf(event)` reads the ids the event already has (story, arrival, hatch, birth, pair, died, discovery, milestone, puzzle, crab…). On the solo phone it is a field on the entry; on the server it is a new `journal.about` column (migrated with `ALTER TABLE … ADD COLUMN`, old rows null), sent in the snapshot and in live lines.
- The card's Journal tab shows **Its life**, a compact permanent summary from timestamps that are never trimmed (came home or hatched, favorite spot, best friend, pair, partner, parent, trust, tricks; by tank day), then **Its story**: its own lines from the tank journal merged with the kept 14-line story, newest first, duplicates folded, up to 30, with a count of older lines.
- Growth is bounded: the solo journal keeps 300 lines (was 80); the server keeps its 3,000 per tank; `story` stays at 14; the summary reads existing fields. Old journals have no `about` and show the summary plus the story, as before.

## D. Habitat consequences on the Health screen: implemented (v333)
`habitatNotes()` now leads with what the animals actually did, from state the simulation wrote: "Pip has started resting by the reef cave." (a favorite from time spent, in the last 7 days), "Pip and Quill regularly share the reef cave.", "Sol holds on to the sea fan most of all." (the holdfast held longest), "Ink spends most evenings near the sea grass." (an octopus habit from its visits), "Mo is still looking for its old clay pot." (a removed favorite, two days). Then the offers (dens, holdfasts, climbing). Up to six lines, in a small panel under the wellbeing average on the Health screen; no new tab. Nothing is invented: every line has a rule test behind it.

## E. Bug fixes (v331–v333)
- **Octopus palette collision**: `f.palette` holds the color; `norm()` moves old integers from `pal` and leaves a fish id (a friendship) alone; every reader switched (rules, species, thumbnails, cards, the 3D manager, memorials); a test covers migration, the den decision and the first-fish picks.
- **Play works as it says** (v332): a toy go reports who joined and how far along they are ("Misty and Ann joined in · ball 1 of 5"), a repeat inside 20 s says when it counts again (it was a silent 45 s drop), the Toy box shows who is learning, hide-and-seek lists only places the octopus can search (a starfish hides nothing) and shows its rest and payout before you tap, trick buttons name the trick and their rest, hermit crabs are no longer offered tricks they cannot perform, the hide and puzzle tiles and games pick the same octopus, failure reasons are plain, the day-2 tip names only open toys, a short finger drag counts and a crab is "along the sand".
- **The road ahead** (v331): every level tappable, cards from the shop tables (level 5 had promised the giant clam).
- **Octopus partners**: the seek lasts long enough to arrive, the pair settles side by side for half a minute now and then, the pair is exempt from the level rest cap, and a partner's level does not count as crowded. Measured in `bonds_check`: partners within reach 13 % of a six-minute visit (was 2–3 %), two arm-touches, 288 twined frames.

## F. Multiplayer: verified headless, not on phones
`tools/sync_check.mjs` runs the real server in memory with a full level-8 tank (28 animals: two octopuses, four seahorses, three crabs, a turtle, eighteen fish) on two, then three, headless phones:
- exactly one phone leads; the follower receives the full tank (28 entries) in every snapshot, with **both octopus poses whole (29 values; the server used to cut them at 16)**;
- the snapshot of a full tank is **2,475 bytes on the wire** (rounded numbers): under the old 4 KB cap after all. The earlier 4,230-byte figure was an unrounded estimate; the 12 KB cap stays as margin (a 40-animal tank is about 3.6 KB);
- positions agree (median 0.02 units, 90th percentile 0.04); a purchase on one phone is in the other's tank within 5 s; an animal event on one is in the other's journal within 5 s;
- four seconds without snapshots: the follower's animals keep moving on their own (24 of 28 moved) and fall back in step within 3 s of snapshots resuming (median 0.09);
- a phone joining late follows and gets full snapshots within 5 s; when the leader leaves, another phone takes over within 10 s and the rest receive its snapshots.
- Finding: the lead hands over by the fps rule (a leader under 18 fps yields to a phone reporting over 30); a phone that has not reported yet counts as 60, so a fresh phone can take the lead from a slow one. Harmless, but on real phones it means the newest phone often leads. Not changed.
- Shared purchases and animal events are server-applied actions with idempotency keys, unchanged.
- **Still to do on real iPhones** (not claimed): two phones side by side for 3 minutes, a full tank on both, screen lock on the leader, airplane-mode reconnection, the frame-rate fields in `TAKO_TANK_IPHONE_PLAYTEST.md`.

## G. The failing drills, triaged
| Drill | Cause | Verdict | What changed |
|---|---|---|---|
| `sell_check` | "Health" row was renamed "Animal health" in the UI audit (commit 4bfe108); the test's regex was case-sensitive | outdated test | checks the Animal health row and its Health button; **passes** |
| `care_sync` | Care's "Needs you / Later" headings and "Clean the glass" rows gave way to one Tank upkeep row (commit 209847a); the drill read the old layout, so its "updates by itself" check could never pass. The live path itself (server broadcast to all, `state` → `syncWorld` → `ui.refresh`) was intact | outdated test | reads the current layout; now also checks the dirty state **before** the other phone acts, and seeds the row's mirrored meters; **passes**: the watching phone's Care updates by itself when another caretaker wipes, changes water and feeds |
| `bonds_check` | real behavior: the partner seek gave up after 6 s, nothing held the pair together, and two octopus changes of Oct 24 (level spreading, rest cap) pushed partners apart | product bug | fixed (E); 13 % together, **passes** (a final headless screenshot timeout is no longer fatal) |

Does the Care sheet genuinely update on a second phone? Yes: measured in `care_sync` from a dirty state to "All clean · next: wipe the glass in about 3 days" on the watching phone with no tap, and the fish's hunger and an owned seahorse's meal likewise.

## G2. Menus and popups: the visual pass (v334)
Every surface was captured headless at iPhone size (`tools/shots_polish.mjs`: welcome, Care To do and Play, Feed, Health, Shop and its categories, an item preview, Themes, Crew Friends/Animals/Journal, Our Tank and the road, the animal card and its tabs, a level dialog, a chooser, a toast, a coach tip, the bell) and read. No redesign; the sheets share the one glass material and spacing already. What was off and is fixed: the Toy box tiles carried a four-line sentence each (now "For fish, the octopus, turtles, crabs", with the full sentence as the tile's tooltip and in the toast when a toy is picked up); the Shop card's "carries sapphire" tag broke across two lines inside the price (now a small one-line chip under the price); the hide tile's line was cut off by its tile (the payout moved to the chooser's text); the Health habitat panel is titled by what it shows ("How they use the habitat" when there is usage, "What the habitat offers" otherwise). Everything else read cleanly at 390 px: Care, Feed, Health, the Shop grid, the preview, the level dialog, the chooser, the card.

## G3. Play, seahorse, bottle, menus and the loop (v335)
What the owner reported, what was found, and what changed. Verified headless (Chromium at iPhone size); nothing here has been seen on a phone.

**Twist cube.** The octopus used to carry the cube like any held thing: it could take a while to come, and the cube sat partly inside the mantle. Now (`toys.js` `stepCube`) the cube is a hold cycle: *free* → the octopus comes straight to it → *grab* (0.7 s, the cube lerps to a point in front of the arms, never inside the body) → *hold* (6–13 s: it turns the cube over and twists the faces, arm tips working at it) → *put* (0.9 s, set down on the sand in front) → *rest* (2.5–5.5 s) → picked up again, up to three cycles, then it is done with it. `tools/toys_check2.mjs` measures a run: phases `free → grab → hold → put → rest → free → grab → …`, picked up 3 times, nearest body-to-cube distance 0.85 units over 463 held frames (0 frames inside), an arm tip within 0.04 of the cube.

**Hitching hoop.** The old hoop hung where tapped and nothing used it, because a seahorse re-hitched its own stem before the chance to take the hoop ever fired. Now the hoop is a real holdfast (`type:'hoop'`, with a stem and lean like a plant): a seahorse within reach wants it (`hoopWant`), lets go of its stem first, swims over, curls its tail round the ring and sways with it. The hoop is draggable: hold it and move, and the hitched seahorse rides along (`moveHoop`; drill: dragged across the tank, seahorse x −1.9 with the hoop at −1.59, still hitched). The Play tile and the toy text in `rules.js` now say exactly this.

**The whitish pad on the seahorse.** Three causes, all patched in `species.js`/`fish3d.js`: the brood pouch voxels were mixed 50–80 % toward near-white and grew in from a rough step (that was the pad that "spreads"); the holdfast tint was fed sRGB values straight into linear instance colors (a pale wash); and the glow (greeting) was composited over the tint rather than under it. The pouch is now a 12–26 % belly tone that eases in, the tint is converted to linear before it is applied, and glow/tint are re-applied from the base color. Frozen close-ups (`shot_sea2`): a hitched seahorse at full tint reads olive on green grass, the full pouch is a faint belly bulge, no white pad.

**Message in a bottle.** Two defects: the letter's paper was fading in from opacity 0 and could sit faint when the animation started late, and the handwriting was being overridden by the modal's general paragraph rule (`#modal .box p … !important`), so it rendered as pale blue system text on cream. Now the paper only drops into place (no fade), and the handwriting has its own `!important` rule (dark brown, the handwriting font). Screenshot `bottle_read2.png`: cream paper, dark text, readable.

**Menus, every one, re-read.** All 24 surfaces captured again. They share one material, spacing and type already; no redesign. Defects found and fixed: the chapter card, the first-time tab tip and the coach all pin to the top of the screen and were piling up (a tip over the chapter card on the animal card; the tip over the coach's title). Now a chapter card yields while a tip is up, and a tip yields while the coach is up (CSS, no timing changes; the Bell keeps the chapter either way).

**Making the loop clearer.** The loop is *care → health → pace → next level → what it opens*. Our Tank already explains it (rings, speed chip, objective, best next step, road). Two places did not: the welcome text now says it in one sentence ("Feed, clean and play: a happy tank levels up, and every level opens new animals, toys and habitats"), and Care's To do now carries one tappable line under its heading that ties today's chores to the consequence, e.g. "**Struggling** · levels up at ×0.5 · level 6 in about 10 days opens a bigger community ›", which opens Our Tank. The bands and speeds are the existing `HEALTH_BANDS`; nothing in the economy or the chores changed.

## G4. The Health screen, reworked (v336–v337)
Read top to bottom at phone size and rebuilt where it only counted things. The wellbeing card now leads with the verdict, then a tally of moods (2 unhappy · 2 unsettled · 2 content · 2 happy), then the formula in one small line. A new box, **What would help most**, aggregates the animals' unmet needs across the tank (the ones shared by most animals first) and each row goes where it is fixed: Feed, the right Shop category, or the animal's card for things the Shop does not sell (keep it apart, fewer animals). The Trouble tile opens **Who is not getting along**: grouped so two damselfish chasing four fish is one line, both sides named and tappable, the reason, and one line on what would help (cover of its kind). Animal rows that said "Missing 2 of its 3 needs" now name the needs. Verified headless: the tile, the lists, every tap target; tests and the play and profile drills pass.

## G5. Our Tank: the Collection becomes the Tank page (v338)
The second segment was a field-guide grab bag (goals, colors, bred, shown, species found). It is now **Tank**, the tank as a living community, built only from state the simulation already writes: the day and population; **Who lives here** by kind, each with its stage, time here, mood and closest bond; **Families** with eggs on the way (parents, carrier, days to hatch) and each brood under its parents, rare colors in gold, the remembered ones dimmed, with the family postcard share kept; **Getting along** (bonds: partners, best friends, who follows whom; and the grouped not-getting-along list from Health); **Who suits whom**, a grid of every kind in the tank against every other from the same social rules the animals live by, a tap on a square saying why; and **Comings and goings**, the arrivals, births, departures and releases newest first, the full history a tap away, and the remembered. Every name opens that animal's card. The old content is the third segment, **Guide**. Verified headless with a tank of 14 animals, a brood, eggs, a memorial and a release: every section renders, a resident tap opens its card, the history link lands on Tank history, a grid square's reason toasts. Drills `field_check` and `sell_check` updated for the names.

## H. Tests and remaining checks
- `npm test`: **95 of 95** suites (rule tests now include the capacity switch's gates, play feedback, trick eligibility, the shared picks, the palette migration, journal references, habitat usage notes, the road tables, friendships, favorites, milestones).
- Headless drills passing: `toys_check2` (cube cycle, hoop hitching and riding), `seahorse_check`, `road_check`, `play_check`, `story_check`, `friends_check`, `sync_check`, `sell_check`, `care_sync`, `bonds_check`, `profile_check`, `journal_check`, `adopt_check`, `fund_check`, `turtle_check`, `motion_check`.
- Simulations: 4 models × 4 households × 6 seeds × 120 days, three runs (saver, late, honest shop with releases).
- Not done: anything on a physical iPhone (§8 of the main audit and F above).

---
## 1. Current implementation, verified from code

**Habitat affordances** (`web/src/game/habitat.js`). Six numbers per decoration, 0..1: shelter, climb, hold, rest, forage, interest. Category defaults (`BY_CAT`) with per-type overrides (`OWN`: cave and pot shelter 1, ledge and coconut 0.9, live rock and rubble forage 0.9, sea fan hold 1, chest and bubbler interest 1). `suits(species, type)` scores a decoration for an animal kind (`WANTS` by kind). Read by: the shy dash for cover (`fishmgr.js` senseTick, `shelter ≥ 0.6`), and `foldHaunt` (time spent × fit). **Not read by anyone:** climb and hold (crab climbing uses a hard-coded category list; seahorse holdfasts come from `PLANTS` plus grip geometry), the octopus/seahorse/crab weight rows, and `habitatNotes()` (exported, called only by a tool). Wellbeing (`wellOf`, `needsChecklist`, `coverOf`) counts decorations by category or type, never by position or affordance.

**Where animals go.** Fish: `f.pick` in `fishmgr.js` (lines ~747–838): a seeded species patch, then identity rules in order (family spot, following a brave fish when shy, a lost companion's place, searching where a moved favorite was, the favorite `spotId` with probability 0.12 + 0.4·keep, the best friend, a seeded corner), then trait branches, then a crowding pass that moves a fish when two or more are already there. Seahorse: `pickHold` in `fish3d.js` weighs distance, familiarity (server `log.hitch`), curiosity for new stems, boldness, a moved place, nearby seahorses, the mate. Octopus: den, then its own `fav` point, then time-of-day habits, then liked places, then something never touched (`AWARE`). Crab: weighted choice over gather, shell, wander, favorite, climb, follow, dig, visit, rest.

**Favorites.** Two mechanisms competed for an ordinary fish's `spotId`: `discover()` (rules, two hours after arrival, the *first* decoration of the category its trait prefers: Shy→plants, Curious→structures, Lazy→wood, Playful→special, Brave→rocks) and `foldHaunt` (the lead phone's seconds near each decoration, every 180 s, faded, weighted by fit, kept to four; the fish switches when the top score is ≥ 4 and beats the current by 1.3 + 0.4·keep). Seahorse favorite: the holdfast held ≥ 120 s over ≥ 2 visits (`log.fav`). Octopus: `mem.fam` (12 places, k/n/time-of-day, fades 0.96/day), `mem.likes` (3), `fav {x,z}`, `habits` (3, rebuilt daily). Crab: `crab.fav`, `area`, `met`, `wary`, shell `hist` (12). All of these are world state: saved, synced, survive reload.

**Reactions to changes.** New decoration: fish and turtles go and look (probability 0.15 + 0.6·roam − 0.3·cover; a shy fish watches from 2.3 away) for 90 s; the octopus runs `aware()` (notice, watch, go, look at the old spot, a one-time missing check); a seahorse explores it and searches where a moved favorite plant stood. Removal (`sellDecor`): clears `home` and `spotId`, −0.15 happiness, `f.missing` for a day, octopus memory marked gone. Moving: `d.h.moves` (3) and `mem.fam[].mv`. **No redistribution logic exists or is needed:** favorites grow back through `foldHaunt` and the journal says "has found a new favorite place".

**Relationships.** Best friend `f.pal`: formed rule-side in `discover()` between two **Social**-trait fish after 2 h and happy ≥ 0.7 (one-sided link possible), by `dailySurprise` (any two fish without a pal, on the first feed of a day), and by two dilemma outcomes. Octopus buddy/rival: 3D tallies (follow/watch vs annoyance/startle) reported by the lead phone (`octoMemo`), grudges held ≥ 2 days. Octopus partners: any two free adults accrue time every 3 h, partners at 3 days; eggs need f+m, a den, 5 days. Seahorse mates: same kind, 2 days, for life, widowed 7-day block. Bully/victim, clash, squabble, food competition: computed each time from `SOCIAL`/`ECO`, never stored. Behavior: best friends settle side by side (18 % of picks by day, 60 % at night), follow 1.4 behind (45 %), are exempt from crowd re-routing, wait for a friend away on an adventure; partners touch arms and share dens; mates greet and tail-link; bullies chase the nearest small fish every 0.6 s with p 0.55 and species patrols (damselfish 0.45, angelfish 0.18, clownfish 0.25, ×(1 + 2·max(0, crowd − 0.6))), the victim ducking into cover when it has enough. Wellbeing: friends were **text only** (no points); trouble costs bully 12, clash 10, squabble 10, rival 6, food 6, wary 3, halved by enough cover of its own kind.

**Personality.** Eight fish traits (Curious, Social, Brave, Playful, Greedy, Shy, Lazy, Calm; 1–2 per fish), six octopus temperaments with cur/bold/soc/tidy, six crab natures. Every fish trait drives something visible (`fishmgr.js`): Shy hides 75 % of picks, flees anything within 2.1, takes cover from big animals; Brave goes to the front glass 60 %; Curious inspects decor and fish 65 % and new decor at 60 %; Social keeps to the nearest of its kind 70 %; Playful bubbles 40 % and speed 1.25; Lazy speed 0.6, idles 40 %; Greedy surface 50 %, food speed ×2; Calm speed 0.85. Raising (`raiseLean`): 8 pets → Brave, 6 games → Playful, 4 light/bubble/hide/puzzle sessions → Curious, 8 fed days → Calm, none → Shy, applied at adulthood. The five Personality bars are derived from traits (±0.33) plus `lean` and seed jitter; "Bond with you" is `bond[you]/15`.

**Memory and journal.** Per-animal persistent fields: `mem` (octopus), `log` (distance, levels, places ≤ 40, hitch ≤ 16, fav, meals, strikes, greets, links, inspects), `spotId`, `haunt` (4), `pal`/`mate`/`partner`/`buddy`/`rival`/`grudge`, `bond[uid]` (no cap), `tricks`/`skill`/`toys`/`solved`, `habits` (3), `disc` (behaviors seen, permanent), `found`, `moments`, `story` (14, first kept), `well`, `crab.*`, `advMem`, `loss` (3 days), `denMem`. Journal: tank-wide, no animal field on an entry; the card's Journal tab shows `f.story` (14) plus a wellbeing log, fed only by events that carry `story` or one of `STORY_KEYS`. Tank history: 200 entries thinned by kind, capsules 40. Return news: regex over the journal window. Field Guide (`t.field`, 24 pages): **retired**, `witness()` returns false; its readers are never called.

**Capacity.** `capacity(level)` from `LEVELS` (7…28). Load per animal (`roomOf`): schooling fish 0.5, small fish 0.85, size-3 fish and octopus 1.5, Kemp's 3, other turtles 4. The **hard buy gate is count-based** (animals + pending + 1 ≤ capacity, in `buyFish`); the load ratio `crowdOf(t).r` is wellbeing only: spawning stops above 0.8 (`rollEggs`), the Space part of wellbeing goes to 0 above each species' tolerance (0.6–0.85), bullies get meaner above 0.6. Births get `BIRTH_ROOM = 4` extra places, so a tank can hold up to 32 by count.

**Server and sync.** `advance()` runs births, meters (clamped; hunger stops at 0.85, water at 0.45), `tendFish` in half-hour steps capped at 480, XP and thriving capped at 3 days, then growth, orders, drift, puzzles, hunts, adventures, the daily passes (`lifeDay`, `historyDay`, mystery, dilemma, goals, themes), visitors, eggs, `discover`. Missed days are not replayed. Favorites, friendships from proximity, octopus and crab memories, keepsake carries and discoveries are **reported by the lead phone** (`fishLog` every 180 s; `observe` ≤ 1 per 1.5 s, 24/min; `octoTouch`, `octoMem`, `octoMemo`, `crabMem`, `keepMove`). The server saves the whole world on every action, every 30 s per open room, and every 5 min for closed tanks with push subscribers; broadcasts the whole world after every action. Leader snapshots at ~7 Hz: positions, heading, phase, seahorse pack, octopus pose (29 values), crabs (8). Followers extrapolate 0.35 s and blend.

---
## 2. Existing systems that can be reused (and were)
- `foldHaunt` + the `fishLog` report: the only honest source of "where it really spends its time". Reused for the first favorite (§4.2).
- `f.knowT` in `fishmgr.js`: seconds near each other, accumulated by the spatial-hash sense tick every 0.5 s. It was written and never read. Reused for friendships (§4.1).
- `f.story` + `recordStory`: the animal's own journal. Reused for pairs, friends, tricks (§4.4).
- `f.bond[uid]` and `octoTrust`: per-caretaker trust. Reused for the milestone (§4.3).
- `wellOf` parts: the Health screen already explains every point; a company credit slots in (§4.1).
- `lifeDay` loss memory: a companion keeps going back to where they used to be together for three days. Kept, and the stale link is now cleared after it (§4.5).
- `temperOf` (keep/roam/cover): already paces how fast an animal gives up a place and approaches new things; it is the "homebodies resist, curious investigate sooner" the spec asks for, and it needs no change.
- The spatial grid, `senseTick` cadence and the 180 s report: all new work rides these, so there is no new per-frame cost (§6).

## 3. Missing or weak connections found
1. **Friendship had no connection to shared experience.** It was a trait roll (`discover`), a random daily pairing (`dailySurprise`: any two fish, "shared the first flakes"), or a dilemma outcome. Proximity was tallied (`knowT`) and thrown away; the `together` discovery recorded a sight but set nothing. → fixed, §4.1.
2. **A fish's first favorite was the first decoration of a category**, regardless of where it had been; the real-use mechanism could only override it later, and only with a 1.3× margin. → fixed, §4.2.
3. **Friends counted for nothing** in wellbeing; only species counts made an animal lonely or not. → company credit, §4.1.
4. **"Trusts you" lit for everyone after anyone's first pet** (`disc.trust`), not per caretaker. **"Became a parent" lit only for octopus mothers.** → fixed, §4.3.
5. **The animal's own journal missed its own life:** "are friends now", seahorse pairing, octopus partnering, tricks learned never carried a `story`. → fixed, §4.4.
6. **A friendship outlived its friend:** old-age death did not clear `pal`, and `found.includes('friend')` blocked a second friendship forever. → fixed, §4.5.
7. **Social fish kept to their own kind, not to their best friend.** → fixed, §4.6.
8. **Sync dropped half the octopus pose** (server kept 16 of 29 values: no impressions, blinks, climb on the other phone) and **a full tank's snapshot exceeds the 4 KB message cap** (measured 4,230 bytes for 28 animals), so a full shared tank would silently stop syncing animals. → fixed, §4.7.
9. Still weak, not changed (proposals in §9): climb/hold affordances unused; `rivalId` avoidance is dead code; octopus traits only change speed; crab bars come from traits while behavior comes from `crab.type`; cleaner-goby "friend" credit without any cleaning; the Field Guide is retired but its tables remain; `f.pal` is a palette integer on octopuses and a friend id on fish (a den dilemma can set a fish id on an octopus and change its color).

---
## 4. Improvements implemented (v330)
All in the shared rules (`web/src/game/rules.js`) unless noted, so the server and every phone agree; nothing new per frame.

**4.1 Best friends grow from time really spent together.** The lead phone already counts seconds each fish spends within arm's reach of each other (`knowT`). It now reports the top three with its 180 s fish log (`near`), and resets. The rules fold them into `f.know = { id: [seconds, reports] }` (four entries, fading 0.97 per report, dropped under 10 s or when the other is gone). When two compatible fish have **8 minutes over at least 3 reports** and neither has a living best friend, they become best friends on both sides, once per pair for the 3-shell reward, with a journal line and both their own stories ("Ann and Bo are best friends now. They keep each other company by the reef cave." when they share a favorite). `canBefriend`: never an octopus, crab, cleaner or neon tetra; never a school with itself, or rivals of their own kind, or two seahorses (that is a pairing); never a bully with a small fish, a predator, or a clash pair. `dailySurprise`'s friendship now needs the same compatibility plus evidence (2 minutes of `know` between them, or the same favorite place), and never pairs strangers. A best friend, mate or partner who is present adds a visible **Company +4** part to wellbeing (the Health screen shows it).
**4.2 The first favorite comes from where it has been.** `discover()` now takes the decoration with the most real time (`haunt` ≥ 2) if there is one, else the most-used decoration in its trait's category, else the first of that category as before; the journal names the actual piece.
**4.3 Milestones tell the truth.** "Trusts you" is per viewer: three pets or games from *you* (`bond[uid] ≥ 3`), passed from the card. "Became a parent" is set for both fish parents at a hatch and for both seahorse parents at a birth (it was octopus-only).
**4.4 The animal's own journal.** Seahorse pairing and companionship, octopus friendship ("Made friends with Pip; follows it about."), tricks ("Learned to twirl, taught by Ana.") and the new best-friend line reach both animals' stories.
**4.5 A friendship ends when a friend dies.** After the three-day loss memory is set, the survivor's `pal`/`buddy` link is cleared (in `lifeDay`), so it can make a new friend.
**4.6 Social fish keep to their best friend first,** then to their own kind (`fishmgr.js` pick).
**4.7 Sync:** the server relays all 32 octopus pose slots and accepts a lead phone's `snap` up to 12 KB (other messages stay at 4 KB).
**4.8 Tools:** `tools/friends_check.mjs` (end to end in the real 3D tank: pinned fish → `near` report → three reports → best friends both ways, own story, journal, name pill "swimming with Bo, its best friend"); `tools/perf_full.mjs` (a 28-animal, 36-decoration tank); `tools/loop_sim.mjs` gained day-90 snapshots, animals by kind, crowd load, turtle room, purchases, births, sales, idle days, spending days, and `TRACE=<seed>` (every journal line by day). Three regression tests in `rules.test.mjs`. Service worker cache **v330**.

Not changed, on purpose: level thresholds, capacity numbers, income, prices, species, chores, the simulation loop, the 3D movement.

---
## 5. Simulation results (measured)
`tools/loop_sim.mjs`: a simulated household plays the real rules from an empty tank, 120 days, 6 seeds per row, one to four caretakers (casual: one evening visit most days; regular: two a day; engaged: three), feeding, cleaning, playing, picking goals, pairing fish and shopping as the rules allow. Median values.

### 5.1 Capacity
| Household | Day 30 animals (load/cap) | Day 60 | Day 90 | Day 120 | Born here by 120 | Sold | Turtle possible (tanks) |
|---|---|---|---|---|---|---|---|
| 1 casual | 18 (72 %) L6 | 25 (88 %) | 28 (90 %) | 28 (90 %) | 12 | 0 | 0/6 |
| 1 regular | 21 (84 %) L6 | 28 (87 %) | 28 (87 %) | 28 (87 %) | 5 | 3 | 0/6 |
| 1 engaged | 28 (87 %) L8 | 28 (87 %) | 28 (87 %) | 28 (87 %) | 5 | 10 | 0/6 |
| 2 regular | 23 (74 %) | 28 (92 %) | 30 (105 %) | 32 (116 %) | 14 | 5 | 0/6 |
| 2 casual | 21 (86 %) | 28 (97 %) | 29 (107 %) | 32 (118 %) | 14 | 0 | 0/6 |
| 4 regular | 27 (94 %) | 29 (114 %) | 32 (123 %) | 32 (123 %) | 14 | 6 | 0/6 |
| 4 engaged | 21 (78 %) | 28 (106 %) | 31 (122 %) | 32 (127 %) | 15 | 0 | 0/6 |

What this says:
1. **Every household reaches the hard count (28) between day 30 and day 60**, before or just as level 8 opens (level 8 median: engaged 27, regular 47, casual 64). From then on the only way to add anything is to sell.
2. **Breeding fills it.** 5–15 animals per tank were born here by day 120; births get four extra places (`BIRTH_ROOM`), so **shared tanks run at 29–32 animals and 105–127 % load**: the Space part of every animal's wellbeing is 0, spawning stops, bullies are at their meanest. Each caretaker's own octopus (1.5 load) is a third of the overload in a four-person tank.
3. **A sea turtle was never possible in any of 102 simulated tanks** after day 60: by count (28 of 28) and by comfort (a turtle needs the tank ≤ 60 % and counts 4). The 120-shell adoption measured in the progression audit assumed a tank that saves room; a tank that is simply played does not have it.
4. The simulation sells only when a goal demands it (0–10 sales), and never buys seahorses or a second octopus in solo tanks because cheaper fish and crabs fill the places first. A real player chooses differently, but the direction is the same: **the pressure is toward full, not toward room**.
5. Performance stays fine at these counts (§6); the problem is design, not frame time.

**Recommendations with tradeoffs (not implemented, §9.1).**

### 5.2 Shells after the big unlocks
| Household | Shells/day (d30 → d120) | Balance at d30/60/90/120 | Decor owned by d120 | Days with a purchase (of 120) | Days at level 8 with nothing left to buy |
|---|---|---|---|---|---|
| 1 casual | 11 → 9.3 | 22 / 76 / 37 / 19 | 29 | 45 | 0 |
| 1 regular | 12 → 10.7 | 29 / 32 / 34 / 21 | 35 | 53 | 0 |
| 1 engaged | 18 → 13.2 | 26 / 36 / 28 / 53 | 38 | 52 | 0 |
| 2 regular | 16 → 12.6 | 29 / 21 / 43 / 56 | 44 | 49 | 0 |
| 4 regular | 19 → 14.8 | 11 / 31 / 53 / 68 | 48 | 53 | 0 |
| 4 engaged | 18 → 14.2 | 17 / 25 / 34 / 64 | 49 | 49 | 0 |

Income falls after level 8 as level-ups and wishes run out (about 20 % lower by day 120), balances stay at 15–70 shells, every household still buys something on 40–45 % of days, and **no household ran out of things to save for inside 120 days** (the decoration catalog is 50+ pieces, and the 150–300 centerpieces are bought late: Little Bridge, Glow Crystal, Coral Spire). Goals finished: 0–4 per tank in 120 days (casual 0–1); themes: Kelp Forest by day 40–90 in every tank, Coral Garden 50–105, Sunken Ruins in about half, Lantern Cove never (its anchor costs 190). Turtle release income (100–150 each) never happened (§5.1). **Verdict: the economy works through day 120 and should be left alone**; what runs out first is room, not money. Beyond day 120 the catalog will be exhausted by engaged tanks around day 150–180 at the measured pace; the sinks that remain are repeat ones (shells for crabs, foods, the puzzle jar, hide-and-seek, floors and backdrops).

### 5.3 The 30-day experience
From the `TRACE` runs (seed 1, the real journal lines the rules produced, filtered of routine care). Simulated unless marked *seen on screen*, which means the phone's animation would show it only while someone is watching.

**Regular solo** (level 7 by day 24, 21 animals and 15 decorations by day 30, one goal done, 10 animals with a favorite spot, 9 born here)
- Day 1: the octopus settles, takes its first crab from the Care tab, a request, the first mystery (sea glass), the first goal offered. *Seen on screen:* the octopus hiding in the plants to watch you.
- Day 3: level 3 (tricks, bubbles); the octopus carries the coconut to a corner and moves in; it and the clownfish hang about the same den.
- Day 4: the first decision ("they keep fighting over the coconut shell") and its consequence ("Inky has not forgotten").
- Day 7: the first favorite spot (now from real use), eggs with eyes in them, level 4, the week chapter.
- Day 14: the first hatchling's first day "stays close to goldfish wherever goldfish goes"; the hermit crab digs up a whelk shell; the Ghost Dragonet returns to its old spot.
- Day 15–21: the young one takes to its parent's favorite place; a 7-day card says "its favorite place is the coconut shell; it is best friends with cory"; the second hermit crab; a second clutch.
- Day 22: the octopus tests the lid (the adventure is coming); a hatchling learns the ball.
- Day 30: a crab molts and grows up; the day-30 capsule. Tomorrow: eggs ready to hatch, a goal two steps from done, level 8 in about three weeks.

**Casual solo** (one evening visit most days; level 6 by day 28, 18 animals, 13 decorations, no goal finished)
- The same beats a few days later: den on day 3, a visitor on day 3, first eggs day 8, first decision day 10 (a chasing damselfish, "give cory somewhere to hide: cory gave up the chase"), first hatchling day 11, first crab day 19, the family grown up together day 21. Pairings and friendships appear in the 7-day cards. What a casual player misses: tricks (nobody trains), the adventure's clues (one visit a day), and the goal (0 done).

**Four caretakers, mixed habits** (level 8 on day 22, 24 animals, 23 decorations)
- Day 1–2: four octopuses, each watching its own person; "Ana and Cy both looked after the tank today".
- Day 3–4: two octopuses contest one den; the decision is one person's call and the loser "has not forgotten"; two octopuses learn the bubbles.
- Day 7–8: every octopus has a favorite place of its own (sea grass, coconut); the Rose Goby comes back a third time "as if it would like to stay".
- Day 14–22: three hatchlings take to the same starfish as their parent; level 8 on day 22 with 24 animals already in a 28-place tank.
- Day 30: a fourth generation of fry at the starfish; the tank is at the count limit with no turtle room (§5.1).

What makes someone open it tomorrow, by the rules: eggs with a known hatch time, a hatchling's daily line, a decision waiting, the lid being tested, a visitor who "would like to stay", a favorite place forming. What the rules cannot promise: the animal doing something remarkable while they watch; that is the phone's animation, so the 30-day beats above are what a daily player would *read*, and the behaviors in §1 are what they could *see* in a few minutes of watching.

---
## 6. Performance results (measured, headless Chromium, software rendering: CPU simulation cost only)
| Tank | Animals | Decor | Behavior watcher ms/frame | Animal update ms/frame | Leader snapshot bytes |
|---|---|---|---|---|---|
| `tools/perf.mjs` (as before) | 20 | 30 | 0.218 | 0.099 | — |
| `tools/perf_full.mjs` (level 8 full) | 28 (2 octopus, 4 seahorse, 3 crabs, 1 turtle, 18 fish) | 36 | 0.644 | 0.186 | 4,230 |

The new work adds no per-frame cost: `knowT` was already accumulated in the 0.5 s sense tick on the spatial grid; the report is three entries every 180 s; friendships are decided server-side on that report. The full tank's snapshot (4,230 bytes) was over the server's 4,096-byte limit and would have been dropped; the limit for `snap` is now 12 KB (about 100 bytes an animal, so ~120 animals). Earlier recorded numbers for context: whole-simulation 3.0 ms/frame with three octopuses (docs/OCTOPUS_AUDIT.md). No full-tank frame rate on a phone is written down anywhere; it is the first item of the iPhone plan (§8).

## 7. Save and multiplayer compatibility
- New per-animal field `know` is created on first report; `norm()` and `ensureFish` need no migration. Old phones that do not send `near` simply never form friendships this way (the trait and daily paths still exist).
- `milestonesOf(f, uid)` keeps the old behavior when no uid is passed.
- No field changed shape; nothing is deleted; no price, level, capacity or income changed. Existing `pal` links are kept; a one-sided old link is repaired the next time `discover()` runs for that pair.
- The server change only widens what it relays (pose slots) and accepts (`snap` size); old clients are unaffected.
- Idempotency unchanged: `fishLog` is a lead-phone report, applied in order, and a friendship forms once (`flags.pairs` key).
- The drills: `friends_check` passes; `fund_check`, `turtle_check`, `adopt_check`, `motion_check` unchanged from v329; the rest of this run's drill results are in §8.

## 8. Remaining problems, and the iPhone test plan
**Problems**
1. Capacity (§5.1) is the design problem of the long game; proposals in §9.1 need a decision.
2. Friendships still need a watching lead phone; a tank nobody watches forms them only through the gated daily path (two who share a favorite place).
3. The journal has no animal field; the card's Journal tab is `f.story` (14 lines). A 30-day life does not fit in 14 lines; the oldest are dropped after the first.
4. `f.pal` is overloaded on octopuses (palette integer); a den dilemma can put a fish id there and change the octopus's color. Needs a rename (`palette`) with a migration.
5. The Field Guide tables and readers are dead code; the "guide" goal is switched off.
6. The `habitatNotes()` text (what the animals really did with the habitat) is never shown; it is the natural "habitat report" for the Health screen.
7. Pre-existing drill failures carried from v329: `sell_check` ("Care has the tank upkeep row and a Health list"), `care_sync` (the other phone's open Care updating by itself), and one `bonds_check` check (octopus partners spend only 2–3 % of a visit within 1.5 of each other; the touching-arms and card checks pass).

**Phase D: the iPhone test (to be performed by a person; nothing here is claimed to pass)**
1. Normal tank: a level-4 tank with 12 animals and 15 decorations; 5 minutes watching; note the frame rate (`?fps=1`), heat, and whether animals jitter.
2. Nearly full tank: level 8, 28 animals including two octopuses, four seahorses, three crabs and a turtle, 36 decorations (`tools/perf_full.mjs` builds it in a dev tank); 5 minutes; frame rate again; tap latency on a card.
3. Interaction visibility: in the full tank, within 3 minutes, can the tester point at (a) a fish at its favorite spot (name pill), (b) two best friends together (pill "swimming with X, its best friend"), (c) a shy fish taking cover, (d) the octopus at its den, (e) a seahorse on its holdfast? Record which were seen.
4. Decoration placement: place, rotate, move and sell a reef cave; confirm the Health before/after line; confirm the fish go and look within 90 s and that the sell dialog names who loved it.
5. Touch: finger-follow with a crab and the octopus; the light spot; a toss; no missed taps on the bottom bar with the keyboard up.
6. Loading: cold start and warm start times to the first frame and to the first animal moving; airplane mode start.
7. Two phones: the same shared tank side by side for 3 minutes; positions agree; the octopus's impression and blink show on both; the follower keeps moving if the leader's screen locks; then a full tank (test 2) on both: confirm the snapshot still arrives (this is the 12 KB change).
8. Report the frame rates in `TAKO_TANK_IPHONE_PLAYTEST.md`, which has blank fields for 25+ animals.

## 9. Recommended next development phase
**9.1 Capacity (decision needed; each option with its cost)**
- *A. Room-first breeding:* stop spawning at 70 % load instead of 80 %, and only offer the extra fry when the tank would stay under 85 % by load. Cost: fewer hatchings for full tanks (today 5–15 per 120 days). Effect in the sim: solo tanks stay at 24–26 animals instead of 28; shared tanks still reach 28 by count. Save-safe.
- *B. Count the octopuses the crew brings:* each caretaker's own octopus is free of the count gate (not the load). Today four octopuses are 6 of 28 load. Cost: a shared tank is 4–6 animals smaller for everyone. Changes the invite promise; not recommended alone.
- *C. Earned room after level 8:* +2 places for each of the first two turtles released (cap 32) and a visible "Room" line explaining it. Pays the player for the very thing that needs room, keeps performance inside the measured 32-animal budget. Cost: the number 28 stops being the ceiling; the sim says shared tanks already sit at 32 by birth room, so nothing new for performance. **Recommended**, together with A.
- *D. A "rehome to a friend's tank" path that is not a sale:* the gift path exists for bred babies; extend it to adults with the animal's story travelling with it. Cost: UI; it answers "I don't want to sell an animal I know".
- Not recommended: raising the count for everyone (the measured load is already over the comfort line), a second tank, storage.

**9.2 Make the habitat report visible:** show `habitatNotes()` (who used what, this week) on the Health screen, and the Company part is already there. Zero simulation cost.
**9.3 Journal per animal:** add an `about: [ids]` field to journal entries at write time (the events already know), filter the card's tab by it, and let `story` keep 30 lines. Save-safe (old entries have no field).
**9.4 Personality visible for the octopus and crabs:** have the octopus's traits modulate what the six temperaments already do (Shy: watch longer before approaching; Brave: closer to the glass), and derive the crab's bars from `crab.type`.
**9.5 Rivalry for fish:** store a `f.rival` from repeated chases of the same small fish (the chase code exists; the memo path exists for octopuses), show it on Health, and let a second shelter end it. This is the "territorial problem the player can solve" from the brief; the pieces exist.
**9.6 Rename the octopus palette field** and retire the Field Guide tables, or finish them. Housekeeping before more history work.
**9.7 The iPhone test (§8)** before any of the above is tuned by feel.

---
### Tests run for this document
- `npm test`: **95 of 95** (97 rule tests including three new ones: friendship from time together with compatibility, reward once and both sides; the first favorite from real use plus a freed survivor; trust per caretaker and both kinds of parent).
- `tools/friends_check.mjs`: passes end to end in the 3D tank (the `near` report, three reports, both links, both stories, the journal, the name pill).
- `tools/perf.mjs`, `tools/perf_full.mjs`: the numbers in §6.
- `tools/loop_sim.mjs`: 20 rows × 6 seeds × 120 days; three 30-day traces.
- Other drills this run (headless, one at a time): `profile_check` passes (seahorse and octopus cards, tallies, the four tabs); `bonds_check` fails one check, "the partners find each other N % close" (2 % on this build, 3 % on the previous commit's code served from its own worktree: **pre-existing**, the other three octopus-partner checks pass); `journal_check` **passes** when run on its own (twice; two of its checks failed once while four drills shared the machine, so that was load, not the code). Pre-existing and unchanged: `sell_check` and `care_sync` (one failure each, in the final audit since v328).
