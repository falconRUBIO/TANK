# Emergent Life: implementation report

**What it does:** habits that grow out of what the animals really do and fade when they stop, keepsakes that build up a history, small accidents, companions who notice who is missing, young animals that take to their family's places, and visitors that remember the tank.

**Where it lives:**
- The persistent part is in `web/src/game/life.js`. It is called from `rules.js`, so it runs on the server for shared tanks and on the phone for solo tanks.
- The moment-to-moment behavior is in `web/src/w3/fishmgr.js` and `fish3d.js`, on the phone that runs the animals.

## 1. Existing systems reused (none duplicated)

- **Octopus familiarity:** `f.mem.fam` with `k` and `n`, plus favorites (`likes`) and forgetting (`memCap`). It is updated only when the octopus really handles something (the `octoTouch` report).
- **Seahorse holdfasts:** the memory and favorite from the `fishLog` reports (`log.hitch`, `log.fav`), the existing holdfast picker, and the existing rule that two seahorses never share a stem.
- **Fish:** places and areas (`log.places`, `log.lv`), `spotId`, `pal`, `rival`, and the `pick` target chooser.
- **Daily rhythm:** night rest, homing and the morning seahorse dance were already there.
- **Records:** memorials, `parents`/`gen` genealogy, and each animal's own story.
- **From Little Adventures:** keepsakes (`t.keeps`), the `keepMove` action, and visitor counts.
- **Attention:** a tap on the tank canvas.

## 2. New systems

1. **Habits by time of day.** An octopus that visits the same thing at the same time of day, on several days, has a habit. Habits steer where it goes and fade when the visits stop.
2. **Slow fading.** Octopus familiarity, seahorse holdfast time and fish areas fade a little each day they are not used, so a new favorite can take over.
3. **Keepsake histories.** These record carries, the days it was carried, past places, who handled it, and when it was left by the den. A milestone line is written once, and a profile story is built from the record.
4. **Carrying.** An octopus fetches a keepsake it is attached to and carries it to its den. Sometimes it drops it on the way.
5. **Accidents:**
   - **Too heavy:** it tugs twice at something it cannot move, then gives up.
   - **Dropped it:** see carrying.
   - **Interrupted:** a tap on the glass makes it leave the fetch for later.
6. **Quiet hours.** When nobody has tapped for 90 seconds, fetching and carrying are twice as likely. Players can still catch it in the act.
7. **Relationships in movement:** best friends settle near each other at night, and a fish picks somewhere else rather than swim into its rival.
8. **Reaction to loss.** For 3 days after a close companion dies of old age, a fish keeps going back to their place. This shows in its story and profile, never as a journal line or a penalty.
9. **Family.** A young seahorse is drawn to the plant its parent used until it has tried it; after that, its own experience decides. If it then makes that plant its own favorite, one journal line marks it. The memorial now keeps each animal's place, so this still works after the parent has died.
10. **Visitor memory:**
    - each species remembers its first visit, number of visits, last visit, the animals it met, and its place;
    - a returning visitor goes back to the same place and stays longer, up to twice as long;
    - the journal says so on the 2nd, 5th and 10th visit.

## 3. Files changed

| File | Change |
|---|---|
| `web/src/game/life.js` (new) | The module |
| `web/src/game/rules.js` | Wiring: `octoTouch` records the time of day; `dailyGift` stores the tank's time zone; daily life step; `keepMove` records history and is idempotent; visitor memory; memorial place and keepsakes; exports |
| `web/src/game/adventures.js` | Visitor lines moved to the moment the visitor arrives |
| `web/src/w3/fishmgr.js` | Carry, drop, tug, attention, family plant, missed companion's place, night friends, rival avoidance, visitor place |
| `web/src/w3/fish3d.js` | Habit-steered revisits; the family plant in the holdfast choice |
| `web/src/main.js` | `keepMove` reports, the attention signal, profile lines |
| Tests and tools | `life.test.mjs` (17 tests), `tools/life_sim.mjs`, `tools/life_check.mjs` (browser), `check_all.sh`, `package.json` |

## 4. Data structures

All bounded:

- **`f.mem.fam[id]`:**
  - `tod`: visits in each of four day parts, capped at 99;
  - `days`, `dl`: the count of distinct days and the last day.
- **`f.habits`:** at most 3 entries of `{ id, tod, days }`.
- **`f.moments.habits`:** habits already told, at most 8.
- **`f.loss`:** `{ id, name, at, until, place }`, cleared after 3 days.
- **`k.h` on a keepsake:**
  - `carries`, plus `days` (at most 7);
  - `places` (at most 4);
  - `by` (at most 4 animals);
  - `denAt`, `said`, `last` (the last report id).
- **`t.visitMem[species]`:** `{ first, n, last, met (at most 6), spot }`.
- **`t.life`:** `{ day, dead (at most 30) }`.
- **`t.tzMin`.**
- **A memorial** gains `place` and `keeps`.
- **Size:** a busy two-octopus tank's saved world after 120 days was 14 KB in all.

## 5. How routines develop

- Each real handling counts its day part (morning 5–11, afternoon 11–17, evening 17–22, night) in the tank's local time.
- Once a day, a thing becomes a habit when all of these hold:
  - it was handled on at least 3 different days;
  - it was handled in the last 4 days;
  - at least half of the visits fell in one day part.
- One visit is never a habit.
- On the phone, a habit for the current day part is where the octopus goes 60% of the time when it looks for something to visit. Hunger, fear, rest, play, jars, hunts and the glass all still come first.

## 6. How routines fade or change

- **Octopus:** anything not visited for 3 days loses 4% familiarity and 10% of its day-part counts each day.
- **Seahorse holdfast time:** fades 3% a day.
- **Fish areas:** fade 5% a day.
- A habit lapses after 4 days without a visit.
- A removed decoration is forgotten through the existing rules, and its habit goes with it.
- A moved one is still remembered as moved (existing). The octopus finds it again with the existing "found it in its new spot" line.
- **Tested:** a morning boulder habit disappears after ten days without visits, and an evening fern habit replaces it.

## 7. Personality

- How fast familiarity grows comes from curiosity and affinity (existing).
- The six natures differ in:
  - how often they revisit and look for new things (existing: `revisitP`, `noveltyP`);
  - how readily they fetch a keepsake: collector and trickster 1.4, homebody 1.1, others 0.8;
  - how often a trickster lets something slip (1.5 times);
  - how likely a bold one is to try tugging something too heavy.
- In the simulation, two octopuses sharing a tank never ended up with the same set of habits (0 of 96 two-octopus runs).

## 8–9. Objects with histories, and how animals use them

- Each keepsake keeps its origin (the adventure, who found it and when) and records carries, the days carried, its last four places, the animals that handled it, and when it was left by the den.
- A keepsake carried on 3 or more different days and finally left by the den gets one journal line, for example: "Biscuit has been carrying the smooth pebble around for 4 days. It finally left it beside the coconut shell."
- The profile tells the story only from the record, for example: "Smooth pebble: Biscuit found it on day 34, carried 3 times, kept beside its den for 61 days." The days beside the den count to the octopus's death if it has died.
- Keepsakes stay in the tank after their octopus dies, and the memorial lists them.
- **Not done:** decorations do not yet keep a history of their own. Octopus familiarity per decoration and fish places are the existing per-animal records; no per-object summary was added.

## 10. Accidents

All harmless, and all shown through movement and the octopus's "thought" line, never as bubbles:

- **Too heavy:** the octopus wraps a boulder, pillar, gate, driftwood, chest, arch or brain coral. It leans back twice, gives up and rests. The decoration never moves.
- **Dropped it:** about 15% of carries slip a few seconds in. The keepsake lands where it slipped, and the octopus may fetch it another time.
- **Tapped:** it leaves a fetch for later.
- **Not built:** wrong entrance, stubborn object, fish startled by bubbles, a fish losing its school, and a seahorse missing its first grip. The existing fear and startle system and the rule that a seahorse picks another stem when one is taken already cover part of this.

## 11. Relationships in movement

- **Best friends:** at night they settle near each other, 60% of the time when choosing where to go. By day they already swim together (existing).
- **Rivals:** a target too close to the rival is moved away.
- **Octopus:** its memory of fish and caretakers (existing `mem.fish`, trust, bonds, buddy and rival) is unchanged.
- **Not built:** attention sensitivity ("jealousy"), as the brief allowed.

## 12. Visitors

See item 10 in section 2. The visitor's place is a real decoration chosen at its first visit, and it goes back there every time.

## 13. Day and night

- Existing behavior is unchanged: night rest by species, an octopus going home when it is tired or at night, the morning seahorse dances, and quieter fish at night.
- New: habits are tied to a day part, and best friends rest together at night.
- **Not built:** octopuses being more exploratory at night, and visitors being more likely at night.

## 14. Family history

- **Kept:** parents, generation and birth (existing), plus the memorial's place and keepsakes.
- **Young seahorses:** drawn to the family plant until they have tried it. The line "Apollo's daughter Luna has taken a liking to the same sea grass." is written only when all of these hold:
  - the relationship is recorded;
  - the parent really favored that plant (its holdfast record, or its memorial place);
  - the young one's own favorite has become the same plant.
- **Not built:** fish do not yet have inherited place preferences, and no personality tendency is inherited beyond the existing genes.

## 15. Journal milestones

- **Level 1, ordinary behavior:** visiting, carrying, a drop, a tug. Nothing is written.
- **Level 2, developing habits:** the profile shows "Every morning: the reef boulder", "Misses Pip…", keepsake stories and the animal's own story lines.
- **Level 3, milestones:** each is written once.
  - a new habit (each habit told only once in an animal's life, at most one every 10 days per animal);
  - a keepsake left by the den after 3 days of carrying;
  - a family place;
  - a visitor's 2nd, 5th or 10th visit.
- **In the simulation:** about 5 habit lines per tank in 120 days and 0 duplicate lines. The whole journal settled at about 1.8 lines a day.

## 16. Little Adventures

The chain the brief describes is now one connected record:

1. An adventure brings home a keepsake.
2. The keepsake gets a history.
3. The octopus visits it, fetches it, sometimes drops it, and carries it to its den.
4. Another phone sees the same position.
5. The milestone line, the profile story and the memorial all read from that record.

## 17. Multiplayer

- Long-term state changes only through server-checked actions (`octoTouch`, `keepMove`, `fishLog`) and the daily step, which runs once per day per tank.
- `keepMove` carries a report id, so a second phone or a handoff repeating the same report counts once.
- `octoTouch` already ignored repeats within 45 seconds.
- Only the director phone reports.
- **Tested:** two copies of a tank given the same reports stay identical, including a copy restarted from the saved state.

## 18. Offline progression

- The daily step looks at each day once, however often the tank is opened.
- A tank closed for a week catches up in a single step and writes at most one habit line.
- Older saves start counting from their first day under the new rules. Nothing about the past is announced, and no deaths from before are mourned.

## 19. Performance

- **Server:** about 2 ms per simulated tank-day, including all the rules.
- **Phone:**
  - one keepsake scan every 70–160 seconds;
  - a per-frame loop only for an octopus that is carrying or tugging;
  - no new meshes except the keepsakes, which already existed.
- **Network:** one action per carry or drop.

## 20. Automated tests

- **Unit and server tests:** 94 rule tests, 27 adventure tests, 17 Emergent Life tests and 87 server tests passed.
- **The 17 Emergent Life tests cover:**
  - habit formation (only from real visits), told once;
  - fading and replacement, and the tank's time zone;
  - personality, and different routines in one tank;
  - keepsake history and milestone, deduplicated, idempotent and bounded;
  - a keepsake story that is accurate after death;
  - moved and removed decorations;
  - the family preference (and none for a different plant);
  - the memorial place;
  - loss: quiet and temporary;
  - returning visitors, and longer stays;
  - migration of an older save;
  - bounded memory over 120 days;
  - copies staying in sync, and the once-a-day step catching up.
- **Browser drill** (`tools/life_check.mjs`), passed:
  - the octopus fetches its keepsake, carries it and leaves it by its den, and the tank records it;
  - a drop on the way;
  - a tap interrupts the fetch;
  - the tug and give-up, with the boulder never moving;
  - a fish missing its companion heads for their place 30–38% of the time against 0%.
- **Weak check:** the drill's profile step only checks that the page does not show "undefined", because the profile card cannot be opened from the drill.
- **Not tested:** iPhone performance on a real device.

## 21. Simulation

`node tools/life_sim.mjs --seeds=2` ran 4 kinds of tank (two octopuses; octopus and seahorses; mixed; watcher and show-off) at 3 activity levels (three times a day, once a day, once a week), with 2 seeds each, for 7, 30, 60 and 120 days.

| Days | Habits per tank | Journal lines a day | Visitor returns told | Duplicates | Saved size |
|---|---|---|---|---|---|
| 7 | 4.0 | 4.7 | 16 | 0 | 8 KB |
| 30 | 4.4 | 2.6 | 78 | 0 | 10 KB |
| 60 | 4.3 | 2.1 | 134 | 0 | 12 KB |
| 120 | 4.3 | 1.8 | 206 | 0 | 14 KB |

- About 4.2 distinct habits per tank, and octopuses knew all 8 reachable things, so no single habit took over.
- Activity level barely changed habits (4.3 at every level), so nobody needs to be there every day.
- The reports in the simulation are a model of what the phone sends, not the phone itself.

## 22–23. Known limitations and partial features

- **Decorations** do not yet keep a history of their own; only keepsakes do (see 8–9).
- **Not built yet:**
  - wrong entrance;
  - a stubborn object;
  - fish accidents;
  - a seahorse missing its grip;
  - social learning beyond the family plant;
  - inherited fish place preferences;
  - attention sensitivity ("jealousy");
  - octopuses being more active at night;
  - visitors being more likely at night;
  - a second octopus investigating another's keepsake on purpose. It can still come across one: 30% of the time it looks at keepsakes that are not its own.
- **Days carried** are counted per keepsake, not per octopus. A keepsake carried by two octopuses counts both.

## 24. Recommended next

1. Give decorations a bounded history of their own (first and most frequent visitor), to show in the Collection.
2. Add fish accidents (bubble startle, rejoining a school) on top of the existing fear system.
3. Make octopuses more active at night, by personality.
4. Let one octopus investigate a keepsake another octopus has just moved.
5. Track a family preference for fish.

Screenshots from the drills are saved in `/tmp/life/` and `/tmp/adv/` when the drills run.
