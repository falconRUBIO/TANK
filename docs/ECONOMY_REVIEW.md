# OUR TANK: economy and progression refinement (audit)

Scope of this change: level 8 progression, fish milestone rewards, daily wish tiers, three-player economy testing, plus three decisions you delegated (bottle pay, mortality consistency, daily reset). Fish prices, decoration prices, the starting 10 shells, care rewards and every other value were left alone, except the items listed under "Exact changes" and section 9.

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

| Scenario | Rules | Earned/day | Spent/day | Balance | Per visit | Level | Score | Deaths |
|---|---|---|---|---|---|---|---|---|
| A: one of three, 3/day | baseline | 28.9 | 8.4 | 1856 | 9.6 | 7 | 220 | 0 |
|  | current | 35.1 | 8.8 | 2378 | 11.7 | 8 | 236 | 0 |
| B: all three, 3/day each | baseline | 49.7 | 14.7 | 3156 | 5.5 | 7 | 221 | 0 |
|  | current | 50.2 | 14.9 | 3185 | 5.6 | 8 | 239 | 0 |
| C: 3/day, 1/day, every 3 days | baseline | 41.1 | 13.2 | 2519 | 9.5 | 7 | 221 | 0 |
|  | current | 42.3 | 13.5 | 2607 | 9.8 | 8 | 238 | 0 |
| D: all away days 20 to 27 (server idle) | baseline | 46.3 | 14.3 | 2894 | 5.6 | 7 | 221 | 0 |
|  | current | 47.1 | 14.5 | 2953 | 5.7 | 8 | 239 | 1 |
| D2: same, server ticking (push on) | baseline | 44.4 | 14.2 | 2725 | 5.3 | 7 | 221 | 3 |
|  | current | 45.5 | 14.4 | 2804 | 5.5 | 8 | 236 | 2 |
| E: all three, 6/day each | baseline | 53.9 | 14.9 | 3519 | 3.0 | 7 | 221 | 0 |
|  | current | 54.7 | 15.1 | 3571 | 3.0 | 8 | 241 | 0 |
| E2: E plus bottle swapping at every chance | baseline | 113.8 | 44.9 | 6208 | 6.3 | 7 | 221 | 0 |
|  | current | 66.5 | 27.1 | 3562 | 3.7 | 8 | 239 | 0 |
| S: casual, 1/day | baseline | 18.1 | 8.5 | 874 | 18.1 | 7 | 202 | 0 |
|  | current | 24.4 | 8.8 | 1416 | 24.4 | 8 | 235 | 0 |
| S2: casual, 1/day, server ticking (push on) | baseline | 17.7 | 11.8 | 546 | 17.7 | 7 | 216 | 58 |
|  | current | 21.4 | 8.7 | 1156 | 21.4 | 8 | 235 | 0 |

Level 8 (days, mean of 5 seeds): baseline never reached it in any scenario. Current: A 19.5, B 15.9, C 18.1, E 13.8, S 28.3.

**Does progression improve?** Yes at the top: level 8 becomes reachable and the casual player is no longer stuck at wish 4 (score 202 to 235). Early levels are slightly faster (level 5 about 0.2 to 1.4 days sooner) because the happiness wish no longer blocks.

**Currency inflation: yes, and it is worse.** Income rose about 1% to 35% (milestones about 4 shells/day for a full tank of 28 fish, daily wishes about +1.6/day; heavy bottle swappers earn less because bottles no longer mint shells). Spending did not move (9 to 15/day). Day 90 balances are 1,400 to 4,100 unspent. This is the problem Phase 5 (late-game spending) was meant to solve, and it was not part of this directive.

**Does a second and third caretaker multiply income?** Not linearly. Care income depends on how often the tank is hungry, dirty or cloudy, not on who acts. Three players at 3 visits each earn 1.4x one player at 3 visits (50 vs 35 per day), mostly from more feeding windows and bottles (6/day). Per visit income falls from 11.7 to 5.6. Three heavy players do not triple the economy.

**Per-source findings (current rules, scenario B):** feeding 10.1/day, rare visitors 6.7, bottles 6.0, gifts 5.5, daily wish 4.6, 14/30-day milestones 4.0, water 4.0, glass 2.8, play 1.9, tank wishes 1.1.

**Exploits looked for:**
- **Bottle loop (found, fixed in two steps).** The 6-hour limit per sender was checked against bottles still in the tank, so opening a bottle reset the wait and a pair could swap bottles every visit: +72 shells/day for three heavy players. The sender's last send time is now remembered (`flags.bottleAt`), and the opener now earns what the sender paid (2), so a bottle is a gift between friends, not income. The same scenario now earns 36 from bottles but spends 18, so net zero; total income for it fell from 114 to 67 a day.
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
- Net shells minted by bottle swapping at heavy cadence: about +36/day to 0.

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
2. **Mortality was unfair to daily players, and differed by server setup [T, decided and changed].** Looking closer than before, the simulation showed the bigger problem: with push notifications on (the server ticks every 5 minutes), a caretaker who visits once a day lost **58 fish in 90 days** under the old rules, and 3 visits a day lost 19 in one scenario. The cause is that fish were called neglected whenever the hunger bar was high, and the bar refills to its cap within five hours, so even a daily feeding looked like neglect most of the day. This contradicts the stated rule that one caretaker keeping up care keeps everyone's fish healthy. With push off, long gaps were instead judged by interpolating across the whole gap, so a 7-day absence counted as under 2 days (0 deaths). I changed two things and nothing else about death (five days of neglect, low health, 3 safe days, one death per 24 hours, last fish safe, floating fish, memorials all unchanged):
   - A fish counts as going hungry only once the tank has gone **30 hours without any feeding** (`FED_GRACE`, `lastFed`). Daily feeders are never neglectful.
   - Long gaps are judged along the real curve (hunger fills in hours, water falls slowly), so a long absence counts the same whether or not the server was ticking.
   Result: once-a-day caretaker with push on: 58 deaths to **0**; every normal scenario: 0 deaths; all three away 7 days: **1 death** on return with the server idle, 2 with it ticking (was 0 or 3). The first death can come about 6 days after the last feeding. Tested: rule tests (43) and server tests (51) pass, and a new test asserts a long gap is judged the same lazily and ticked and three days away costs nothing. Old saves start with `lastFed` set to their last update.
3. **Rare visitors are guaranteed for light players.** A visitor appears when the tank is next opened, so a once-a-day player greets one nearly every day (about 4 shells/day, the largest non-care income for casual players). With push on, visitors can be missed and this halves. Not changed.
4. **Milestones add inflation.** About 4 shells/day for a full tank (28 fish x 13 over 90 days). If you prefer less, lower the 14-day or 30-day rewards. I kept the values you specified.
5. **Care reward farming ceiling is unchanged** by instruction: feed up to 13.5/day at 6 visits x 3 players. Care is still a large share of income for frequent visitors (about 30% at 3 visits x 3 players), and milestones plus the richer wishes now add about 6 shells/day for a full tank.
6. **The bot completes every daily wish.** Real completion will be lower, so the true wish income is below 4.6/day.
7. **Friendship is trait-based, not proximity-based** (section 3).

## 10. Recommended next development phase

1. Put the current build on real phones and watch whether the three special wishes can be completed (the phone detectors for friends, favourite spot and investigate), and whether the daily reset at UTC midnight feels wrong in your time zone. I kept UTC midnight (one clock for all three players, nothing personal stored); a per-tank local hour is the alternative if it feels wrong.
2. Watch real fish deaths on real tanks for the first weeks (the dashboard counts `fish_died`), since the mortality calibration changed.
3. Add a few permanent, optional shell sinks with a visual or behavioural payoff, and revisit shell income once real numbers exist.
4. Collect real numbers (the analytics dashboard already counts `fish_milestone`, daily wishes, level-ups, shells earned and spent) and re-run `tools/econ2.mjs` with the visit patterns you actually see before changing any more values.
5. Hold levels 9 to 12 until real tanks reach level 8.

---

## Tested versus not tested

**Implemented and tested:** level 8 wish order, happiness wish, threshold 220; four fish milestones; daily wish tiers and feasibility; bottle cooldown fix and bottle pay 2; mortality hunger grace and long-gap accounting; old-save loading; simulated concurrency; analytics event; UI reward text.
**Implemented but not fully tested:** the phone-side observation for the three new special wishes (rules side tested; real-device behaviour not); the new reward text in the hint pill (covered by the browser playthrough only for existing wishes).
**Proposed, not implemented:** shell sinks, per-tank local daily reset, pairing friendship to observed proximity.

Tools: `tools/econ2.mjs` (simulator), `tools/baseline/` (frozen pre-change rules for comparison), `tools/compat.mjs` (save compatibility).
