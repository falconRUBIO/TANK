# TANKLINGS — Full Game Loop Audit

## Status header

| Item | Value |
|---|---|
| Date | 2026-10-21 |
| Branch | `claude/our-tank-game-design-xhmavw` |
| Code commit audited | `a9539be` "Levels 1-8 balanced and ready to expand" (this document is committed on top of it) |
| Code changes in this round | **None.** This round is audit only. The last code change was a9539be (levels, play cap, departures, migration). |
| Status labels | **LIVE** = in code and reachable by players · **PARTIAL** = in code but incomplete or not visible · **PLANNED** = agreed, not built · **PROPOSED** = this audit's suggestion, not agreed |

**Tests performed (on a9539be)**
- `npm test`: all 93 tests in the suite passed (the rule file itself reports 97 checks) in `web/src/game/rules.test.mjs`, `history.test.mjs` and `server/test.mjs`.
- New rule test "level points: no duplicates ... banks at top" (multipliers apply only to care points, discovery points are not multiplied, play cap 8 per tank day, top level banks points).
- Saved-tank migration on 9 fixture saves: level kept, xp topped up to the level's threshold, animals and decor unchanged.
- 90-day simulation, 7 scenarios, seed 1234, importing the production `rules.js` directly (section X).
- Browser suite (Playwright, headless Chromium): 23 passed, 5 failed. `turtle_check`, `journal_check`, `seahorse_check` pass when re-run alone (failures were machine load). `field_check` fails by design (Field Guide entries retired; `witness()` returns false); the test was not updated.

**Tests not performed**
- `tools/living_check.mjs` times out at line 38 ("waiting for scheduled navigations") even when run alone. **Not investigated.** The "let it stay / let it wander" dialog is therefore not browser-verified in this round.
- No test on a real phone, no real multi-device play, no real push notifications, no real 90-day play. The simulation never chooses babies, goals or adventures, so births and goals read 0 there (sim limitation, not a game result).

**Known limitations (verified in code)**
- `PERFECT_DAY_REWARD` is shown on the Today care card (`ui.js` "PERFECT DAY") but no payment is made for it.
- The daily-fish discount (`dailyFish`) is shown but not applied to the price.
- `SCORE_W.field` (6) exists but is unused.
- Per-caretaker "while you were away" info is stored in `localStorage` only, so it is per device, not per caretaker.
- No scenario afforded a sea turtle within 90 days (income about 7–9 shells a day against 180–260).
- `'dev'` is in the server `ACTIONS` whitelist, gated by an environment variable.
- `prizeIc` in `ui.js` hard-codes `l === 8` to the turtle icon.
- Header Care dot in `updateHeader` (`ui.js`) uses `s.glass < 0.45`. In `rules.js`, `t.glass` is dirt (0 = clean), so this condition may be inverted. **Not verified** which value `s.glass` holds on the client.

---

## PART ONE — Attachment systems: classification

Classes: 1 implemented and working · 2 implemented, not visually apparent · 3 partial · 4 missing · 5 not recommended.

| System | Class | Evidence | Small visible improvement (PROPOSED) |
|---|---|---|---|
| Visible personalities | 1 / 2 | Trait-driven movement in `w3/fishmgr.js` (Shy hides, Brave comes to the glass). Octopus `octoMind` types (explorer, homebody, showoff, watcher, collector, trickster) change `pickAct` weights, tempo and `OCTO_STYLE`. Persona bars on the card are text only. | One short line on the card naming what the trait *does* ("Shy: hides by day"). |
| Habits and favorite places | 1 | Favorite spot (+2 shells), seahorse hitch memory `f.log.hitch` (favorite after 120 s and 2 visits, fades ×0.97/day), octopus `f.mem.likes` ≤ 3. | Show the favorite spot on the card ("Usually at the coconut"). |
| Caretaker recognition | 1 (octopus) / 4 (others) | Octopus trust `f.bond[uid]` with `OCTO_TRUST` 0/3/8/15: visible shyness, greeting, glass visits. No decay. Other species do not tell caretakers apart. | Do not extend to all species (would duplicate). |
| Relationships | 1 | `wellOf` lists friends (mate, partner, pal, buddy, cleaner goby) and trouble (squabble, clash, bully, wary, rival). Pals and schools move together. | — |
| Meaningful play after the cap | 3 | Cap 8 points per tank day (`GROW.playCap`). After the cap pet/play/puzzle/train still run, animate and raise mood and octopus trust, but give no points. The UI does not say the cap was reached. | One line: "Play still makes them happy; level points are done for today." |
| Return visits per caretaker | 3 | Away summary exists but lives in `localStorage` (per device). | Store `lastSeen[uid]` on the server tank (PROPOSED). |
| Physical history in the tank | 3 | Octopus keepsakes persist (`KEEP_MAX` 6) and are carried home visibly; algae tint on decor; tang grazing marks on glass. No lasting marks from births or old animals. | — |
| Life stages | 1 | baby < 3 days, juvenile < 10, adult after; size changes; turtles ready at adult + 14 days. Old age is the only death. | — |
| Health and progression | 1 | Values in section D/E verified by tests and simulation. | — |
| Departures and neglect | 1 | No automatic departure (`if (false && f.leaveAsk)`). Distress shown in `reefTick` (mul 0.55, low and back, thought bubble). Neglect never kills. | — |
| Level unlocks | 1 | `LEVEL_PRIZE` 2–8, one `LEVELS` table. | — |
| Streaks, leaderboards, new currency, random drama | 5 | Not present and not recommended (user constraints). | — |

---

## A. Overview — LIVE

Tanklings is a shared aquarium for up to 4 caretakers (6-character join code). Animals have personalities, friends, needs and life stages. Caring for them earns level points; the tank grows from level 1 (7 animals) to level 8 (28 animals). The server is authoritative: `server/logic.mjs` imports the shared rules `web/src/game/rules.js` as `R`, whitelists `ACTIONS`, uses idempotent `idem` keys, runs every action inside a SQLite `BEGIN IMMEDIATE` transaction, and calls `advance()` before every action.

## B. First-time experience — LIVE

- New tank: 20 shells, empty. The tutorial offers a free octopus; tutorial steps 2 and 3 are skipped.
- Feeding: choosing a food closes the Care menu and drops food near the right animals with no second tap (verified working; preserved).
- Day 1 in simulation: level 1–2, health 62–78.

## C. Core loop — LIVE

| Session | What happens |
|---|---|
| 30 s | Open, see who is at the glass, feed (auto-drop), tap the daily mystery (6 shells). |
| 2 min | Plus wipe glass / change water when due, pet or play once or twice, read the Tank chart "best next step" (`bestStep`). |
| 5 min | Plus a puzzle or trick (L3+), shop one item, check an animal's card (friends, trouble, wants). |
| 15 min | Plus watching seahorse hitching, octopus adventures and keepsakes, breeding, naming babies, goals. |

## D. Tank Health — LIVE (`rules.js` `tankHealth`)

```
animals = mean of wellOf(t, f).score over live animals (70 if none)
water   = clamp((t.water - 0.45) / 0.5, 0, 1)
glass   = 1 - min(1, t.glass / 0.8)          (t.glass is dirt, 0 = clean)
space   = 1 - clamp((crowd ratio - 0.6) / 0.6, 0, 1)
cond    = 100 * (0.5*water + 0.3*glass + 0.2*space)
score   = round(0.6*animals + 0.4*cond)
```

Bands `HEALTH_BANDS`: ≥85 Thriving ×1.5 · ≥75 Happy ×1 · ≥55 Struggling ×0.5 · else Unwell ×0.25.

**Worked examples**
1. Animals 80, water 0.95 (→1.0), glass 0 (→1.0), crowd 0.5 (→1.0): cond 100, score 0.6·80+40 = **88 Thriving**.
2. Animals 70, water 0.70 (→0.5), glass 0.4 (→0.5), crowd 0.9 (→0.5): cond 50, score 42+20 = **62 Struggling**.
3. Animals 40, water 0.45 (→0), glass 0.8 (→0), crowd 1.2 (→0): cond 0, score **24 Unwell**.

Hunger is inside each animal's wellbeing and is not counted twice.

## E. Leveling — LIVE

- `LEVELS` thresholds 0/18/50/115/215/350/520/740; capacity 7/10/13/16/19/22/25/28. `TOP_LEVEL` 8.
- Points = care points + discovery points (`scoreOf`). Care: `CARE_XP` feed 2, crab 2, glass 4, water 6, pet 2, play 2, puzzle 4, trim 2, train 2, multiplied by the health multiplier. Passive `XP_PER_HOUR` 0.3 × multiplier (none if health < 55).
- Feed gives points only when an animal actually needed food (hunger > 0.25), fixing the top-up exploit.
- Play cap: pet/play/puzzle/train share 8 points per tank day (`t.flags.playXp`, keyed on `giftKey(now, t.tzMin)`).
- Discovery (`SCORE_W`, not multiplied): myst 1, decided 3, hatched 2, grown 6, raised 4, morph 10, goal 15, species 4 (`field` 6 unused).
- At level 8 points keep banking ("Top level for now · N points banked").
- Migration in `norm()`: level clamped to 8, xp topped up to the current level's threshold.

## F. Level unlock table — LIVE (`LEVEL_PRIZE`, `SPECIES_CURVE`, `SHOP_CURVE`)

| Level | At | Room | Prize | Animals unlocking (price) |
|---|---|---|---|---|
| 1 | 0 | 7 | Start | goldfish 10, neon 20 |
| 2 | 18 | 10 | New sea life | cory 22, guppy 26, platy 36, blue 42, neon goby 30 |
| 3 | 50 | 13 | Tricks and bubbles (`TRICK_LEVEL` 3) | — (decor: pot, brain, kelp, urchin) |
| 4 | 115 | 16 | Seahorses and the blue tang | angelfish 60, seahorse 70, tang 64 |
| 5 | 215 | 19 | New habitats and toys | betta (mandarin) 80; Maxima clam 150 |
| 6 | 350 | 22 | Puffer, anthias, second octopus | danio 50, octopus 120, puffer 58 |
| 7 | 520 | 25 | Turtle sanctuary corner | ledge 40, seagrass 30 |
| 8 | 740 | 28 | Sea turtles | turtle 180, hawksbill 220, kemps 240, loggerhead 260 |

Level 3 and level 7 are thin on animals by design; no filler was invented.

## G. All animals — LIVE

Species and prices as in F. `LIFESPAN` (days): goldfish/angelfish/tang 420, blue/cory/guppy/betta/puffer 300, neon/platy/danio/neon goby 240, seahorse 180, octopus 120, turtles 900. Stages: baby < 3 days, juvenile < 10, adult. Old age is the only death.
- Neon goby: cleaner station, listed as a friend of every other non-octopus animal.
- Blue tang: grazes algae (glass dirt ×0.7), visible bite marks (`grazeGlass` in `main.js`). Never breeds.
- Valentini puffer: puffs up. PARTIAL: no nip animation.
- Cory: never breeds (crowding fix). Neon and danio never breed (gap).
- `SPECIES_DEF` raw values are overridden by the curves (keep in mind when editing).

## H. Personalities and memory — LIVE / PARTIAL

- Traits drive movement (LIVE). Persona bars are text only (PARTIAL).
- Octopus memory `f.mem`: fam ≤ 12, likes ≤ 3, fish ≤ 6, fade ×0.96/day (LIVE).
- Personality is set at birth and is not shaped by raising (PARTIAL by design).

## I. Breeding and genetics — LIVE

- Fish eggs every 5–7 days; care modes guard, mouth, drift, den.
- `MORPHS` gold, ghost, blue, ember; 3% mutation (12% at full moon). Morph discovery is worth 10 points.
- No spawning above 80% crowding.

## J. Octopus — LIVE

Kinds vulgaris, cyanea, bimac, mimic (distinct color, shape, behavior). Trust per caretaker (`OCTO_TRUST` 0/3/8/15). Adventures every 4–8 days ÷ escape rate (`OCTO_GAP`); keepsakes persist and are carried home. Any two can keep company; only same-kind pairs lay eggs (pair 3 days, eggs after 5, den eggs render). PARTIAL: `POT_SKILL` is text only; the `OHR` comment wrongly says eight hours.

## K. Seahorse — LIVE

Kinds kuda, erectus, reidi, zosterae; same-kind pairing only. `SEA`: pair 2 days, pregnancy 6–9, nursery 5, cooldown 14. Brood 10–15 (reidi +4, zosterae −5); nursery keeps 3 candidates. Hitching memory as in Part One. Mysis counted once in the health breakdown.

## L. Turtle — LIVE

Level 8, 180–260 shells. Ready to release at adult + 14 days; release pays 100 + bonus; 35% chance of a return visit. Economy note: not affordable within 90 days in any simulated scenario (section X).

## M. Other animals and decor — LIVE

Maxima clam (decor, slows water decay ×0.65, L5, 150). Algae tint on decor (`algaeTint`, `decor.js`).

## N. Care system — LIVE

Feed (auto-drop), wipe glass (dirt reaches full in about 66 h), change water, pet, play, puzzle, trick (L3+), trim, crab. Best next step chosen by simulating each fix on a copy of the tank (`bestStep`). No new care bars added.

## O. Shell economy — LIVE / PARTIAL

Income: daily gift 6 (with the mystery), wishes 4–25, goals 20, level bonus 3 + level, visitors 4, wants 4, daily wish 3/5/8, favorite spot +2, turtle release 100+. Simulated income: 576–818 shells over 90 days for active play (≈7–9/day); neglected 197. PARTIAL: perfect-day reward not paid; daily-fish discount not applied.

## P. Decorations — LIVE

`SHOP_CURVE` levels 1–7, prices 8–40 (clam 150). Decor carries habitats that animals' wants check (`wellOf` wants).

## Q. Field Guide — PARTIAL (retired)

Entries no longer unlock (`witness()` returns false). `field_check` fails because of this. `SCORE_W.field` unused.

## R. Mysteries, visitors, adventures — LIVE

Daily mystery with the 6-shell gift; visitors pay 4 and may ask to stay ("let it stay / let it wander", not browser-verified this round); octopus adventures with real keepsakes. All events come from actual state; nothing is fabricated.

## S. Goals — LIVE

Goal pick and steps; goal completion pays 20 shells and 15 points. UI confusion: "Objective" (Tank chart) vs "Goal" (bell), and a goal ring on the bell next to the level ring.

## T. Multiplayer — LIVE / PARTIAL

4 seats, shared tank, shared play cap, octopus trust per caretaker (LIVE). Per-caretaker return summary is per device (PARTIAL). Simulation: three caretakers reach L8 on day 23.3 vs 24.6 solo engaged — cooperation helps a little, by design (cap shared).

## U. Time and offline — LIVE

`advance()` replays elapsed time on the server. Two clocks exist: UTC days and tank-local days (`tzMin`). Push: quiet hours 22–8, at most 1 per day.

## V. Neglect — LIVE

No deaths from neglect, no automatic departures. Wellbeing < 40 for 3 days sets `leaveAsk`; ≥ 55 clears it. Unwell tanks still grow at ×0.25 for care. Simulation: neglected tank reached L6 by day 72.8 with 7 leave asks and 0 losses; a 20-day absence dropped health to 33 and recovered to Thriving by day 45.

## W. UI — LIVE with issues

Confusions (PROPOSED fixes): several health numbers with different band thresholds; goal ring vs level ring; "Today" used for several things; "Its story" twice on the card; stale build string in Settings; dead UI code; `prizeIc` literal 8; Care dot glass check possibly inverted (unverified).

## X. Simulations — production rules, seed 1234

Assumptions: `sim3.mjs` imports `rules.js`; fixed shopping list in order (grass, rock, coconut, cory, guppy, anemone, neon goby, grass, sea fan, seahorse ×2, tang, boulder, live rock, betta, clam, puffer, ledge, seagrass); no babies, goals or adventures chosen. Casual: 1 visit/day, often skipped; regular: 2–3 visits; engaged: 4+ visits with play; three caretakers: three engaged-style players; mixed: one engaged, one casual; neglected: occasional feeding only; returning: regular, then absent days 15–35.

**Day level 8 reached**: casual 48.9 · regular 27.4 · engaged 24.6 · three caretakers 23.3 · mixed 26.8 · neglected never (L6 at 72.8) · returning 45.8.

| Day | Casual | Regular | Engaged | Three | Mixed | Neglected | Returning |
|---|---|---|---|---|---|---|---|
| 1 | L1 62 | L2 68 | L2 78 | L2 76 | L2 78 | L1 62 | L2 68 |
| 3 | L1 47 | L3 85 | L3 76 | L3 85 | L3 85 | L1 47 | L3 85 |
| 7 | L3 77 | L4 73 | L4 79 | L5 78 | L4 79 | L2 45 | L4 73 |
| 14 | L4 77 | L5 76 | L6 72 | L6 70 | L6 73 | L3 29 | L5 76 |
| 21 | L5 73 | L7 69 | L7 79 | L7 81 | L7 83 | L3 28 | L6 33 |
| 30 | L6 59 | L8 72 | L8 81 | L8 84 | L8 84 | L4 60 | L6 33 |
| 45 | L7 74 | L8 79 | L8 83 | L8 81 | L8 69 | L4 28 | L7 86 |
| 60 | L8 80 | L8 80 | L8 85 | L8 84 | L8 79 | L5 60 | L8 83 |
| 90 | L8 79 | L8 77 | L8 77 | L8 80 | L8 79 | L6 54 | L8 85 |

(Format: level, Tank Health score.) Shells earned over 90 days: casual 615, regular 768, engaged 802, three 818, mixed 690, neglected 197, returning 576. Animals at day 90: 11 in all active scenarios, 2 neglected. Deaths 0 everywhere. Leave requests: casual 2, neglected 7, returning 3, others 0. Turtles bought: 0 in every scenario.

## Y. Player journey (regular player)

| Day | Experience |
|---|---|
| 1 | Free octopus, first feeds, level 2, first mystery. |
| 3 | Level 3: tricks and bubbles; tank Thriving. |
| 7 | Level 4: first seahorse or tang is in reach; 5 animals. |
| 14 | Level 5; seahorse pair forming; ~6 animals. |
| 21 | Level 7; turtle corner decor. |
| 30 | Level 8 reached (day 27). Turtles visible but ~180+ shells away. |
| 60 | Level 8, points banking; buying the last decor; waiting on turtle shells. |
| 90 | 11 animals; still no turtle. Little new to unlock. |

## Z. Critical self-audit — scores out of 10

| Area | Score | Why |
|---|---|---|
| Animal attachment | 7 | Strong for octopus and seahorse; other fish mostly text personality. |
| Care loop | 6 | Clear and fast; repetitive after week 2. |
| Progression pace | 6 | Weeks 1–4 good; engaged players hit the top at ~day 25 and then nothing opens. |
| Economy | 4 | Turtles unaffordable in 90 days; two shown rewards are not paid. |
| Neglect fairness | 8 | Nothing dies or leaves; recovery is real. |
| Multiplayer | 5 | Shared tank works; little that needs more than one person; return info per device. |
| UI clarity | 5 | Several overlapping health numbers and rings. |
| Test coverage | 7 | Rules well tested; living_check and field_check unresolved. |

---

## FINAL QUESTIONS FOR INDEPENDENT REVIEW

1. Is the core loop genuinely enjoyable beyond the first week?
2. Are care requirements rewarding or repetitive?
3. Do animal personalities and relationships produce visible emotional attachment?
4. Is progression appropriately paced?
5. Are levels and animal unlocks meaningful?
6. Is the shell economy balanced?
7. Is neglect fair in a shared aquarium?
8. Does the multiplayer system create meaningful cooperation?
9. What is the strongest reason to return tomorrow?
10. What is the biggest reason someone might quit?
11. Which three improvements would most increase long-term engagement?
12. What should be built next, and what should be postponed?

**Author's answers (PROPOSED, for the reviewer to challenge)**
1. Likely yes to about week 4, then thinning once level 8 is reached.
2. Rewarding early; repetitive later because care points matter less at the top.
3. Yes for octopus (trust, keepsakes) and seahorse (pairs, broods); weaker for small fish.
4. Good for casual (L8 ≈ day 49); fast for engaged (≈ day 25).
5. Yes through L6; L3 and L7 are thin but honest.
6. No: turtles are out of reach; pay the perfect-day reward or lower turtle prices (needs approval — balance values unchanged here).
7. Yes.
8. Partly; the shared cap means more people do not speed things up much.
9. Seeing what an animal did while away (octopus keepsakes, seahorse brood).
10. Running out of things to unlock after level 8 while turtles stay unaffordable.
11. (a) Fix the turtle economy, (b) per-caretaker return summary on the server, (c) one clear health number in the UI.
12. Build next: the three above plus paying or removing the perfect-day line. Postpone: levels 9–20, new species, Field Guide revival.
