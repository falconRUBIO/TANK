# Tanklings — core loop refinement report

Branch `claude/our-tank-game-design-xhmavw`. Full simulation tables: `docs/sim/tables.md` (after), `docs/sim/baseline.txt` and `docs/sim/after.txt` (raw output). Run it yourself with `node tools/loop_sim.mjs` (about 30 seconds).

## 1. Executive summary

I audited the claims in the brief against the code. Several were real bugs, a few were not, and the simulation turned up problems the brief did not list. Two of those were the most serious: a care day almost never counted toward the level, and octopus eggs could be blocked indefinitely by fish eggs. Everything below was fixed in the shared rules (`web/src/game/rules.js`), which run on both the phone and the server. That keeps the server authoritative and keeps multiplayer consistent. No save migration was needed: every fix reads existing fields, and no stored value is rewritten.

Pushback, in brief:
- **The feeding countdown was not a bug.** Seahorses intentionally share the octopus hunger rate and threshold, and the time step uses the same rate, so the countdown is already right.
- **Four temperaments was replaced with Three temperaments, in any order.** As designed it needed four separate, deliberate ten-day childhoods, which is the "weeks of repetitive input" the brief warns against.
- **Thresholds stay as they were.** The level thresholds (`LEVEL_AT`) are unchanged; I changed what earns score instead.
- **No new navigation.** The Today sheet keeps its entry point, now the checklist icon at the top of the tank.

## 2. Architecture inspected

- `web/src/game/rules.js` holds all rules. It's imported by the phone (`web/src/game/game.js`) and the server (`server/logic.mjs`).
  - `advance(t, now)` moves the world forward in time.
  - `applyAction(t, a, opts)` applies a caretaker's action; the server checks permission and idempotency first.
- `web/src/game/adventures.js`, `life.js` and `history.js` hold Little Adventures, Emergent Life and Living History. They are called from `advance`.
- `web/src/ui.js` holds the sheets: Today, the Field Guide, Care, Shop and Crew. `web/src/main.js` holds the 3D tank. The phone reports what animals really did through actions such as `observe`, `moment`, `octoMoment` and `octoMove`.
- `tools/loop_sim.mjs` is the simulation; the browser drills are listed in `tools/check_all.sh`.

## 3–4. Confirmed bugs and fixes

| # | What was wrong | Fix | Test |
| --- | --- | --- | --- |
| 1 | **A care day almost never counted toward the level.** `careDays` needed the whole tank in order (hunger ≤ 0.45). One feeding takes 0.3 off and hunger builds about 0.6 a day, so a once-a-day caretaker never qualified: 4 care days in 120 in the simulation. | A care day counts when someone does care that was actually due that day. | Simulation: care went from 8 to 218 score points by day 120 (1× regular). |
| 2 | **Fish eggs blocked octopus eggs.** "One egg at a time" applied to every species, so a tank whose fish kept breeding never let an octopus pair lay. | The octopus clutch hangs in her den beside any fish eggs; there's still one octopus clutch at a time. | `(refine) an octopus pair can lay in her den while fish eggs are waiting…` |
| 3 | **"Well fed" was checked at one random instant.** Octopus eggs required hunger < 0.5 at that moment, which a once-a-day feeder rarely meets. | Well fed now means fed within the last day. | Same test as #2. |
| 4 | **The octopus family goal could become impossible.** Partners can be any two octopuses, but eggs need a female and a male. A tank with two males could pick the goal, tick "partners", and never finish. | The goal is offered only when there's a female and a male, and the partner step counts only a female and a male. | `(refine) the octopus family goal is only offered when there is a mother and a father…` |
| 5 | **Raising credited failed actions.** The credit was recorded before validation, so a refused "hide a treat" for a fish still counted toward Curious. | Credit is recorded only after the action actually happened. | Updated raising tests: a play with no toy counts for nothing. |
| 6 | **Fish had no legitimate path to Curious.** Hidden treats and puzzles are octopus-only. | Chasing the light spot or the bubbles (existing toys) counts toward Curious; the ball counts toward Playful. | Raising tests and the simulation. |
| 7 | **One afternoon could decide a childhood, and Calm nearly always won.** Thresholds were 5 pets, 3 plays, 2 seeks, 4 fed days, with no daily cap. Feeding on 4 days made Calm the default. | Each kind counts at most twice a day. Thresholds are now over the whole childhood (8 pets, 6 plays, 4 seeks, 8 fed days), and "biggest meal" surprises no longer count as fed days. | `(refine) raised the way it already leaned…`: twelve plays in one afternoon count as 2. |
| 8 | **A fish raised toward a trait it already had recorded nothing**, so it didn't count for the raising goal. | `raisedAs` and the stat are recorded with a "more so for the way you raised it" line. | Same test. |
| 9 | **Size and life stage used different clocks** (`hatched` vs `born`). A well-cared-for hatchling's 8-hour head start showed in its stage but not its size. | `growthScale` uses `born`, the same clock as `stageOf`. Ages are not changed. | `(refine) size and life stage run on one clock…` |
| 10 | **Some free fish could be sold for shells.** A legacy fish with no recorded price counted as bought, including starters, gifts, sent fish, visitors that stayed, bred fish and octopuses. | Anything marking a fish as free makes its resale value 0. Genuine legacy shop fish still sell. | `(refine) selling: a fish from before prices were kept…` |
| 11 | **The daily special's fallback ignored level.** With nothing in the tank to go on, it could offer a fish the tank had not unlocked. | The fallback picks only from unlocked single fish (never an octopus). | `(refine) the daily special is always a fish the tank can already buy` (60 days checked) |
| 12 | **Decisions were invented.** "Sick" could pick any fish. "Chase" could pick any two fish. Decisions came every 3–4 days, and the clock reset even when nothing qualified. | Each decision needs a real cause (see §12), and they come 4–7 days apart. When nothing is real, the game checks again tomorrow rather than inventing one. | `(refine) decisions come only from something real…` |
| 13 | **Mysteries invented animal history and repeated.** "Inky's hidden stash: a shiny pebble" was made up, "Inky went for a long walk in the night" was stated as fact, and the same kind could appear two days running. | The stash ending appears only if the octopus really brought a keepsake home. The tracks ending describes arm prints without claiming an action. A kind never repeats on consecutive days. | `(refine) the daily mystery is never the same kind two days running…` (80 days) |
| 14 | **The wrong animal could fill a Field Guide page.** `witness()` didn't check the animal's kind, so a goldfish could file an octopus-only page. | The reported animal must match the page's animal. | `(refine) a Field Guide page is only filled by the kind of animal it is about` |
| 15 | **Breeding goals stalled silently in a full tank.** No eggs can be laid in a full tank, but only one step's hint said so. | Every breeding step's hint says the tank is full and what to do. | Simulation (goal stalls are listed in tables.md). |
| 16 | **The goal next-step lookup was fragile.** It used `indexOf` inside `find`. | It uses the index directly. It was not producing wrong results. | The goal tests. |

**Not a bug:**
- **Feeding countdown (Part 3).** `dueIn` for crab and mysis uses the octopus rate and threshold. Seahorses do share them: the time step (`rules.js`, the own-hunger loop) applies `OHR` to every `ownHungry` animal, so the UI countdown, eligibility and the server agree.
- **Duplicate mystery and decision rewards.** Both are guarded once per day (`m.done`) and once per decision (`D.done`), and the existing tests check it.

## 5. Files modified

- `web/src/game/rules.js`: all rule fixes, `SCORE_W`, the spire price, goals, decisions, mysteries, raising, eggs and resale.
- `web/src/game/rules.test.mjs`: 9 new `(refine)` tests and 4 tests updated to the new behavior.
- `web/src/ui.js`: the Today sheet sections.
- `web/sw.js`: cache bumped to v168.
- `tools/loop_sim.mjs`: rewritten.
- `docs/sim/*`: simulation output.

## 6. Save migrations

None. No field is rewritten, and old records are only read more carefully (resale provenance, a goal's `base` stats). Two things do shift for existing tanks:
- **Raising:** a fish in the middle of childhood keeps its counts, but the higher thresholds may land it on a different temperament than before.
- **Three temperaments:** an active "raise" goal now shows the new three steps. Progress is computed from stats since the goal was chosen, so nothing is lost.

## 7–9. Feeding, growth and raising

- **Feeding:** no change to species rates, which were already consistent (§3–4, "Not a bug").
- **Growth:** one clock (#9).
- **Raising:** bounded counts, whole-childhood thresholds, credit only for real actions, a fair Curious path, and matching traits still recorded (#5–#8).

What the raising rules now produce, all tested:

| How it was raised | Result |
| --- | --- |
| Mostly petting, over at least 4 days | Brave |
| Mostly play, over 3 days | Playful |
| Mostly light, bubbles, treats or puzzles | Curious |
| Fed on 8 of its 10 days | Calm |
| Mixed attention with no clear lean | Keeps its nature. Nothing is forced; the card shows the lean. |
| Little attention | Shy |

Multiple caretakers' actions add up on the same animal.

## 10. Goals

- **Octopus family:** needs a female and a male (#4), and octopus eggs are no longer blocked (#2, #3).
- **Three temperaments:** replaces Four temperaments. It counts any three different temperaments, so the next step is always clear.
- **Full-tank hints:** on every breeding step (#15).

Goals are already achievement-based: steps count stats since the goal was chosen, and each step stays done once ticked (`g.done[i]`). The two condition steps, the thicket and a den for every octopus, also stay done once met. This is intentional and now stated in the code.

## 11. Field Guide

Every page has a real trigger:
- **Behavior pages:** the phone reports what an animal really did (`moment`, `octoMoment`, `observe`) and is rate-limited per animal.
- **Hatching, octopus hatching and seahorse birth:** filled only when someone watched.
- **Puzzle:** filled when the octopus solves the jar.
- **Visitor:** filled when a caretaker greets one.

Photos come from the moment itself (or a staged picture of the actual animal if the page filled before photos were kept). Pages now count 6 toward the level instead of 3, and new species count 4 instead of 2, so discovery outweighs repetition (§16).

## 12. Mysteries and decisions

**Decisions now need a real cause:**

| Decision | What has to be true |
| --- | --- |
| Sick | A fish's ill-health has been building for half a day or more. |
| Chase | A bully (per the species data) and a smaller or shy fish, two of a kind that won't share, or an existing grudge. |
| Lid | A bold, curious octopus, well enough to want out and not already kept in. The choice moves the real adventure scheduler (`t.adv.octoAt`). |
| Den | More animals than dens, as before. |

Decisions come 4–7 days apart. The simulation shows 18–21 decisions in 120 days for regular-or-busier households, one every 6–7 days, and fewer for casual solo tanks, where there is less going on.

**Mysteries:** no repeat of a kind on consecutive days, and no invented octopus history (#13). Nothing is lost by missing one.

## 13. Shop and resale

- The special stays within the tank's level (#11). It really carries the advertised gene: `makeFish` writes the allele into the genes, and inheritance is unchanged.
- The earned torii and lighthouse can't be bought: `buyDecor` refuses `earned` items, as before.
- Resale is fixed (#10). Permissions are unchanged and enforced in the rules (`canSell`); dead fish can't be sold.

## 14. Today sheet

From top to bottom:
1. The tank's mood and its level bar.
2. **Needs care:** only care that is actually due (hungry fish, your own octopus or seahorse, cloudy water, the glass, an unwell animal). When nothing is due: "Everyone is fed and the water is clean."
3. **Happening in the tank:** optional things to look at (a decision with its choices inline, eggs ready to hatch, a visitor, an octopus out exploring, the mystery).
4. **Your goal.**
5. **Coming up:** the next two items, skipping a hatching already shown above.
6. **What happened:** the latest notices.

Nothing appears in two sections.

## 15–16. Economy and levels

**Score weights (`SCORE_W`):**

| Source | Before | After |
| --- | --- | --- |
| Care day | 2 | 2 (and now actually counted) |
| Mystery | 2 | 1 |
| Decision | 3 | 3 |
| Hatching | 4 | 2 |
| Baby grown | 6 | 6 |
| Raised temperament | 4 | 4 |
| Rare color | 10 | 10 |
| Goal | 15 | 15 |
| **Field Guide page** | 3 | **6** |
| **New species** | 2 | **4** |

For a regular solo tank at day 120, mysteries are now 101 of about 850 points (they were 218 of 850), and Field Guide pages are 84 (they were 39).

**Spire:** 400 → 300 shells.

**Levels**, median day before → after:

| Household | Level 4 | Level 8 |
| --- | --- | --- |
| Solo casual | 29 → 24 | 102 → 84 |
| Solo regular | 22.5 → 17 | 83 → 64 |
| Solo engaged | 13 → 11 | 58 → 51 |
| Four caretakers, mixed habits | 13 → 10 | 60 → 58 |

A casual player visiting about once a day reaches every level; engaged players get there about 1.6× faster.

**Income** is 7–12 shells a day for solo players and 14–19 for four caretakers. The wallet is shared, so it doesn't scale 4×.

**Centerpieces:**

| Centerpiece | Typical purchase day |
| --- | --- |
| Arch (120) | Day 50–100 |
| Bridge (150) | Day 70–110 |
| Crystal (190) | Day 85–115 for busier households |
| Spire (300) | Bought in only 1 of 84 runs within 120 days |

The spire is effectively the 4–5 month aspiration; see §25.

## 17. Simulation method

- **Real opening:** an empty tank; the first caretaker chooses an octopus; each friend gets their own octopus; then the tutorial steps.
- **Households:** 1, 2 or 4 caretakers. Each person has their own visit slots and chances, minutes watched, how much they play with the young, how often they notice optional things, and how they save.

  | Habit | Visits a day |
  | --- | --- |
  | Casual | 1, 75% of days |
  | Regular | 1–2 |
  | Engaged | 3 |
  | Mixed | engaged, casual, regular, casual |
  | Returning | regular, away days 12–18 |
- **Players act within their permissions.** Each feeds only their own octopus, decisions follow turns, and players follow the goal's hints (pair the goal's color, raise toward the missing temperament, make room when the tank is full).
- **The phone's reports are emulated** where the rules depend on them: an octopus moving into a free den. Field Guide sightings use **assumed** per-minute rates by rarity (`FIELD_RATE`), so treat those numbers as a stand-in.
- **Every wallet change is a ledger entry** (who, what, amount, balance before and after), so gross earned and spent are measured, never inferred from the change in balance.
- **Coverage:** 6 seeds per household, snapshots at days 7, 30, 60 and 120, medians with ranges. It is reproducible: same seeds, same numbers.
- **What it is not:** it does not predict retention.

## 18–22. Results

All tables are in `docs/sim/tables.md`. Highlights against the targets in Part 14:

| Milestone | Target | Measured median (range across households) | Verdict |
| --- | --- | --- | --- |
| First fish purchase | 1–2 | 3.1–6.6 | Late. Start shells are 10 and a goldfish costs 10, but the simulation buys a plant first; a real player may buy the fish first. |
| First Field Guide page | 1 | 0.1–5.6 | Assumed rates |
| First mystery | 1–3 | 0.1–0.6 | OK |
| First decision | 4–7 | 3.3–5.1 (16.6 solo casual) | OK; casual solo tanks have fewer real causes |
| First pairing | 5–10 | 6.1–25.5 | Busy shared tanks pair later (more fish, more caretakers' own fish) |
| First hatching | 8–15 | 9.3–13.5 | OK |
| First raised temperament | 12–20 | about 10 (the starter octopus) | Slightly early |
| First octopus adventure | 7–21 | 8.3–31 | OK |
| First rare color | 20–45 | 27.6–60.6, not reached in some runs | Slow for casual and busy shared tanks |
| First goal finished | 14–30 | 11–44.6 | Mostly OK |
| Second-generation adult | 25–45 | 37–48.5 | Slightly late |

Animal deaths: 0 in every household within 120 days (lifespans are longer). Neglect warnings over 120 days: 0 for most households, 1–3 for casual shared tanks, and 8–10 for returning households, all from the week away.

## 23. Regression results

- `npm test`:
  - 97 rule tests (the count printed mid-file), plus the care and selling checks, plus 10 `(refine)` tests appended after: all pass.
  - Adventures 27, Emergent Life 22, Living History 23, Biscuit 10, server 91: all pass.
- **Browser drills** (`tools/check_all.sh`, quick set): see the run result in the commit or chat message that accompanies this report.

## 24. Remaining problems

- **The spire is rarely reached in 120 days.** It's the last thing a household buys.
- **Some color goals sit at "Pair two carriers" for weeks** when only one carrier exists and the tank is full or the day's special doesn't fit.
- **The first fish purchase is around day 3–6**, not day 1–2.
- **Toasts run about 5–8 a day** over 120 days (up to 11 a day in a busy shared tank's first week). These are in-app messages; pushes have their own daily cap. They could be folded further.
- **The lid decision** relies on an octopus's nature. There's no new "pushing at the lid" animation before it appears.
- **Field Guide sighting rates in the simulation are assumptions.**
- **Untested here:** real four-phone play, server restart during a decision, and reconnection mid-action. The server tests cover idempotency and permissions, but these paths weren't exercised by this simulation.

## 25. Needs your approval

1. **Starting shells.** Raise them from 10 to about 20 so the first fish can come on day 1. This changes onboarding.
2. **The spire.** Lower it further (about 220), or keep it as the long aspiration it is now.
3. **A "pushing at the lid" animation** before the lid decision. That's new client behavior.
4. **Folding more routine journal toasts** in shared tanks.
5. **Easier carriers.** Offer the goal color's carrier as the special more than once a week while a color goal is stuck.
