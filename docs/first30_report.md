# Tako Cove — first 30 days polish: report

Branch `claude/our-tank-game-design-xhmavw`.
- Simulation tables: `docs/sim/tables.md`, from `docs/sim/after.json`.
- Run the simulation with `node tools/loop_sim.mjs`, then `node tools/sim_tables.mjs`.

Numbers are medians across 6 seeds unless a range or a seed count is given.

## 1. What changed

- **Big moments are an occasion.** A card with a real photo of the animal is shown once on every phone, either when it happens or the next time that phone opens the tank. The moments are:
  - a seahorse expecting
  - eggs laid
  - babies born or hatched
  - a baby grown up
  - the octopus sneaking out
  - the octopus back home

  A very sick animal and a death already had their own cards, and those stay as they were. While an animal is expecting or eggs are growing, Happening in the tank shows a countdown.
- **Real octopus lid behavior.** Now and then the octopus rises to just under the lid and presses its arms against it, using the existing come-to-the-glass state with a new lid variant. How often depends on its nature (explorers and tricksters most, homebodies rarely). The phone that runs the animals reports each sighting to the server (`octoLid`, at most once an hour per octopus), and the server records it on the octopus (`f.lid = { n, at, first }`). A lid decision can only come from an octopus seen at the lid at least twice in three days. The decision's outcomes still change the real adventure scheduler, and "Weigh the lid down" now keeps its own record (`adv.lidUntil`) instead of guessing from the adventure date.
- **Octopus adventures and eggs work for once-a-day caretakers.** An octopus fed once a day settles at health about 0.6 and is over the hunger line for part of the day. Adventures (both the chance and the moment of leaving) and egg-laying required health 0.8 and low hunger at that exact instant, so they rarely happened for casual players. Now "fed within the last day" counts as fed, and health 0.55 counts as well enough. A neglected octopus still stays home. Measured with 12 seeds for a solo casual player: first adventure on day 21 in 12 of 12 runs, versus day 64 in 8 of 12 before.
- **Help for stuck color goals.** If a color goal hasn't moved for 7 days (`STUCK_DAYS`), the daily special carrying that color sells at the normal price instead of +40%. It still has to be bought, paired and bred.
- **Fewer routine toasts.** These now go to the journal only:
  - the daily feeding surprise (it already had its own card in the tank)
  - eggs laid and a seahorse expecting (the new card covers them)
  - requests, "grew!", birthdays under 30 days, and the daily team glow (from the previous round)
- **The goal picker shows pace and prerequisites.** Each goal lists its measured typical time and what it needs (for example "About four weeks · needs a female and a male octopus"). A player's first set of offers always includes a quick goal (Raise a family or Tank detective).
- **Hatchling photos retry.** A hatch or birth photo taken while the baby is still coming out of its egg used to fail and never retry. It now tries again, up to three times.
- **Simulation.** Two new profiles, a deliberate rare-color breeder and a spire saver. The simulation also records lid sightings the way a watching phone does, per-goal times, and first-week differences.

## 2. Deliberately left unchanged

- Level thresholds (`LEVEL_AT`) and score weights. The breakdown in §14 shows no clear imbalance.
- The spire price (300).
- Lifespans and the mortality rules.
- Caretaker permissions.
- The decision options.

## 3. Root cause of the late first fish

The simulation, not the game. The old simulated players bought two plants before any fish. With the original 10 shells, a goldfish (10) was affordable from the start; the delay came only from that spending order. Nothing in the tutorial, unlock levels, permissions or capacity blocked a first fish.

## 4. Starting shells

Changed from 10 to 20 in the previous round, which this brief approved. That gives a real choice on day 1: a fish costs 10–20, and there's still something left for a plant. Existing tanks got no bonus; only new tanks start with 20. Over 120 days, income and level timing barely changed (§15).

## 5. First fish timing

Day 0.1–0.6 in every household. The simulated player chooses, names and introduces it; nothing is bought automatically.

## 6. Spire savings

A player who saves every shell from the day the spire unlocks:

| Household | Spire unlocks | Can afford it, and buys it | Wait |
| --- | --- | --- | --- |
| Solo regular | day 66.5 (57–80) | day 84.6 (76–99), all 6 runs | about 18 days |
| Two caretakers | day 58.1 | day 74.5, all 6 runs | about 16 days |

Income while saving is about 12.5 shells a day solo and 14 for two caretakers. The cost is skipping other decorations for two to three weeks. The price stays at 300: it's reachable on purpose, and nothing requires it.

## 7. Lid behavior

See §1. Verified in the browser: the octopus rose to y 11.9 (just under the lid) in the lid state, and the server accepted and recorded the sighting.

Tests:
- `(first 30) a lid decision only comes from an octopus really seen testing the lid…` covers: no sightings means no decision; once an hour at most; never while the octopus is away.
- A four-caretaker server test checks that two phones reporting the same sighting count it once.

The animation reuses the glass pose, pointed upward. It reads as "at the lid", but there's no special pushing gesture.

## 8. Messages

Prominent toasts, counted tank-wide in the simulation:

| Household | Before this work (start of the previous round) | Now, over 120 days | Now, first week |
| --- | --- | --- | --- |
| Solo | 5–8 a day | 2.4–3.1 a day | 2.3–5.0 a day |
| Four caretakers | 7–11 a day | 3.4–4.6 a day | 6–10 a day (new arrivals and first milestones) |

In a shared tank, a toast from the server is only shown to the person who caused it, plus a few kinds that everyone sees (goals, decisions, discoveries). So what each person sees is lower than these tank-wide counts. The journal keeps every line.

## 9. Carrier help

See §1. Measured on deliberate breeders (12 seeds):
- **Without the help:** first rare color in 12 of 12 runs, median day 31.6 (range 14–49) solo and 30.6 two-caretaker.
- **With it:** day 34.5 (range 14–42) solo and 31.5 two-caretaker.

So it barely changes the median and trims the worst case. Stalls came from full tanks and pairing choices, which the hints from the previous round now address.

## 10. Rare-color timing

Median first rare color (all 6 runs unless noted):

| Household | Day |
| --- | --- |
| Solo casual | 96.5 (4 of 6 runs) |
| Solo regular | 41.5 |
| Solo engaged | 24.3 |
| Breeder | 31.6 |
| Two caretakers, regular | 42.6 |
| Four caretakers, mixed | 31.6 (5 of 6 runs) |

Casual players who never aim for one get one late or not at all. Anyone who pursues one gets one around day 25–45.

## 11. First week

Real, checkable differences between day 1 and day 7, counted from the tank state: **8 for a solo casual player, 9 for every other household.** They are:
- a new fish
- decorations
- a mystery found
- the octopus grown
- the octopus knowing you (bond)
- a friendship between fish
- a den of its own
- a Field Guide page
- eggs or babies (from regular players up)

The den and the Field Guide page depend on the simulation's stand-ins for what the phone would report. Even without those, there are at least 6.

## 12. Field Guide observation

(see the appendix: measured in the real game in a browser)

## 13. Goal pacing

Median days from choosing a goal to finishing it (all households, 6 seeds):

| Goal | Finished | Median days |
| --- | --- | --- |
| Raise a family | 46 of 48 | 4.2 |
| Three generations | 42 of 44 | 5.2 |
| Tank detective | 47 of 48 | 8 |
| Ember | 19 of 27 | 8 |
| Ghost | 13 of 20 | 15 |
| Field naturalist | 24 of 42 | 18 |
| A peaceful tank | 18 of 18 | 18 |
| Gold | 25 of 40 | 19.7 |
| Blue | 29 of 33 | 20 |
| Three temperaments | 22 of 64 | 23.2 |
| Octopus family | 31 of 36 | 24 |
| Rare color | 41 of 42 | 27.6 |

Three temperaments is the slowest and least finished, and the picker now says "Several weeks". The first offers always include a goal that takes days.

## 14. Level progression and score make-up

**Median day reached** (baseline = the start of the previous round):

| Household | Level 4 | Level 8 |
| --- | --- | --- |
| Solo casual | 29 → 23.6 | 102.5 → 86 (3 of 6 runs by day 120; with 12 seeds, 9 of 12, median 86.5) |
| Solo regular | 22.5 → 18.1 | 82.6 → 63.6 |
| Solo engaged | 13.1 → 11.1 | 58 → 50 |
| Four caretakers, mixed | 13.1 → 10.1 | 60 → 63.1 |

These match the targets in the brief (84 / 64 / 51 / 58) closely.

**Score make-up** (share of the total):

| | Day 30 | Day 120 |
| --- | --- | --- |
| Routine (care days, mysteries, decisions, hatchings) | 33–56% | 41–55% |
| Life milestones (babies grown, temperaments, rare colors) | 13–32% | 29–41% |
| One-off discoveries (Field Guide, species, goals) | 25–40% | 13–20% |

One-off discoveries shrink over time because there are only so many of them. That's natural, not an imbalance, so the weights stay.

## 15. Economy (day 120)

- **Gross income:**

  | Household | Shells a day |
  | --- | --- |
  | Solo casual | 9.7 |
  | Solo regular | 12.0 |
  | Solo engaged | 13.7 |
  | Shared tanks | 12–15.7 |
- **Spending:** spending matches income, ending wallets are 82–232, and every decoration open by then is owned (26–28 of 27; the count includes earned decorations).
- **Centerpieces:** see `docs/sim/tables.md`. Arch around day 50–100, bridge 70–110, crystal 85–115. The spire is reached by savers.

## 16. Mortality and neglect

Tested with `scratchpad/mort.mjs`: five days of care, then care stops for N days, then a week of care.

| Days away | Tired notices | "Very unwell" warnings | Worst illness | After a week of care | Deaths |
| --- | --- | --- | --- | --- | --- |
| 0 | 0 | 0 | 0 | 0 | 0 |
| 3 | 6 | 0 | 2.4 days | 0 | 0 |
| 7 | 6 | 6 | 5.0 (the cap) | 0 | 0 |
| 14, 30, 60 | 8–14 | 7–14 | 5.0 | 0 | 0 |

- **Neglect never kills.** That's the existing design: illness caps just below fatal, and care brings every animal back.
- **Old age works.** A goldfish at the end of its lifespan "passed away peacefully of old age" and went to the memorial.
- **Pregnancy left unattended:** the seahorse still gave birth, and the babies survived.
- **Octopus while untended:** it stays home when ill. That's correct.

**Defect fixed in the previous round:** a sickness that "spread" was capped in the wrong units, so it actually cured every fish.

## 17. Browser drills

(see the appendix)

`octo_baby_check` used to fail for three separate reasons, and it passes now:
1. **Outdated check:** it treated any egg in the tank as an unhatched octopus egg. Now only an octopus clutch counts.
2. **Test step:** the new card has to be closed before tapping the eggs.
3. **Real bug:** a hatchling photo was attempted too early and never retried. It now retries.

## 18. Multiplayer

The server test suite (92 tests) covers:
- four seats, and a fifth player refused
- ten simultaneous joins
- simultaneous purchases spending the last shells
- one wallet that can't be double-spent
- reconnects restoring the authoritative state
- reloading the world from the database (a server restart)
- one phone chosen as director, with handoff
- an adventure resolving with no phone open
- seahorse births across phones
- shared discoveries

New this round: four caretakers acting at once on one decision, one mystery and one lid sighting. Each is applied exactly once.

**No real four-phone playtest has been done.** Manual checklist:
1. Four phones join one tank. Each picks an octopus, and only its owner can feed it a crab.
2. Two people buy the last item at the same moment: exactly one succeeds.
3. A decision shows "X's call" on the others' phones. After 12 hours, anyone can choose.
4. The mystery is tapped on two phones at once: one result, and the same line on both.
5. Close the app on the phone running the animals: another phone takes over within seconds, and the fish don't jump.
6. One phone goes into airplane mode during a purchase, then reconnects: there's no double charge.
7. Redeploy the server: every phone reconnects to the same tank.
8. A seahorse becomes pregnant while one phone is closed: when that phone opens, it shows the expecting card once.

## 19. Remaining bugs and limits

- The lid animation is the glass pose pointed up, with no dedicated pushing gesture.
- Toasts are counted tank-wide, not per person.
- Solo casual players rarely get a rare color without aiming for one.
- In the simulation, Field Guide sightings use assumed rates (compared in the appendix) and the den is reported by the simulation itself.

## 20. Files modified

- `web/src/game/rules.js`: octopus lid action and lid decision, stuck-goal carrier price, goal pace and the quick first goal, quieter toasts, octopus eggs well-fed and health thresholds
- `web/src/game/adventures.js`: well-fed and health thresholds
- `web/src/main.js`: the big-moment cards, the lid behavior, photo retries
- `web/src/ui.js`: the big-moment card, Today countdown rows, the goal picker
- `web/src/w3/fish3d.js`: the lid variant of the glass state
- `web/index.html`: styles for the card and the goal picker
- `server/logic.mjs`: allowlist `octoLid`
- `server/test.mjs`: the four-caretaker test
- `web/src/game/rules.test.mjs`: new and updated tests
- `tools/loop_sim.mjs`: the new profiles and measurements
- `tools/octo_baby_check.mjs`
- `docs/sim/*`

## 21. Migrations and compatibility

- **No data migration.**
- **New fields:** `f.lid`, `adv.lidUntil` and `goal` stuck detection. Each is only read when present.
- **Old tanks:** have no lid sightings, so a lid decision can't appear until one is seen. That's intended.
- **Each phone keeps its own "already shown" list** for big-moment cards (`ourtank.lifeSeen`), so each phone sees each moment once.

## 22. Needs approval

1. A dedicated "pushing at the lid" arm gesture. That's new animation work in the octopus rig.
2. Showing every server toast to everyone in a shared tank, rather than only the person who caused it. The alternative is to keep it quiet as now.
3. Whether a solo casual player should be steered toward a color goal, since they rarely breed a rare color otherwise.
