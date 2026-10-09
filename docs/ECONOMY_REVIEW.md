# OUR TANK: economy and progression refinement (audit)

Scope of this change: level 8 progression, fish milestone rewards, daily wish tiers, three-player economy testing. Fish prices, decoration prices, the starting 10 shells, mortality timing, care rewards and every other value were left alone, except the items listed under "Exact changes".

**How to read the numbers.** Every simulation figure below comes from a bot (`tools/econ2.mjs`), not from people. It visits on a fixed schedule, always cares, buys goal-first and completes the daily wish every day. Real players will miss wishes, forget visits and buy less efficiently. Nothing here is retention data. Full tables: `docs/ECONOMY_SIM_RESULTS.md`.

Legend: **[T]** implemented and tested, **[P]** implemented but not fully tested, **[N]** proposed, not implemented.

---

## 1. Level 8 bottleneck diagnosis

Level 8 needs a score of 226. Score is: fish x2, adult fish x2, decorations x1, collection entries x1, completed tank wishes x3. I computed what is actually reachable and found three separate causes.

**Cause 1: the arithmetic ceiling was 221, below 226.**
Before level 8, capacity is 25 fish (level 7), so fish plus adults is at most 100. Decorations cap at 60. The book has 34 entries. Tank wishes are a strict chain of 12, and the 10th was "Reach tank level 8", so only 9 wishes (27 points) could ever count before level 8. Best case: 100 + 60 + 34 + 27 = **221**. Level 8 was mathematically unreachable, not just unlikely.

**Cause 2: the wish chain stalls for light players.**
Wish 4, "Keep every fish happy (80%+)", is checked at one instant and happiness rises slowly (about 40 minutes of watching to settle). In the simulation a once-a-day player had 0 of 25 fish at 80% (average 0.70) and sat on that wish for the whole 90 days. Because the chain is strictly ordered, that one wish also blocked wishes 5 to 12 and up to 18 points. The baseline casual player ended on score 202.

**Cause 3: the level 8 wish sat in the middle of the chain.** Wishes 11 and 12 (20 book entries, complete book) queued behind it and could never count toward reaching level 8.

**Checked and not a bottleneck:**
- Rare visitors: all 3 are seen in every run. They spawn the moment a caretaker next opens the game after the 9 to 15 hour timer, then stay 3 hours (when nobody is online and push is off).
- Fish capacity: binding, but only because it is 25 at level 7.
- Fish death: a death removes the fish and its adult points. Deaths were 0 in normal scenarios.
- Duplicate score: book entries are unique, decor and fish are counted from live lists, nothing double-counts.
- Fish growth: a run-down fish stops ageing (growth pauses), so an adult takes longer under neglect. Care keeps score correct.

## 2. Exact changes made to progression [T]

| Change | Before | After |
|---|---|---|
| Wish order | level 8 wish was 10th of 12 | level 8 wish is last (indexes 0 to 8 unchanged, so saves are safe) |
| Happiness wish | every fish 80%+ | average 70%+ with at least 2 fish, same +5 |
| Level 8 threshold | 226 | **220** |

Why 220 and not something else. After the first two changes, with the bot at 5 seeds each:

| Threshold | 1 of 3 active (A) | 3 active (B) | Unequal (C) | Casual, 1 visit/day (S) |
|---|---|---|---|---|
| 226 | 1/5 reach | 4/5 | 4/5 | **0/5** |
| 220 | 5/5, day 19.5 | 5/5, day 14.4 | 5/5, day 16.1 | 5/5, day 28.3 |
| 216 | day 17.7 | day 13.8 | day 15.6 | day 26.0 |

At 226 a near-perfect run was needed, which is the "extraordinary luck" case. 220 is the smallest change that makes it reliable. The simulated tanks plateau at 223 to 241, so level 8 still means a full tank, a nearly complete book and most wishes. I also tried "+1 score per fish with a milestone"; level 8 then arrived only about 4 days after level 7, which is trivial, so I did not adopt it.

Do not read "day 14 to 28" as a promise. The bot buys efficiently; real tanks will be slower. Level 7 is day 11 to 22 in the same runs.

## 3. Fish milestone implementation [T]

All rewards go to the shared wallet. Stored on the fish (`found`) or the tank (`flags`), so they persist, sync, and a dead fish keeps its history in its memorial.

| Milestone | Reward | Rule |
|---|---|---|
| First friendship | **+3** (was +2) | Once per fish, and a pair key (sorted ids) is stored so a pair pays once. A fish now prefers a partner who has no friend yet, so friendships pair up instead of everyone picking the same fish. |
| 14 days old | **+5** | Once per fish, alive only. Age counts from arrival, so a purchased fish starts as a baby and cannot be bought mature. Neglect pauses ageing. |
| 30 days old | **+8** | Same, journalled. |
| First hatch | **+5** | Once per tank, on the hatch not the egg. Parents and child ids are recorded in `flags.firstHatch`. |

Journal lines: "Pip is 14 days old.", "Pip is 30 days old.", the hatch uses the existing hatch entry. Toasts: "Pip is 14 days old. +5 shells", "Pip made a friend. +3 shells", "Your first baby fish hatched. +5 shells". Memorials add "Reached 14 / 30 days old". An analytics event `fish_milestone` is counted.

**Old saves.** A tank saved before this change records the 14/30-day milestones its fish already reached and the first hatch if it already had a generation, and pays nothing retroactively (`flags.msV`). Verified with `tools/compat.mjs` (137 checks).

Limitation: friendship is still assigned by the server from traits (two Social fish, aged 2+ hours, happy). It is persistent but not observed proximity. Changing that is a design change I did not make.

## 4. Daily wish generation and reward logic [T for rules, P for the phone detectors]

One wish per tank per day. The day rolls at **UTC midnight on the server clock**, the same for every caretaker. It is created lazily the first time anyone opens or ticks the tank that day. No streaks, no penalty, replaced (not carried over) the next day. A wish already under way is kept for the day even if the need that suggested it is met (so "two kinds of care" cannot cancel itself).

Tier is chosen by day hash: 50% easy, 35% normal, 15% special (average 4.45 shells/day, up from 3). If a tier has no feasible wish it falls back to normal, then easy. Reward is stored on the wish and paid once, to the shared wallet, to whoever completes it; a second caretaker finishing at the same moment gets nothing more.

| Tier | Wish | Offered only if |
|---|---|---|
| Easy (3) | Watch fish swim 15 s | 1+ fish |
| | Say hello to three fish | 3+ fish |
| | Play with a fish | 1+ fish |
| | Give the tank some care it needs | hunger, water or glass actually needs it |
| | Place a plant | free slot and 6+ shells |
| Normal (5) | See two fish swimming together | 2+ fish |
| | Watch a fish visit a decoration | a non-minor decoration |
| | Play with three different fish | 3+ fish |
| | Give two kinds of care | two kinds of care are currently needed |
| Special (8) | Watch two friends swim together | an existing friendship, both alive |
| | Watch a curious fish investigate a decoration | a Curious fish and a decoration |
| | Watch a fish at its favourite spot | a fish with a favourite spot on a decoration that still exists |
| | Watch a playful fish by the bubbles | a bubbler and a Playful fish |

The server checks what it is told: a friendship observation counts only if the two fish really are friends, favourite spot only for a fish that has one, investigate only for a Curious fish at a real decoration. Distinct-count wishes ignore repeats. The hint pill and the wish row now show the reward ("+5").

**Not browser-tested:** whether the existing phone-side detectors fire often enough for the three new special wishes in real play. The server side is tested with the same messages the phone sends. This is the main thing to verify on a real device.

## 5. Three-player economy simulation [simulated]

Five seeds per cell. Baseline = the rules before this work; current = after. "Earned" is gross income including level-ups, wishes, growth and milestones, so it is larger than the "net" figures in the earlier audit (that audit netted off spending).

Day 30 and day 90 (full day 7/14/60 tables in `docs/ECONOMY_SIM_RESULTS.md`):

| Scenario | Rules | Day | Earned/day | Spent/day | Balance | Per visit | Level | Score | Deaths |
|---|---|---|---|---|---|---|---|---|---|
| A: one of three, 3/day | baseline | 90 | 28.9 | 8.4 | 1856 | 9.6 | 7 | 220 | 0 |
| | current | 90 | 35.1 | 8.8 | 2378 | 11.7 | 8 | 236 | 0 |
| B: all three, 3/day each | baseline | 90 | 49.7 | 14.7 | 3156 | 5.5 | 7 | 221 | 0 |
| | current | 90 | 56.1 | 15.1 | 3705 | 6.2 | 8 | 241 | 0 |
| C: 3/day, 1/day, every 3 days | baseline | 90 | 41.1 | 13.2 | 2519 | 9.5 | 7 | 221 | 0 |
| | current | 90 | 47.2 | 13.7 | 3028 | 10.9 | 8 | 241 | 0 |
| D: all away days 20 to 27 (server idle) | baseline | 90 | 46.3 | 14.3 | 2894 | 5.6 | 7 | 221 | **0** |
| | current | 90 | 52.7 | 14.6 | 3440 | 6.4 | 8 | 241 | **0** |
| D2: same, server ticking (push on) | baseline | 90 | 44.4 | 14.2 | 2725 | 5.3 | 7 | 221 | **3** |
| | current | 90 | 51.0 | 14.5 | 3295 | 6.2 | 8 | 241 | **3** |
| E: all three, 6/day each | baseline | 90 | 53.9 | 14.9 | 3519 | 3.0 | 7 | 221 | 0 |
| | current | 90 | 60.7 | 15.0 | 4116 | 3.4 | 8 | 241 | 0 |
| E2: E plus bottle swapping at every chance | baseline | 90 | 113.8 | 44.9 | 6208 | 6.3 | 7 | 221 | 0 |
| | current | 90 | 84.5 | 27.2 | 5167 | 4.7 | 8 | 242 | 0 |
| S: casual, 1/day | baseline | 90 | 18.1 | 8.5 | 874 | 18.1 | 7 | 202 | 0 |
| | current | 90 | 24.4 | 8.8 | 1416 | 24.4 | 8 | 235 | 0 |

Level 8 (days, mean of 5 seeds): baseline never reached it in any scenario. Current: A 19.5, B 14.4, C 16.1, E 13.5, S 28.3.

**Does progression improve?** Yes at the top: level 8 becomes reachable and the casual player is no longer stuck at wish 4 (score 202 to 235). Early levels are slightly faster (level 5 about 0.2 to 1.4 days sooner) because the happiness wish no longer blocks.

**Currency inflation: yes, and it is worse.** Income rose 12% to 35% (milestones about 4 shells/day for a full tank of 28 fish, daily wishes about +1.6/day). Spending did not move (9 to 15/day). Day 90 balances are 1,400 to 4,100 unspent. This is the problem Phase 5 (late-game spending) was meant to solve, and it was not part of this directive.

**Does a second and third caretaker multiply income?** Not linearly. Care income depends on how often the tank is hungry, dirty or cloudy, not on who acts. Three players at 3 visits each earn 1.6x one player at 3 visits (56 vs 35 per day), and most of that gap is bottles (12/day) plus more feeding windows. Per visit income falls from 11.7 to 6.2. Three heavy players do not triple the economy.

**Per-source findings (current rules, scenario B):** bottles 12.0/day, feeding 10.1, rare visitors 6.7, gifts 5.3, daily wish 4.6, 14/30-day milestones 4.0, water 4.0, glass 2.8, play 1.9, tank wishes 1.2.

**Exploits looked for:**
- **Bottle loop (found, partly fixed).** The 6-hour limit per sender was checked against bottles still in the tank, so opening a bottle reset the wait and a pair could swap bottles every visit: +72 shells/day for three heavy players. I fixed this: the sender's last send time is now remembered (`flags.bottleAt`), restoring the documented one per 6 hours. The same scenario now earns 36/day from bottles. The design still nets +2 shells per bottle (costs 2, pays 4), so three players can still mint about 18/day at maximum cadence. Not changed; see item 9.
- Feeding, glass, water: capped by regrowth. At 6 visits/day x 3 players, feeding is 13.5/day. No duplication found.
- Gifts: one every 6 hours, single slot. No loop found.
- Milestones: per fish, flagged on the fish. No duplication found, including simultaneous claims.
- Daily wish: paid once; simultaneous completion pays once.
- No unreachable tank wish remained in simulation. The old happiness wish was effectively unreachable for casual players and is fixed.
- Long stretches without progress: after about day 15 to 30 the bot has bought everything and only drifts upward in shells. That is the sink gap, not a rules defect.

## 6. Before and after (short)

- Level 8: unreachable (221 max) to reachable on every simulated seed.
- Casual score at day 90: 202 to 235.
- Daily wish average: 3.0 to 4.6/day in the bot (which always finishes it; real completion will be lower).
- Fish milestones per fish at day 90: 25 recorded to 84 recorded.
- Max bottle income at heavy cadence: 72/day to 36/day.

## 7. Multiplayer concurrency tests [T]

Server integration tests (51 pass, 1 new): three real WebSocket clients on one tank.
- Two caretakers play with different fish at the same instant: the daily wish is paid exactly once, and three 14-day milestones pay once each (total exactly 70).
- Three more plays and three feeds at the same time: nothing pays twice, three 30-day milestones pay once each.
- Two caretakers buy a fish with shells for only one: exactly one succeeds, balance 0, one order.
- Existing tests still cover simultaneous joins, simultaneous lay-to-rest (one succeeds), idempotent retries and offline simulation.

Rule tests (42 pass, 11 new) cover level 8 reachability, the happiness wish, 14 and 30 day milestones (including buying a fish, neglect, memorials), friendship once per pair, first hatch once per tank, old-save behaviour, tier rewards and feasibility, repeat and double completion, wish validation, and the bottle regression.

Server actions run one at a time per tank, so a shell change is a single read-modify-write; the tests above exercise that.

## 8. Save compatibility [T]

`node tools/compat.mjs` plays tanks from 0 to 45 days with the old rules, saves them as JSON, and loads them with the new rules: 137 checks, 0 failures (fish and level kept, wish index kept, no back-pay, ages recorded, round-trips as JSON, an old in-progress daily wish still completes and pays 3). The rule and server test suites also pass.

Note one visible effect on old tanks: wish 4 now completes more easily, and level 8 is lower, so a tank may level up shortly after updating and receive that level's normal bonus. No shells are removed from any tank.

## 9. Remaining economy problems

1. **No late-game shell sink [N].** Balances reach thousands. Not addressed here. `docs/ECONOMY_AUDIT.md` and the earlier review list options (permanent decorations, atmosphere, consumables). A sink should come before more income sources.
2. **Mortality depends on whether the server is ticking [not changed, needs your decision].** After a 7-day absence by all three players, the simulation shows **0 deaths if nobody is online and push is off**, but **3 deaths if the server ticks every 5 minutes** (push on). The cause: when the server sees one long gap it estimates neglect by interpolating hunger and water across the whole gap, so a week away counts as under 2 days of neglect (1.8) instead of 5. This predates this work and I did not touch it ("do not change mortality timing"). It means the five-day rule is applied differently depending on settings. A fix (step through long gaps) would make absence deaths consistent but would also make real absences more punishing, which is your call.
3. **Bottles still mint shells [N].** +2 net per bottle. Recommend opener pays 2 (equal to the cost) or the reward is capped per day.
4. **Rare visitors are guaranteed for light players.** A visitor appears when the tank is next opened, so a once-a-day player greets one nearly every day (about 4 shells/day, the largest non-care income for casual players). With push on, visitors can be missed and this halves. Not changed.
5. **Milestones add inflation.** About 4 shells/day for a full tank (28 fish x 13 over 90 days). If you prefer less, lower the 14-day or 30-day rewards. I kept the values you specified.
6. **Care reward farming ceiling is unchanged** by instruction: feed up to 13.5/day at 6 visits x 3 players. Care is still a large share of income for frequent visitors (about 30% at 3 visits x 3 players), and milestones plus the richer wishes now add about 6 shells/day for a full tank.
7. **The bot completes every daily wish.** Real completion will be lower, so the true wish income is below 4.6/day.
8. **Friendship is trait-based, not proximity-based** (section 3).

## 10. Recommended next development phase

1. Put the current build on real phones and watch whether the three special wishes can be completed (the phone detectors for friends, favourite spot and investigate), and whether the daily reset at UTC midnight feels wrong in your time zone. If it does, move the reset to a stored per-tank local hour.
2. Decide the mortality question (item 2 above). It affects trust: the same absence kills fish on one server setup and not on another.
3. Add a few permanent, optional shell sinks with a visual or behavioural payoff, then decide on bottle pay.
4. Collect real numbers (the analytics dashboard already counts `fish_milestone`, daily wishes, level-ups, shells earned and spent) and re-run `tools/econ2.mjs` with the visit patterns you actually see before changing any more values.
5. Hold levels 9 to 12 until real tanks reach level 8.

---

## Tested versus not tested

**Implemented and tested:** level 8 wish order, happiness wish, threshold 220; four fish milestones; daily wish tiers and feasibility; bottle cooldown fix; old-save loading; simulated concurrency; analytics event; UI reward text.
**Implemented but not fully tested:** the phone-side observation for the three new special wishes (rules side tested; real-device behaviour not); the new reward text in the hint pill (covered by the browser playthrough only for existing wishes).
**Proposed, not implemented:** shell sinks, bottle pay change, mortality catch-up fix, per-tank local daily reset, pairing friendship to observed proximity.

Tools: `tools/econ2.mjs` (simulator), `tools/baseline/` (frozen pre-change rules for comparison), `tools/compat.mjs` (save compatibility).
