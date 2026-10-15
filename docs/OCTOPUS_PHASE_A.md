# Octopus Phase A: persistent memory and environmental awareness

**What this phase delivers.** An octopus now:
- notices a new decoration;
- decides, according to its nature, whether and when to go and see it;
- reaches it and handles it, and learns it only then;
- keeps going back to the things it knows best;
- looks for a decoration that was moved while it wasn't looking, and recognizes it when it finds it;
- lets a thing go when it's taken out.

What it remembers belongs to the tank (the server), not to one phone.

## Files changed

| File | Change |
|---|---|
| `web/src/game/rules.js` | The memory model (`mem`, `memOf`, `octoAffinity`, `famStage`, caps). New `octoTouch` and `octoMem` actions. Move and remove hooks in `moveDecor` and `sellDecor`. Bounding in `norm`. |
| `server/logic.mjs` | `octoTouch` and `octoMem` added to the allowed actions. |
| `web/src/w3/fishmgr.js` | Decoration change detection (`decorDiff`). The awareness and investigation state machine (`aware`, `touched`, `delay`, `endInv`, `memSay`), run once a second. The personality table `AWARE`. Memories loaded from the server, migrated once, and saved to the server instead of localStorage. Thoughts. |
| `web/src/w3/fish3d.js` | An `onTouch` hook where it actually reaches and handles a thing. The look target `watchPt`. Revisit choices driven by its remembered favorites, its own revisit and novelty tendencies, and things it has never touched. |
| `web/src/main.js` | Wiring: `octoTouch` and `octoMem` are sent by the director only. |
| `tools/octopus_aware.mjs` | New observation test (personality comparison plus the memory sequence). |
| `web/src/game/rules.test.mjs`, `server/test.mjs` | New rule and server tests. |

## Memory schema (on each octopus, `fish.mem`)

```
mem = {
  fav:   { x, z } | null,                           // its favorite resting spot
  fam:   { [decorId]: { k, n, x, z, at, mv?, gone? } },
  likes: [decorId, …],                              // its top 3, recomputed by the server
  fish:  { [fishId]: { f, a } }                     // how it feels about each fish (follow / annoyed), top 6
}
```

What each `fam` field means:
- `k`: familiarity, 0–1. It grows only when it actually handles the thing, and grows less each time.
- `n`: how many times it has handled it.
- `x, z`: where it last *knew* the decoration to be. A decoration moved while it wasn't looking keeps its old place here until the octopus finds it.
- `at`: last handled, used for duplicate protection.
- `mv`: moved since it last saw it.
- `gone`: taken out. Forgotten after 3 days.

**Stages** (`famStage`): new (never handled), investigated, familiar (k ≥ 0.35), loved (k ≥ 0.6).

**Favorites:**
- Score = familiarity × affinity, counted only after 2+ visits.
- Affinity = its nature (a collector likes shells, pots and chests; a homebody likes rocks and dens; a watcher likes plants; a showoff likes things near the glass; an explorer likes far corners) + a per-animal, per-object element from its seed.
- So two collectors don't end up with the same favorites.

**Bounds:** at most 12 decorations, 3 favorites and 6 fish. Gone entries are dropped first, then the least familiar. Enforced on every write and in `norm`.

## How memories are persisted

- Everything lives in the tank world on the server, so it survives a reload, another caretaker, a director handoff, a reconnect and a server restart.
- **`octoTouch {fish, decor, kind}`** is sent by the director when the octopus has reached a decoration and is handling it. The server decides the familiarity gain and writes the journal.
  - The same fish and decoration within 45 s is ignored.
  - So the same visit reported by two phones, or across a handoff, counts once.
- **`octoMem {fish, fav?, fishMemo?}`** carries the favorite spot and fish memories. It's sent at most every 2 minutes, and only when they changed.
- **Migration:** a phone with old localStorage memories offers them once, as `octoMem {migrate:true}`. The server accepts them only if the octopus has no memories yet, so stale local data can never overwrite the tank. Old likes become familiarity, and only for decorations that still exist.
- localStorage is no longer written for octopus memory.

## How novelty is detected

- **On every state update** (not every frame), `decorDiff` compares the decoration list with the previous one: new, moved (more than 0.3 apart) or removed.
  - "New" means placed within the last 20 minutes (`at`), so a restored or swapped-in tank doesn't count as new.
- **Reload or handoff:** a phone that has just opened or taken over treats things placed or moved in the last 20 minutes as new, so the octopus still notices them.
- **Its own moves:** decorations the octopus moved itself are ignored for 2 minutes.
- **Processing:** each octopus works through the events once (`evDone`), in the once-a-second loop on the director phone.

## How investigation works (`aware()`, once a second)

1. **Notice.** It looks at the thing (eyes, head and body turn to it). Thought: *"Noticed the new clay pot."*
2. **Delay.** Set by its nature and boldness.
3. **Watch first,** for watchers and homebodies. A homebody goes home first and watches from its den. Thought: *"Watching the clay pot from its den."*
4. **Decide** with a willingness set by its nature:
   - boldness raises it;
   - an audience raises it for a showoff;
   - a collectible raises it for a collector;
   - shyness lowers it.

   If it declines: *"Keeping its distance…"*, then it tries again in 40–90 s, 3 times at most, then *"Has decided to leave it alone for now."*
5. **Approach** with the existing inspect errand (same navigation, same arm wrap). Thought: *"Creeping over to the new clay pot."*
6. **Touch.** Only when the existing body code has reached the thing and starts handling it does it report `octoTouch`. Thought: *"Feeling the new clay pot all over with its arms."* Familiarity is granted then, never for the thing just being in the tank.

**Interruptions:** hunger, a crab hunt, a puzzle jar, its own decoration job, a finger on the glass, fear, heavy tiredness or sleep pause the investigation. It returns to it later.

**Failure handling:**
- A failed approach (navigation timeout) is retried later, 3 times at most.
- A whole investigation lapses after 6 minutes.
- No loops.

## How familiarity changes decisions

- **Revisits.** When it next wanders off to look at something on its own, it goes back to one of its favorites, the first most often. How likely depends on its nature: homebody 75%, collector 65%, watcher 55%, showoff 45%, trickster 40%, explorer 30%.
- **Novelty.** Otherwise curious natures prefer things they have **never touched**: explorer 60%, trickster 45%.
- So a collector settles into a favorite and an explorer works through everything new.
- **On the card:** its thought line names its favorite decoration from the shared favorites list.

## How moved decorations are recognized

- **Saw it moved** (awake, not tucked under its shell, within about 6.5 m of the old or new place): it watches it being moved and goes to it in the new place.
- **Didn't see it moved:** after a while it goes to **where it remembers it**. *"Going to where the clay pot used to be."*
  - It feels around: *"Feeling around where the clay pot used to be."*
  - If the thing is within sight from there (3.4 m), it goes to it: *"There it is: the clay pot, in a new spot."*
  - Otherwise it searches 2 nearby points, then *"Gave up looking for the clay pot."*
- **Later:** a thing it knew, moved and not yet found, is recognized when it comes within 2.8 m of it in normal life. *"Recognized the clay pot: it has been moved."*
- **The server:** marks the memory `mv` on a caretaker's move and keeps the old place. A touch with `kind:'moved'` updates the place and writes *"Inky found the clay pot in its new spot."*, once per 6 hours.

## Removed decorations

- **The server** marks `gone`, drops it from favorites, and forgets it after 3 days.
- **On the phone:** an investigation of that thing stops at once.
- If it knew the thing well:
  - **Saw it go:** *"Watched the clay pot go."*
  - **Otherwise:** once, a little later, it goes to the old spot: *"Went to where the clay pot was. It is gone."* Then it stops.
- Existing den loss (the home shell taken out) is unchanged.

## Personality differences observed (`tools/octopus_aware.mjs`, the same new pot, 4-minute visits, 2 runs each)

| Nature | Noticed | Watched first | Went over | Seconds to touch (avg) |
|---|---|---|---|---|
| Explorer | 2/2 | 0/2 | 2/2 | **21.5** |
| Collector (a pot is collectible) | 2/2 | 0/2 | 2/2 | **11** |
| Watcher | 2/2 | 2/2 | 2/2 | **47** |
| Homebody | 2/2 | 2/2 (from its den) | **1/2** | **153** |

**Memory sequence** (a collector):
- It investigated the pot: one journal line, familiarity 0.34.
- Over 7 minutes it went back 3 more times on its own: n = 4, k = 0.61.
- The pot was then moved while it was 7 m away. It went to the old spot (within 0.7 m), felt around, saw the pot, went over and recognized it: n = 5, the new place learned, one *"found the clay pot in its new spot"* line.
- After a page reload it still knew the pot, with favorites intact.
- Taken out: it stopped seeking it, and it was marked gone.
- Memory stayed within its bounds.

An explorer in the same 7 minutes went to *other* untouched things instead of back to the pot. That's its novelty bias, measured.

## Multiplayer test results (`server/test.mjs`)

- **Three caretakers reporting the same visit at once:** exactly **one** counted and **one** journal line. All three phones received an identical memory.
- **Handoff:** a later visit reported by a different caretaker is counted (n = 2).
- **Stale migration:** a phone with old local memories is refused, so it can't overwrite the tank.
- **Server restart:** the memory is in the saved world row, which is what a restart reads back.

## Performance

- **Awareness and investigation:** run once a second, per octopus, on the director only. Measured average cost: under 0.001 ms per call (rounds to 0).
- **No new per-frame work:** no extra arm collision, no voxel changes.
- **Decoration diffing:** runs only on state updates, and is linear in the decoration count (12 events kept).
- **Three-octopus bench (`tools/bench_octo.mjs`):**
  - **Before:** 3.004 ms per frame for the whole simulation, 0.927 ms for arm posing.
  - **After:** 2.999 ms per frame, 0.994 ms for arm posing (within noise).
  - Voxels unchanged at about 3,070 per octopus, with 652 arm-pose calls.

## Regression results

| Check | Result |
|---|---|
| Rule tests | 92 passed |
| Server and multiplayer tests | 83 passed |
| `octopus_den` (coconut home, going in through the mouth, obstacles, no stutter) | Passed |
| `octopus_character` | Passed |
| `octopus_rest` | Passed: tired 64% and frightened 53% of three minutes under the shell |
| `seahorse_check` | Passed |
| `profile_check` (fish, seahorse and octopus cards) | Passed. Its old "five bars" check was updated to the six-tile personality grid. |
| `bonds_check`, `toys_check` | Passed |

## Known limitations

- **Moment-to-moment behavior** (where it is, what it's doing) still runs on the director phone only, as before. A handoff mid-investigation restarts that investigation's timing on the new director. The memory itself is never lost.
- **Search radius:** when it didn't see a move, a decoration moved more than about 3.4 m from its old spot isn't found by the search. It's recognized later, when the octopus passes within 2.8 m.
- **"Saw the move"** is a distance-and-awake check, not true line of sight.
- **Nothing is simulated while nobody is online.** No investigations are written then, by design.

## For Phase B

- Replace the weighted dice roll for idle choices with drives: curiosity (novelty from these memories), comfort, hunger, social, display.
- These memories are the inputs: unfamiliar things feed curiosity, favorites feed comfort and routine, and the fish memories feed social.
- Consider letting familiarity shape routes, such as patrolling between favorites, and which things it carries to its den (that's Phase C).

---

# Phase A, part 2: making the intelligence visible

**Status: partly done.** Below, each point is split into four parts:
- **logic:** what the code does;
- **automated:** what a test checks;
- **observed:** what a headless simulation showed;
- **device:** what still needs a real iPhone.

A state variable changing is not counted as success.

## Bugs fixed first

| Bug | Cause | Fix | Verified |
|---|---|---|---|
| Seahorses listed but not in the tank (H74JQH) | The seahorse tail curl started undefined; the hover update turned the height into NaN, so they were drawn nowhere | Initialize the curl and self-heal any non-finite position | Your tank's saved world in a two-phone test: both seahorses had height `null` on both phones before the fix, and normal heights after |
| Coconut rotating on app open | The den shell's turn-over animation restarted from zero on every load | A home it already had starts turned over; shells rebuilt later keep their side | Code path; **device: watch an app open** |
| Sleepy (Zz) octopus moving a lot | A sickness flag called `tired` (yes/no) overwrote the octopus's 0–1 fatigue every update, so tiredness never built up. Sleepy also only halved its speed | Fatigue renamed to `fatigue`. Sleepy holds fatigue at 0.9 → home and stay. The Zz shows only once it has settled | Simulation over 90 s while Sleepy: **100% resting, 0.4–0.9 total movement** (before: 10.3, dashing and jetting) |

Side effect of the rename: fatigue now really works, and its old rate wore an octopus out in about a minute of crawling. The rate is now 0.004/s while active, about 3 minutes to "worn out".

## The 12 points

1. **Attention before action** (notice → orient → maybe watch → decide → approach → maybe stop partway → examine with arms → leave or return)
   - **Logic:** all stages exist in `aware()`.
     - A cautious first approach (a watcher or homebody, or a shy one, a new thing, more than 2.5 away) stops partway (`pause`) and looks before going on.
     - Familiar things (k ≥ 0.35) skip watching and are approached sooner.
   - **Observed:**
     - explorer: noticed → crept over → handled, at 19 s;
     - watcher: watched first, handled at 44 s;
     - collector: hesitated, then handled at 76 s;
     - homebody: watched from its den and kept its distance.
   - **Not yet observed:** a halfway pause. The test pot sits 1.2 from the octopus, under the 2.5 threshold.
   - **Device:** place a pot across the tank from a watcher.
2. **Selective curiosity**
   - **Logic:** willingness goes up for:
     - small things it can handle;
     - places to hide (for a homebody);
     - the same kind as a favorite.

     It goes down with exposure (seconds spent watching or putting it off, up to −0.3). Revisits favor favorites or untouched things, set by nature.
   - **Automated:** none specific yet.
   - **Device:** needed.
3. **Changing its mind**
   - **Logic:**
     - hunger, a fright, tiredness, sleep, a crab or a jar pause the errand, and it resumes later;
     - a fish passing within 1.4 can distract it once per errand (trickster 35%, watcher 25%, explorer 15%, homebody 5%);
     - retries are capped at 3, and an errand lapses after 6 minutes.
   - **Observed:** declines and retries in the logs.
   - **Not yet observed:** a distraction. The test tank has no fish.
4. **Visible familiarity**
   - **Logic:** caution goes down as familiarity grows, and it returns to favorites on its own.
   - **Observed (part 1):** a collector went back to the pot 3 times on its own (n = 4).
   - **Not yet measured:** first-time vs later approach speed, side by side.
5. **A style for each type:** no new work this round. The existing signature tricks and the awareness table differ (character test).
6. **Quiet moments:** nothing added runs more often. Sleepy and tired octopuses now actually rest more (above).
7. **No cheating:**
   - It only reacts to changes it could perceive: awake, not tucked in, within about 6.5 m.
   - It only learns by touching.
   - Search is bounded.
   - **Limit:** "seeing" is distance plus awake, not true line of sight.
8. **Caretaker recognition:** uses the existing trust and bond (glass greetings, through the crack of its shell). Nothing new this round. Not positive every time: a sulk or hunger overrides it.
9. **Shareable moments:** the journal lines from part 1. No new ones added.
10. **iPhone test plan:** below.
11. **Two octopuses, different habits:**
    - **Logic:** a per-animal affinity seed and per-nature tables.
    - **Not yet measured:** two in one tank side by side.
12. **Tests:** see "Results" below.

## Results (this round)

| Check | Result |
|---|---|
| Rule tests | Passed |
| Server tests | 83 passed |
| Awareness, personality (1 run each) | Passed |
| Rest | Passed: tired 58%, frightened 69% under its shell |
| Den | Passed |
| Character | Passed (re-run on the final code) |
| Seahorse | Passed |
| Profile, bonds, toys | Passed |
| Two-phone seahorse load (your tank) | Fixed |

**Not run this round:** the full 2-runs-per-nature awareness test and the memory sequence. The headless browser page crashed or ran more than 90 minutes. It's a known problem with repeated setups in one page, and the test needs a fresh page per run.

## Manual iPhone test plan (no new dev controls)

Use the normal app. The only hidden setting used is **Skip a day** (Settings → Developer, visible with `?dev=1`).

1. **Seahorses:** open the app on both phones. Both seahorses should be visible within 5 s. Force-close and reopen twice.
2. **Coconut:** with the octopus living in the coconut, close and reopen the app. The shell should already be dome-up and **not** turn over.
3. **Sleepy:** when the card says Sleepy, watch for 2 minutes. It should go home (or stay put without a home), with the Zz above it once it's settled and no dashing.
4. **New thing:** buy a pot and place it across the tank (far from the octopus). Watch for 3 minutes and write down:
   - does it look at it first;
   - does a watcher or homebody stop partway;
   - how long until its arms are on it.
5. **Second time:** next day, move the same pot while it watches. It should go over sooner, without watching first.
6. **Moved while it wasn't looking:** move the pot while it's tucked in its shell. Within a few minutes it should go to the old spot, feel around, then find it.
7. **Distraction:** with fish swimming, place something new near the fish's path. Sometimes (not always) it breaks off with "Distracted by…" and comes back.
8. **Two octopuses:** over a few days, note which things each one returns to. They should differ.

Please report what you saw against each step. Steps 4, 7 and 8 are the ones that still need a real device to count as done.
