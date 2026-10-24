# Tako Tank: Progression Audit (levels 1–8, turtle sanctuary, economy, themes)

**Branch** `claude/our-tank-game-design-xhmavw`, build **v329** (v328 plus the audit decisions: adoption price, capacity information, release-only unlocks). No physical iPhone and no real player were part of this work; everything below is from the rules code, the unit tests, headless-browser drills and simulations that play the real rules (`tools/loop_sim.mjs`, `tools/sim/turtle_econ.mjs`). Measured numbers are marked **measured**; everything else is read from code or is an assumption and says so.

## 1. Existing rules, verified from code
- **Levels** (`LEVELS`): 0 / 18 / 50 / 115 / 215 / 350 / 520 / 740 care points; room 7 / 10 / 13 / 16 / 19 / 22 / 25 / 28. Unchanged. Points keep banking past level 8 (`levelCheck` never caps `t.xp`).
- **Points**: +0.3/hour × health multiplier (Thriving 1.5, Happy 1, Struggling 0.5, Unwell 0.25 and no time credit); care actions feed 2, crab 2, glass 4, water 6, pet/play/trick/puzzle 2–4, play capped at 8 a day (`GROW.playCap`); level-up pays 3 + level shells. Unchanged.
- **Shells**: start 20; the daily mystery 6 (`DAILY_GIFT`); a rare visitor +4; requests +3/5/8; a goal +20 and a floor or backdrop; a theme +3; wishes +4…+25; a released turtle 100 + up to ~50 for its wellbeing (`TURTLE_PAY`). Care itself pays nothing (`WATER_PAY = GLASS_PAY = 0`). Unchanged.
- **Turtles**: all four species level 8; a hatchling grows up and is releasable after 14 days here (`TURTLE_DAYS`); release pays, leaves a scute, records the release in `t.released` (capped at 12 entries) and the turtle later visits. The hawksbill's `needRel` gate was checked in `buyFish` but **no species set `needRel`**: all four opened together.
- **Turtle habitat** as the turtle's own wellbeing reads it (`WANTS.turtle`): room to swim (tank ≤ 60 % full), a ledge to sleep under (a Turtle Ledge **or two rocks**), sea grass to graze (a Sea Grass Bed **or two plants**), clean water. Sponge Garden (level 7, 34) feeds the hawksbill's "reef rock to forage" want; Shell Rubble (level 7, 26) the loggerhead's "things to crunch". Both already existed at level 7; nothing about them changed.
- **Two unlock tables**: `SPECIES_CURVE` and `SHOP_CURVE` overrode the base `SPECIES_DEF` / `DECOR_DEF` levels and prices. The first `TAKO_TANK_LEVELS.md` read the base decoration table and was wrong for most decorations; it is corrected.
- **Themes** (`THEMES`): four, each "any N pieces of these types": Kelp Forest and Coral Garden were finishable at level 1, Sunken Ruins at 4, Lantern Cove at 5. Each pays +3 once and lures its visitor; active themes lift every fish's wellbeing a little (`likes`).
- **Goals** (`GOALS`): offered three at a time from day 2, one active, each pays `GOAL_SHELLS` 20 plus the next unowned floor/backdrop; `goalsDone` is tank state. The lighthouse is earned at three goals.

## 2. Changes implemented
1. **One unlock table each.** Both curves folded into `SPECIES_DEF` and `DECOR_DEF`; the overriding loops are gone. `rules.test.mjs` holds a snapshot of every species' and decoration's level and price as the live game had them (seahorse 4, octopus 6, turtles 8, …) and fails if any moves.
2. **Hawksbill gate works.** `SPECIES_DEF.hawksbill.needRel = 1`. Releases are counted in `t.stats.released` (`bump`) as well as the capped list; `releasedCount(t)` takes the larger. The shop shows the hawksbill **locked with the reason** ("After a release" / "Opens once a sea turtle raised here has been released to the ocean") instead of hiding it. The previous test asserting all four open together was rewritten on purpose (the spec asks for the gate).
3. **Sanctuary goal** (`GOALS.sanctuary`, icon turtle): offered from level 7 until a turtle has lived in the tank (never once one has), and always among the three on offer while it can be. Steps: reach level 7 · a ledge to sleep under (Turtle Ledge or two rocks: `turtleHabitat(t).ledge`) · sea grass to graze (Sea Grass Bed or two plants: `.graze`) · three days of care (`careDays` since the goal was taken). It pays through the existing goal system: 20 shells and the next floor or backdrop, once per tank (`goalsDone`).
4. **Turtle savings line** on the Tank chart now says the first open turtle's price, how many more shells, that the tank's shells are shared, and whether the sanctuary has a ledge and grass. The level 8 dialog acknowledges a finished sanctuary goal ("Level 8: the sanctuary is ready"). No new interface.
5. **Theme anchors.** Each theme needs one key piece besides its count: Kelp Forest → Giant Kelp (level 3); Coral Garden → Sea Fan or Table Coral (4 / 5; the Sea Fan joins the coral types); Sunken Ruins → a Treasure Chest, Old Anchor or Stone Arch (6), a Little Bridge (7) or the earned Torii; Lantern Cove → Glow Crystal (7) or the earned Lighthouse. A theme finished before this rule stays finished (`flags.themes` wins). The theme page names the missing key piece.
6. **Wild turtle** (optional item): a dark silhouette with moving flippers crosses far behind the kelp in about 44 s, roughly once per 22 minutes of an open tank from level 7. It is a backdrop shape: no capacity, no care, no tap target, no notification; depth-fogged like the far kelp; off when the device asks for reduced motion.
7. **Sanctuary adoption** (decision 2): the tank's **first** sea turtle costs **120** instead of 180 when the sanctuary goal is done and no turtle has ever lived in the tank (`turtleDeal(t)`; `TURTLE_ADOPT = 120`). It is computed in the rules, so the server charges the same price as the client shows. It is used once per shared tank: `flags.turtleAdopted` is set by the first turtle purchase whatever the price, so a sold or released first turtle does not bring it back, and `norm()` sets the flag on existing tanks that have or had a turtle, so no live tank gets a retroactive discount. The shop card shows "🐚 120 ~~180~~ sanctuary adoption", the preview and the detail say why, and the Tank chart's savings line counts toward 120 ("Sanctuary adoption: 120 instead of 180 for the first turtle"). Journal line when it is used.
8. **Turtle capacity information** (decision 3): `turtleRoom(t, species)` reads the same wants the turtle's wellbeing uses (a turtle counts as four small fish, the tank should be at most 60 % full). The shop preview, the detail sheet and the savings line now say, before the player saves up, "Room for a turtle: N of M places used, a turtle needs 4" and, when the tank would be too crowded for it to be comfortable, "With a turtle the tank would be P % full; it is happiest under 60 %: K fewer animals first". Nothing about capacity itself changed.
9. **Unlocks** (decision 4): Green, Loggerhead and Kemp's Ridley at level 8; Hawksbill at level 8 and one release (no loggerhead gate, no sponge gate). The Sponge Garden stays the hawksbill's foraging want on the Health screen.
10. `tools/loop_sim.mjs` and `tools/sim/turtle_econ.mjs` gained the audit's milestones (crabs, seahorse pair and birth, second octopus, sanctuary, turtles bought and released, each theme) and a repeat-turtle strategy that times the species gates; `CLAM=110` runs the clam experiment.

## 3. Proposed, not implemented
- **Further turtle gates** (loggerhead at first release, Kemp's at second, hawksbill plus sponge): measured below, recommendation in §6. Not added.
- **Maxima Clam 110**: measured below (§5) and **kept at 110** (decision 1: v328 stands).
- Level thresholds, capacity, income rates, pregnancy or nursery timing: untouched, as asked.

## 4. Level pacing, before and after (measured)
`tools/loop_sim.mjs`: a simulated household plays the real rules from an empty tank for 120 days, 6 seeds per row; one to four caretakers with set habits (casual: one evening visit most days; regular: two visits a day; engaged: three), shopping as the rules allow. Median day the tank reached each level, old rules → new rules. Thresholds were not touched, and the sanctuary goal's 20 shells do not feed levels, so the days are the same within seed noise:

| Level | 1×casual | 1×regular | 1×engaged | 2×regular | 4×regular |
|---|---|---|---|---|---|
| 2 | 1 → 1 | 1 → 1 | 0.3 → 0.3 | 0.6 → 0.6 | 0.6 → 0.6 |
| 3 | 4.6 → 4.6 | 4 → 4 | 2.1 → 2.1 | 2.6 → 2.6 | 2.1 → 2.1 |
| 4 | 10.6 | 8.5 | 4.6 | 6.1 | 5.1 |
| 5 | 19 | 15.6 | 8.6 | 10.1 | 8.6 → 9.1 |
| 6 | 28.6 | 23 | 13 | 15.6 | 12.1 → 13.1 |
| 7 | 40.6 | 31.6 | 18.3 | 20.6 | 17.5 |
| 8 | 64.6 | 46.5 → 47.1 | 27 | 27.5 → 28 | 23.6 → 23.1 |

Levels 2 and 3 stay quick (day 1 and days 2–5), as asked. Other milestones from the same runs (median day, new rules; "hit" is how many of 6 seeds reached it): first hermit crab 10–20 (3–5 of 6; a casual tank 15); second octopus only in shared tanks (day 0.1: each caretaker's own); **sanctuary goal done**: regular 42 (2/6), engaged 33 (2/6), saver 35 (5/6), 2×regular 36, 4×regular 28; it was 0/6 before because it did not exist. The household sim picks a goal at random from the three on offer, so the hit rate is the share of households that happened to take it and to buy a ledge or two rocks and grass; the saver, who buys the dearest open thing, takes it 5 times in 6, about a week after level 7.

**What this sim cannot show, and why:** it never pairs seahorses (0/6) and never buys a turtle (0/6). It fills the tank with fish to capacity (28 of 28 by day 60), and a turtle needs room for four, so there is never room. That is a real finding about the rules, not only the sim: **a tank kept full of fish cannot adopt a turtle without selling some.** The savings line, the shop preview and the detail now say so (§2, item 8). Seahorses and turtles are measured in the next section with the shopping-list sim.

**Capacity audit** (read from `turtleRoom` and `roomOf`, level 8): the tank holds 28 places; a small fish takes 1, a seahorse 1, an octopus 2, a turtle 4. The hard buy gate is place-count only (a turtle needs 4 free places); crowding is wellbeing, not a block. A turtle is content while the tank is at most 60 % full, which at level 8 is a load of 16.8: with one turtle that leaves room for **12 small fish and the octopus** (15 small fish with no octopus). Worked examples the notes now show: 20 animals and a turtle → 75 % full, "5 fewer animals first"; 28 animals → one place short to buy at all and 13 fewer for comfort. Selling pays only for bought fish (a bought clownfish 5, a bred one 0), so making room is a wellbeing choice, not an income.

## 5. Shell economy, before and after (measured)
Income is unchanged by this work except the goal. Measured per day earned (household sim, day 120): casual 9.3, regular 10.7, engaged 13.2, two regular caretakers 12.6, four 14.8. Where a regular solo caretaker's 1,289 shells over 120 days came from: time passing (visitors, wishes, requests, level-ups, the day's gift) 683, the daily mystery 545, selling fish 70, feeding 56, water changes 36, pets 20, pairings 20, watching eggs 17, glass 10, the lid puzzle 5. Spent 1,289: everything earned is spent; balances sit at 15–60 shells at every snapshot.

The one price change: **Maxima Clam 150 → 110** (implemented). Measured with `tools/sim/turtle_econ.mjs` (a regular caretaker, 12 seeds, 240 days, the clam on the shopping list): the balanced buyer can afford the first turtle on day 87 instead of 91, the spender on day 133 instead of 138; the saver is unchanged (it stops buying at level 7). Four to five days sooner, nothing else moves: water still fouls at the normal rate without it, the clam is still ten days of shells. Lighthouse (earned, or 150), Coral Spire 300 and all turtle prices are unchanged.

## 6. Turtle affordability and release timing (measured)
`tools/sim/turtle_econ.mjs`, regular caretaker (9:00 and 20:00, skips one visit in ten, plays six in ten), 12 seeds, 240 days, clam at 110. The sim sets a stuck goal aside at level 7 so the sanctuary goal can be taken (see §10, risk 1: the real game only offers it between goals). Median days; "with" is this build (first turtle 120 after the sanctuary goal), "without" is the same rules with the adoption switched off (`NODEAL=1`):

| Caretaker | Level 8 (day) | Sanctuary goal done (day, tanks) | First turtle **with** adoption | **without** | Gap from level 8, with → without |
|---|---|---|---|---|---|
| saves from level 7 (buys nothing else) | 26.8 | 22.4 (10/12) | 26.8 | 28.4 | **0 → 1.8 days** |
| three caretakers saving together | 22.3 | 18.3 (8/12) | 22.7 | 25.3 | **0.2 → 2 days** |
| casual (one evening visit, skips one day in four) | 39.9 | 33.8 (12/12) | 40.8 | 40.8 | **0 → 0** |
| balanced (keeps buying the shopping list, 15 in hand) | 26.0 | 22.4 (10/12) | can afford 53.4, buys 78.8 | 84.8 | afford: **27 → 59 days**; buys 52 → 60 |
| spender (buys whatever it can, half its visits) | 25.4 | 22.4 (9/12) | 128.8 (52.8–132.8) | 131.4 | **104 → 106 days** |

What this says. A caretaker who prepares the sanctuary and saves from level 7, alone, in a group or casually, has the first turtle **on the day it reaches level 8** with the adoption (it had 120 in hand already); without it the wait was two to six days, so for them the adoption is a courtesy, not a rescue. The balanced buyer is the one the decision was for: it can afford the turtle **27 days after level 8 instead of 59** (the sim's balanced strategy only buys a turtle once its shopping list is finished, which is why its purchase day is later than its affordable day; a player would buy on day 53). The spender is unmoved (it never holds 120 either): adoption cannot help a player who spends every shell, and nothing short of income would. Every strategy paid 120 and every one got exactly one adoption; the second turtle in the `turtles` run paid full price. The sanctuary goal was finished in 8–12 of 12 tanks per strategy: the ones that missed it were on a goal they never finished when they reached level 7 and the sim's one set-aside came too late (risk 1 again).

**Species gates** (the `turtles` strategy: after each release it saves for and raises the next turtle it can; `GATES=1`): first turtle bought day 30.4, **first release day 44.8** (the 14 days a hatchling needs), second turtle bought 94.4 (range 43–98: it goes back to the shopping list in between), **second release 108.8 (range 57–112)**, third 123.8; 10–13 releases in 240 days. So, measured against the proposals:

| Species | Proposal | When it would open (regular solo) | Verdict |
|---|---|---|---|
| Green | level 8 | day 27 | as is |
| Hawksbill | first release (+ sponge) | **day 45, 19 days after level 8** | implemented (first release; the Sponge Garden is already its foraging want on the Health screen, not made a gate) |
| Loggerhead | first release | day 45 | acceptable pacing; **not added**, the spec asked for results first |
| Kemp's Ridley | second release | day 109 (57–112), ~80 days after level 8; a casual tank reaches level 8 on day 65, so roughly day 150 | **too long; not recommended** |

Recommendation: keep the loggerhead and Kemp's at level 8; if a second gate is wanted, loggerhead at first release is the only one that paces like the hawksbill. Releases pay 100–150, so each release funds most of the next turtle.

## 7. Reef theme progression (measured and by rule)
Earliest level each theme can be finished, by its key piece: Kelp Forest **3** (was 1), Coral Garden **4** (was 1), Sunken Ruins **6** (was 4), Lantern Cove **7** (was 5). In the household sim, where nobody shops for themes on purpose, median completion day old → new: Coral Garden 36 → 70 (regular), 25 → 58 (engaged), 11 → 50 (four caretakers); Kelp Forest 57 → 58, 46 → 49; Sunken Ruins and Lantern Cove move later and are finished by fewer households (Ruins 6/6 → 2–4 of 6, Lanterns 2–3 of 6). The target "fourth theme at level 8 or later" is met in practice (the Glow Crystal costs 190); by rule it opens at 7. Completion effects are the existing ones: the +3, the theme's visitor becomes eligible, and every active theme lifts the fish's wellbeing a little; nothing was staged or faked. Themes finished before this build stay complete.

## 8. Save data and multiplayer compatibility
- The world is one JSON per tank, saved by the server after every action and every advance (`saveWorld`); `t.released`, `t.stats.released`, `t.goalsDone` and `flags.themes` live in it like everything else, so every caretaker sees the same release count, the same finished goals and themes, on every phone, after any reload.
- Actions are idempotent on the server (an idempotency key in `transactions`, `INSERT OR IGNORE`): a repeated release, goal pick or purchase returns `dup: true` and changes nothing; a release also removes the turtle, so it cannot be released twice. The goal pays once because a finished goal joins `goalsDone` and is never re-offered.
- Existing tanks: levels, points, capacity, animals, decorations, shells, finished themes (grandfathered), release history, members, ownership, current goals and earned rewards are untouched: no field changed shape, nothing is deleted or re-priced except the clam (owned clams are not refunded or charged). A hawksbill already owned is unaffected (the gate is only on buying). `norm()` fills defaults and removes nothing.

## 9. Test results
- **Unit tests**: `npm test` **95 of 95 pass** (the rule tests include the hawksbill gate and release count, the unlock snapshot with the clam at 110, the sanctuary goal, theme anchors and grandfathering, the one-time adoption (used once per tank, not back after a sell or release, no retroactive discount through `norm()`), and turtle room; 27 adventure, 22 life, 23 history, 10 biscuit, server). The earlier test "every kind of sea turtle opens together at level 8" was rewritten deliberately.
- **Browser drills** (headless Chromium, this build): `adopt_check` passes (card price "120 ~~180~~ sanctuary adoption", preview and detail notes, the savings line counting to 120 and the room line, the line hiding once a turtle is ordered); `fund_check` and `turtle_check` pass (hatchling, breathing, grazing, card countdown, release pays and leaves a scute); `motion_check` passes; `sell_check` 1 failure ("Care has the tank upkeep row and a Health list"), pre-existing and already in the final audit; `care_sync` 1 failure (the other phone's open Care updating by itself), pre-existing; `loop_check` passes; shader/console check 0 errors.
- **Simulations**: `loop_sim` old and new rules (18 rows × 6 seeds × 120 days), `turtle_econ` at clam 150 and 110, with and without the adoption (`NODEAL=1`), and the `turtles` gate run, all above.
- Not run: a physical iPhone, a real second phone.

## 10. Remaining risks
1. **The sanctuary goal is only offered while no goal is active.** Goals are picked three at a time and one stays active until it is finished or set aside. A caretaker who is on "Three generations" at level 7 never sees the sanctuary offer until that goal ends, and the adoption price waits with it. The economy sim (§6) had to set a stuck goal aside at level 7 to measure the adoption at all; a real player has to know to do the same (Care › your goal › "Set aside").
2. A tank kept full of fish cannot adopt a turtle (room for four): the information is now shown everywhere a turtle is offered, but nothing sells fish for the player.
3. `t.released` is capped at 12 entries; the count in `stats` is the one to trust from now on, and tanks from before this build count their list (≤ 12) which is right for any gate ≤ 12.
4. The wild turtle is an un-simulated backdrop shape; two phones will not see it at the same moment (by design: it is scenery, not state).
5. The household simulation picks goals at random and does not shop for themes or turtles on purpose; its theme and sanctuary timings are lower bounds on what an interested player reaches, not predictions.
6. The adoption flag is per tank: a second caretaker who joins a tank that already had a turtle gets no adoption, which is the decision ("one per shared tank"), but the savings line then shows the regular price with no note on why.

## 11. Recommendations requiring approval
1. **Nudge toward the sanctuary goal at level 7** (risk 1): when the tank reaches level 7 with another goal active, one notice or coach line ("A turtle sanctuary goal is waiting; set your goal aside to take it") or, simpler, let the sanctuary goal be offered as a fourth card while it is available. Without one, the adoption only helps players who happen to be between goals at level 7.
2. **If the balanced buyer's gap is still judged too long after the adoption** (§6 has the measured number): the next lever that does not touch income is the sanctuary goal paying 40 instead of 20 (it is finished at level 7 by anyone who takes it).
3. Whether the savings line should say, on a tank that already used its adoption, that the regular price applies (risk 6).
4. Loggerhead at first release and the Sponge Garden gate stay **not recommended** (decided; measured in §6).
