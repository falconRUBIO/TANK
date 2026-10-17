# Little Adventures: implementation report

Rare, quiet things that happen in the tank on their own. The octopus escape is the main feature. The rules live in `web/src/game/adventures.js` and are called from `advance` in `rules.js`, so they run on the server for a shared tank and on the phone for a solo tank.

## 1. Summary

- **Octopus:** goes through restless → escape → out exploring → outcome → home again.
  - Four kinds of absence, with 16 outcomes weighted by the six natures.
  - Physical keepsakes, memory and four quiet discoveries.
- **Small moments:** five for fish, five for seahorses and six tank mysteries, including a returning visitor. Each one only happens when the tank really has what the line talks about.
- **Phone:**
  - the octopus climbs out over the back rim and back in;
  - it is missing from the water while away;
  - keepsakes lie on the sand;
  - Feed and Coming up say "Out exploring" with no time;
  - the profile lists its adventures and keepsakes.

## 2. Files

| File | What changed |
|---|---|
| `web/src/game/adventures.js` (new) | The engine, the outcome library, keepsakes, small moments, visitor memory |
| `web/src/game/rules.js` | Wiring: the time step, frozen hunger and health while away, blocked actions, discoveries, Coming up, the `keepMove` and dev actions |
| `server/logic.mjs`, `server/server.mjs` | Journal time taken from the event; event whitelist; one push for a major departure or return; `keepMove` action |
| `web/src/game/game.js` | Solo journal keeps the event's time; major adventure toasts shown on shared tanks |
| `web/src/w3/fishmgr.js`, `fish3d.js` | Away octopus removed from the water; climb out and back in; looks over its keepsakes |
| `web/src/w3/items.js`, `decormgr.js` | Six voxel keepsakes and their rendering |
| `web/src/ui.js`, `main.js` | Feed card "Out exploring"; Coming up with no time; profile lines; keepsake sync while time passes |
| Tests and tools | `adventures.test.mjs` (27 tests), one server test, `tools/adventure_sim.mjs`, `tools/adventure_check.mjs` (browser) |

## 3. State (persistent, synced with the tank)

- **`t.adv`:**
  - `octoAt` and `smallAt`: the next chances;
  - `hist`: the last 60 adventures;
  - `visits`: count per visitor species;
  - `vseen` and `seq`.
- **`t.keeps`:** `[{ id, k, adv, by, byName, at, x, z }]`.
- **Per animal:**
  - `f.restless = { id, at, until, kind, out }`;
  - `f.away = { id, kind, at, until, out, inTank, hunger, fedAt }`;
  - `f.advMem = { n, kinds, items, fav, met, last, pref, keepAt, moved }`.
- Old saves get these fields the first time time passes. Unknown keepsake kinds are dropped.

## 4. Scheduling and rarity

- All times are server time. Randomness is a hash of the tank id, the animal id and the scheduled minute, never `Math.random`.
- **Octopus chances:** every 4–8 days. A homebody often stays in; the go chance is 0.55 × its nature (explorer 1.5, homebody 0.45).
- **Small moments:** every 3–6 days.
- **Budgets:**
  - at most 3 adventures a week per tank, of which at most 2 small moments;
  - a longer absence (anything but a hide) at most once every 6 days;
  - one adventure at a time, with no small moment while the octopus is away;
  - the same small moment is not repeated within 21 days.
- Rates can be configured for testing with `t.flags.advRate`. There are also the dev actions `adventure`, `moment` and `advRate`.

## 5. Eligibility

- **Never:**
  - during onboarding (`tut < 5`) or in a tank's first 3 days;
  - a baby, or an octopus under 3 days old;
  - when hunger is over 55%, it is run down, or its health is under 80%;
  - with a puzzle or a hunt under way, while expecting, or while brooding.
- **Elders:** only hides and short trips.
- **An extended trip needs all of these:**
  - not an elder, and age between 10 days and 70% of its lifespan;
  - at least 3 short or night trips before;
  - happiness of 0.65 or more;
  - a tank at least 21 days old;
  - no extended trip in the last 30 days.

## 6. The absence kinds

| Kind | Duration | Base weight |
|---|---|---|
| hide | 5–20 min | 0.6 |
| short | 30 min–3 h | 0.3 |
| night | 6–12 h | 0.08 × its liking for long trips |
| long | 24–48 h | 0.05 × its liking for long trips, eligible octopuses only |

The "late" outcome makes a trip last 1.5 times as long.

## 7. Outcomes (16)

Two pairs from the brief were merged because they work the same way: "empty den" and "hiding" became `hiding`, and "late return" and "night explorer" became `late` and `nightout`.

1. bottle cap
2. brass key
3. pebble
4. collector's prize (sea glass)
5. favorite find (painted shard, becomes the favorite)
6. tiny spiral shell
7. missing shell (a real collectible turns up by its den)
8. rearrangement (a real decoration nudged)
9. wrong home (tries another real den first)
10. late
11. night explorer
12. quiet
13. hiding (it never left the tank)
14. familiar object (checks its own keepsake first)
15. surprise greeting (someone who looked after the tank in the last 2 hours)
16. unexplained

Each outcome has a weight for each nature, and the octopus's last three outcomes are made less likely. The outcome is chosen at the restless phase. It is checked again on return, and becomes "quiet" if the thing it needed was taken out in the meantime.

## 8. Safety while away

- While an animal is away, `tendFish` skips it. That means no hunger, no illness, no ageing into death and no growth effects.
- The tank's hunger loop skips it too.
- **Blocked actions** (they return `AWAY`): feed, crab, puzzle, hide, sell, release, pet, train, play, touch and move reports, memory reports, notes.
- An away octopus cannot pair, and it cannot start another adventure.
- **On return:**
  - hunger goes back to what it was when it left (never lower), so a trip cannot reset hunger;
  - the meal clock shifts by the time away;
  - ownership, trust and bonds are untouched.
- If it gets hungry (over 70%) while pacing, it simply stays in.

## 9. Keepsakes

- Six kinds: bottle cap, brass key, pebble, sea glass, painted shard, spiral shell.
- They are tiny voxel models in the same style as the rest of the tank, lying on the sand near its den.
- They are not solid, have no shell value and are never shown in the shop.
- Each keeps its adventure id and the octopus that found it.
- At most 6 are on the sand. Past that, the oldest that is not a favorite is removed from the sand but kept in the octopus's record, marked as stored.
- The octopus goes to look over its keepsakes now and then, its favorite most often.
- Carrying works through the `keepMove` action, which records `keepAt` and `moved`. However, no octopus behavior on the phone sends it yet (see section 19).

## 10. Memory

- `advMem` records:
  - the number of trips, and the count of each kind;
  - every item (up to 60);
  - the favorite;
  - a preference for long or short trips, learned from its own history, which then weights the next choice;
  - who greeted it;
  - the last trip, and where its keepsake is and whether it has been moved.
- Its keepsakes feed the existing `inspect` behavior.

## 11. Fish, seahorse and mystery moments

- **Fish:**
  - an unexpected friendship (two fish without a pal, different kinds, not rivals);
  - a favorite corner (from `spotId`);
  - copycat (from `pal`);
  - a standoff with a rival (from `rival`);
  - the brave one (a Brave or Curious fish, with a visitor or the octopus present).
- **Seahorses:**
  - a new holdfast (a real plant);
  - the morning dance (a mated pair);
  - a familiar place (`disc.favhitch`);
  - a curious youngster (a young seahorse or the nursery);
  - together again (a pair together for more than 7 days).
- **Mysteries:**
  - a strange pebble (one at a time, at most one every 30 days);
  - an unusual shell (the same rules);
  - the lost bottle (an unopened bottle more than 2 days old, from the existing bottle system);
  - something moved (the starfish, or a decoration when an octopus lives there);
  - a familiar visitor (the 2nd, 5th and 10th visit of a species);
  - a quiet night (no adventure in 3 days).
- A moment is never offered without what it talks about. For example, there is no rival line in a tank without rivals.

## 12. Phone: the escape and the return

- **Leaving, if someone is watching:** the octopus is taken out of the swimming list and follows a 7-second path. It goes to the back glass, flat against it as it climbs, up over the rim and shrinks away, with a few drips where it went over.
- **Leaving, if nobody is watching:** it is simply not there.
- **Return:** the reverse path, ending at its den.
- **Hiding:** it reappears at its den with no climb.
- A phone opened while the octopus is away never shows it. A phone opened after it came back finds it already home.

## 13. Care, Feed, Coming up, profile

- **Feed screen:** a card "Inky · Octopus · Out exploring · Away" with no Feed button. A hide reads "Hiding somewhere".
- **Coming up:** "Inky is out exploring", with no time.
- **Profile:** OUT EXPLORING, then:
  - the number of adventures and its preference;
  - the keepsakes it has found;
  - its favorite.
- There is no new tab and no dashboard.

## 14. Journal

- **Major trips** (short, night, long) get two tank journal lines: one for leaving and one for coming home.
- **Hides and in-tank moments** go in the animal's own story only.
- Each journal line is saved with the time it really happened (`jat`), on the server and in solo tanks, including a return that happened while every phone was closed. A time in the future is clamped to now.
- Each event carries the adventure id. Tests check there is exactly one return per id.
- These are ordinary journal entries, so hearts and postcards apply to them unchanged. That was not tested separately.

## 15. Notifications

- They use the existing categories and daily limits; normal priority.
- `hitOf` picks a major adventure event, so there is one push for a major departure and one for a return. A hide never sends one.
- **Wording:** "Inky has gone out exploring." and "Inky is home again." Nothing alarming.

## 16. Discoveries

These are quiet: a line in the animal's story, no shells. They appear in the octopus's behavior list.

- **First Escape:** the first trip out of the tank.
- **Home Again:** came back from a night or a long trip.
- **The Collector:** three keepsakes.
- **A Familiar Find:** a second keepsake of the same kind.

## 17. Multiplayer and offline

- Everything is decided by the tank's state and its scheduled times, so the server and every phone get the same result. A repeated advance changes nothing.
- A return is settled by the server's own tick. No phone needs to be open, and the server test checks the journal time.
- Tested: the same tank looked at every hour and every six hours resolves its octopus adventures identically.
- **Limit:** a chance that falls while the octopus is hungry is skipped. So a tank nobody feeds for days simply has fewer adventures. This is intended.

## 18. Edge cases

| Case | What happens |
|---|---|
| Removed while away | The return never fires, nothing throws, and the phone drops the model |
| Old age | No death while away; old age carries on after the return |
| Transfer of ownership | Allowed; nothing about the trip depends on the owner |
| Full tank, or layout changes while away | It still comes home; outcomes that need a missing thing fall back to "quiet" |
| Unknown keepsake data, old saves, updates | Cleaned or created on load |
| Server restart | The state is in the saved world, so it carries on |
| Two phones opening at once | The actions are idempotent; the results are deterministic |

## 19. Test results

- **Rule tests:** 94 rule tests and 27 adventure tests passed.
  - The adventure tests cover state, onboarding, eligibility, phases and times, durations, safety, no hunger reset, ownership, one at a time, natures, rarity, extended eligibility, all outcomes, keepsakes and the limit, the favorite, carrying, memory, discoveries, journal, notifications, offline, multiplayer, edge cases, small moments, Coming up, and the 120-day safety run.
- **Server tests:** 87 passed, including a return resolved with no phone open and its journal time.
- **Browser drill** (`tools/adventure_check.mjs`), passed:
  - it climbs out;
  - it is gone and cannot be fed;
  - Coming up and Feed show "Out exploring";
  - it climbs back to its den, with the bottle cap mesh by the den and the journal line.
- **Seeded 120-day simulation** (`node tools/adventure_sim.mjs --seeds=3`): 18 tanks, three of each nature, a caretaker three times a day.

| Nature | Trips per 120 days |
|---|---|
| explorer | 11–16 |
| trickster | 11–15 |
| showoff | 6–11 |
| watcher | 8–12 |
| collector | 8–11 |
| homebody | 2–7 |

- About 60% of trips are hides, 30% short trips and 10% nights. There were no extended trips in these 18 runs: their eligibility is strict and they are exceptional by design.
- Small moments: about 30 per tank in 120 days (about 9 of them visitor lines).
- Unsafe states, feeds while away, deaths and duplicate returns: 0 in every run.
- **Not run:** a long trip on a real phone over 24 hours, and push delivery on a real iPhone.
- **Not built:**
  - the octopus does not yet pick up and carry a keepsake on its own (the action and its memory exist; the phone behavior that sends it does not);
  - restless pacing writes a line to the octopus's story, but has no special animation yet;
  - wet marks are a few drips at the rim, not lasting marks on the glass.

## 20. Tuning knobs

All in `ADV` and `ADV_KINDS` in `adventures.js`:

- `OCTO_GAP`, `SMALL_GAP`;
- `WEEK_BUDGET`, `SMALL_WEEK`, `MAJOR_GAP`;
- `KEEP_MAX`, `RESTLESS`;
- the duration and weight of each kind;
- each nature's `go`, `long` and `items`;
- each outcome's weights.

To test, use `advRate` (a dev action or `t.flags.advRate`): 10 makes everything ten times as often.
