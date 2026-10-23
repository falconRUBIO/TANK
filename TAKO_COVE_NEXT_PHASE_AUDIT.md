# TAKO COVE — Next Phase Audit: Making the Existing Game Feel Alive

**Date:** 2026-10-22 · **Branch:** `claude/our-tank-game-design-xhmavw` · **Starting point:** `a9539be` (Levels 1–8 balanced) · **Covers** every commit after `a9539be` up to the one adding this file · **Service worker:** `ourtank-v272`

Status words used throughout:
- **VERIFIED (rendered):** measured from on-screen object positions in a real browser.
- **VERIFIED (rules):** proven by tests or simulations on the production `rules.js`, with no developer shortcuts.
- **STATE ONLY:** the game state changes, but nothing distinct shows on screen.
- **INCONCLUSIVE:** a test timed out, or results vary from run to run.
- **NOT VERIFIED:** not tested.

---

## 1. Summary: is the game getting more enjoyable?

**Yes, modestly and measurably, in the places a player feels first.** This phase added no new systems. It fixed things that silently broke the promise of Levels 1–8:

- **Level 3 was hollow.** "Tricks and bubbles" opened on about day 2.5, but every trick needed equipment that unlocked at level 4. In a normal save, the first trick arrived around **day 10**. Now a no-equipment "twirl at the glass" can be taught as soon as level 3 opens, and the first trick is learned on **day 2.8–3.4** (three seeds, normal play).
- **The homebody octopus did not look like a homebody.** In one measured run it spent *less* time at its den than the explorer (0.23 vs 0.43 of frames). It now spends **0.84–0.95** of frames at its den, against the explorer's **0.26–0.32**, in three runs.
- **Coming back is now worth reading.** Each caretaker's time away is stored on the server. Today opens with what actually changed, biggest news first. The daily seahorse dance (75 journal lines in a 120-day run) no longer buries a birth.
- **The interface stopped contradicting itself.** There was a glass dot that lit when the glass was clean, a reward shown but never paid, a Field Guide that could no longer fill, two different "health" scales, and a second gold ring on the bell that read as a second level. All are fixed.
- **The turtle "problem" was a simulation artifact, not an economy problem.** A regular player who saves from level 7 can afford a turtle a median **3.8 days** after level 8. Prices are unchanged; the Tank chart now shows players how to plan for it.

**What did not get better:** the octopus's keepsake carry when the keepsake lies far across the tank, and how close seahorse mates stay to each other between meetings. Both are reported honestly below.

---

## 2. Exact changes made

| # | Change | Files | Status |
|---|---|---|---|
| 1 | Glass Care dot was inverted (`s.glass < 0.45` lit when *clean*; `t.glass` is dirt) → `> 0.45` | `web/src/ui.js` `updateHeader` | VERIFIED (code + rules semantics) |
| 2 | The "Adopt" button showed the plain price even after choosing the carrier special; the special choice now comes first and the button shows the real price | `web/src/main.js` adopt flow | VERIFIED (code path). The daily-fish "discount" from the last audit **did not exist**; that finding was wrong. |
| 3 | Perfect Day: the unused `PERFECT_DAY_REWARD` removed. The card still says "PERFECT DAY" and promises nothing | `rules.js`, `ui.js`, `rules.test.mjs` | VERIFIED (unit test) |
| 4 | Field Guide retired cleanly: the bell tab is now **Collection** (goals, colors, families); the "Discover a Field Guide page" level tip removed; `witness()` reduced to `return false` | `ui.js`, `rules.js`, `tools/field_check.mjs` | VERIFIED (field_check passes; moments still write their own journal lines) |
| 5 | living_check timeout explained and fixed. The headless browser renders about **0.3 frames per second** in software, and Playwright pointer clicks wait on frames, so they timed out. The drill now uses DOM clicks. (A comment I added had also hidden its name-dialog wait; fixed.) | `tools/living_check.mjs` | VERIFIED (passes) |
| 6 | **Return visits on the server:** `members.away_from` / `away_to`, added as columns on open (old rows untouched); `arrive()` sets them when someone returns after 30+ minutes and is not already on another phone; kept for one day; sent in the snapshot | `server/db.mjs`, `server/logic.mjs` `arrive`, `server/server.mjs`, `web/src/game/game.js` | VERIFIED (2 server tests + browser drill `return_check`) |
| 7 | Today "While you were away": in a shared tank it uses the server's record (this phone's own record only in solo); big news first, matched against the real journal wording; daily dances, visitors and the time capsule folded away; moved to the **top** of the Today sheet | `ui.js` `awayOf`, `AWAY_BIG`, `AWAY_SKIP` | VERIFIED (browser screenshot `docs/audit/7-return-today.png`) |
| 8 | **Bubbler opens at level 3** (price unchanged, 48) | `rules.js` `SHOP_CURVE` | VERIFIED (rules) |
| 9 | **Twirl at the glass:** a first trick that needs no decoration. Taught through the same trust and sessions as other tricks; performed as a loop at the front glass. Bubbles and the gate still need their equipment | `rules.js` `TRICKS`, `trickOptions`; `main.js` `showTrick`; `fishmgr.js` `perform` | VERIFIED (rules: unit test + milestone sim). Rendered loop: NOT VERIFIED in a browser drill |
| 10 | Turtle savings line on the Tank chart from level 7 until the first turtle: "Saving for a sea turtle: N of 180", then "You can adopt…" | `ui.js` `chartHtml`, `web/index.html` `.tc-fund` | Code checked. A chart_check browser run was INCONCLUSIVE (screenshot timeout under load) |
| 11 | **One health:** Today shows Tank Health with its four bands (it showed the animals' average with different thresholds and words such as "Content" and "Could be better") | `ui.js` `tankWell`, `bandCls` | Code checked |
| 12 | The bell no longer draws a gold goal ring beside the level ring; goal progress lives on the goal card | `ui.js` `questBar`; `tools/goal_check.mjs` | VERIFIED (goal_check passes) |
| 13 | Once a day, when play has used up its 8 points: one gentle line saying play still pleases them | `main.js` `capNote` | Code checked; NOT VERIFIED in a browser |
| 14 | Homebody octopus tuned (tour 0.4→0.15, follow 0.5→0.25, roam 0.35→0.2, den 1.9→2.4) | `web/src/w3/fish3d.js` `OCTO_ACTS`, `OCTO_STYLE` | VERIFIED (rendered, 3 runs) |
| 15 | Seahorse mates: a mate's holdfast area weighs ×3.5 (×6 at night) when choosing where to hold | `fish3d.js` `pickHold` | INCONCLUSIVE: about 10% closer than singles, varies by run (§4) |
| 16 | Keepsake pickup: two attempts (looser pickup; a closer walk) both broke `life_check`; **reverted to the original** | `fishmgr.js` | Original behavior kept (§4) |
| 17 | New tools: `attach_check.mjs` (6 attachment behaviors, rendered), `return_check.mjs` (two-person return through a real server), `sim/milestones.mjs` (levels 1–8 from a new tank, ordinary actions only), `sim/turtle_econ.mjs` (20 seeds × 5 strategies); the milestone run added to `check_all.sh` | `tools/` | — |

Feeding auto-drop: **untouched.** Choosing a food still closes Care and drops it near the right animals with no second tap.

---

## 3. Features verified working (and how)

| Feature | Evidence |
|---|---|
| Levels 1–8 from a brand-new tank using only ordinary actions | `node tools/sim/milestones.mjs` on seeds 1000, 1037 and 1074: level 3 on day 2.4–2.5 → first trick (twirl) learned on day 2.8–3.4 → seahorses on day ≈15 → level 7 on day ≈20 → level 8 on day 25–29 → turtle bought on day 27–34 → grown → released → came back to visit. **No refusals.** Turtle wellbeing while raised: 90–91 |
| Each person's time away kept on the server | `server/test.mjs`: unit test of `arrive()` (30-minute threshold, second phone, one-day expiry) + websocket test (reconnect keeps the same stretch; another caretaker has their own) |
| Return summary in the real UI, with only server data | `return_check.mjs`: Ben's local away records are wiped before he reopens, so only the server can know. Today shows the new fish, no routine care, nothing from before he left; Ana, who never left, sees nothing |
| Old saves | 9 real saved tanks migrate: level kept, animals and decor unchanged |
| Rules and server tests | `npm test`: **97 rule tests, all 95 suite tests pass** |

---

## 4. Animal behavior: what you can actually see

Measured by `tools/attach_check.mjs`. Rendered positions (`f.group.position`, the keepsake mesh, the seahorse holdfast) are sampled over simulated frames in a real browser. Screenshots are in `docs/audit/1-…6-*.png`.

| Behavior | Rendered result (latest runs) | Verdict |
|---|---|---|
| **Two octopus personalities** | Homebody vs explorer, same tank and time: path **7.9–22** vs **66–69**; den time **0.84–0.95 vs 0.26–0.32** (before tuning: 0.23 vs 0.43 in one run) | VERIFIED (rendered); improved this phase |
| **Recognizes a familiar caretaker** | An octopus with trust 3 presses to the front glass for **0.75–0.77** of frames after greeting; a stranger never crosses the pane line | VERIFIED (rendered) |
| **Favorite places** | Fish with the sword plant as its spot: by it 0.20–0.28 vs 0.02–0.09 for a control; boulder 0.37–0.52 vs 0.06–0.14. Seahorses spend ~0.45–0.5 of frames on their own saved favorite holdfast | VERIFIED (rendered) |
| **Fish companionship** | Pals' mean distance **3.06** vs 4.67 for non-pals; within 2 units 24% vs 2% | VERIFIED (rendered) |
| **Seahorse pair vs singles** | During meetings: the pair circles within 1.2 for ~264 samples, singles 0. **Between meetings:** after the mate change, 3.36 vs 3.80, 3.83 vs 4.16, 3.68 vs 3.62 | Meetings VERIFIED (rendered). Between meetings **INCONCLUSIVE**: at most ~10% closer, sometimes none. In the drill each mate has a *different* saved favorite, which competes with the mate pull |
| **Octopus keepsake as a physical object** | In `life_check` (keepsake near): it picks it up, carries it home, sometimes drops it on the way, and the tank remembers where — **passes**. In `attach_check` (keepsake across the tank): it walks over and stops **~1.3 away, while the pickup reach is 1.2**, so it examines the shell and never lifts it | **PARTIAL.** Both fixes I tried broke `life_check` and were reverted. Remaining bug: `fishmgr.js` carry tick (`< 1.2`) vs `fish3d.js` inspect stop distance (`1.3`) |
| **Interacting with the environment** | Seahorses hold on to their favorite plants; fish return to their spot decoration; the octopus visits its den and keepsake | Rendered for the cases above; not measured beyond them |

Not done: no new personality meters or menus were added, as requested.

---

## 5. Turtle economy (prices unchanged)

`node tools/sim/turtle_econ.mjs 20 120`: production rules, **20 seeds per strategy**, 120 days. The regular caretaker visits at 9:00 and 20:00, skips 1 visit in 10, and plays 6 visits in 10. The bubbler is included in every shopping list.

| Strategy | Level 8 (median, range) | Can afford a turtle | Bought | Gap after level 8 | Bought within 120 days |
|---|---|---|---|---|---|
| **Save** (normal shopping, then saves from level 7) | 26.4 (24.4–28.8) | 29.4 | 29.4 | **3.8 days (0–6.4)** | 20/20 |
| **Shared** (3 caretakers, saving from level 7) | 23.3 (22.3–24.3) | 25.3 | 25.3 | **2 days (0.9–5)** | 20/20 |
| Balanced (buys the whole list first) | 26 (23.8–28.7) | 91.4 | 91.4 | 66 days | 20/20 |
| Spender (spare shells go on decor) | 25.8 | never | never | — | 0/20 |
| Hoard (starter set, then nothing; reference) | 26.8 | 26.8 | 26.8 | 0 | 20/20 |

**Income included:** daily mystery and gift, feeding, glass, water, petting and play, greeting visitors, trimming plants, level bonuses, wishes, collection milestones, growth and age rewards, turtle release.

**Income not included** (the sim never chooses these): goal steps, puzzles, the hide game, trick rewards, bottles (needs two people), sales, babies and hatching rewards, adventure finds.

**Recommendation, as implemented:** the last audit's "no turtle in 90 days" came from putting the turtle last on the shopping list. A deliberate saver already meets your 3–7 day target. Prices stay as they are; the Tank chart now says "Saving for a sea turtle: N of 180" from level 7.

---

## 6. Levels 1–8, as a player experiences them now

| Level | Day (regular player) | What is real and usable |
|---|---|---|
| 1 | 0 | A free octopus, feeding (auto-drop), mystery and gift. *Note: in the rules sim, `chooseFirst` refused with FORBIDDEN in a member-less solo tank, so the sim places the octopus the way the tutorial does.* |
| 2 | ~0.4 | More sea life (cory, guppy, neon goby…) |
| 3 | ~2.5 | **Twirl taught within a day**; the bubbler (48) gives a second trick later. VERIFIED (rules) |
| 4 | ~4.4 | Seahorses and the tang. In the sim, seahorses arrive around day 15 because of shopping order; they are affordable sooner |
| 5 | ~8.4 | Habitats and toys (mandarin, live rock, clam later) |
| 6 | ~13.7 | Puffer, second octopus |
| 7 | ~20 | Ledge and sea grass; **turtle savings line**. The turtle's needs are also met by two rocks or two plants, so the level 7 items help but are not required |
| 8 | ~26–28 | Turtle bought ~3–4 days later when saving, grown ~10 days later, released ~4 days after that, return visit weeks later. VERIFIED (rules) |

---

## 7. Care loop

| Area | What I found | Change |
|---|---|---|
| Feeding | Every fish goes for the food (only how quickly each starts varies); seahorses always get their mysis | None. It works; not risked |
| Petting/play | Burst, sound and haptic; the octopus follows your finger | After the daily point cap, one gentle line once a day; play still pleases them |
| Tricks | Impossible at level 3 (equipment at level 4) | Twirl at level 3 |
| Puzzles | Unchanged | Cap line also shown after a puzzle |

No new care requirements were added.

---

## 8. Multiplayer return behavior

- Each caretaker's time away is stored with them on the server. Opening on a second phone while already present does not reset it; a short break the same day keeps the last real absence.
- Today shows up to 5 real journal lines from that stretch: births, eggs, pairings, best friends, favorite spots, octopus trips and keepsakes, adulthood and arrivals first. Your own actions, routine care, daily dances and visitors are left out.
- No popup: it sits at the top of the Today sheet, with a Clear button.

---

## 9. Tests

**Passed**
- `npm test`: 97 rule tests and all 95 suite tests.
- Saved-tank migration (9 fixtures).
- `milestones.mjs` (3 seeds).
- Browser drills: `goal_check`, `living_check` (was timing out), `return_check`, `life_check`, `field_check`.
- Full quick suite run (`tools/check_all.sh`): **24 passed, 5 failed**. Of the five:
  - Three were mine and are fixed: the milestone wording, `goal_check`, and `living_check`'s comment.
  - The keepsake regression is reverted; `life_check` passes again.
  - `octopus_rest` is below.

**Failed or inconclusive**
- `attach_check`: keepsake carry and pair-between-meetings fail (§4).
- `octopus_rest` "frightened, goes home": 50% home time against a >50% bar (runs 49, 50, 86%); the tired case passes. Borderline and run-dependent: **INCONCLUSIVE**.
- `chart_check`: screenshot timeout while another drill was running: **INCONCLUSIVE**. The turtle savings line has no browser screenshot.
- The full suite was not re-run end to end after the final fixes. Each previously failing drill was re-run on its own.

**Not tested:** a real iPhone (frame rate, memory), real two-device play beyond `return_check`'s two browsers, push notifications, the twirl's on-screen loop.

---

## 10. Screenshots

- `docs/audit/1-personalities.png` … `6-seahorse-pair.png`: the attachment drill.
- `docs/audit/7-return-today.png`: Ben's Today after 8 hours away.
- `docs/audit/8-collection.png`: the Collection tab that replaced the Field Guide.

---

## 11. Remaining issues (ranked)

1. **Keepsake carry from across the tank.** The walk stops at 1.3, but the pickup reach is 1.2. Fix it with a carry-specific approach step in `fish3d.js`, not the shared inspect walk.
2. **Seahorse mates between meetings** are barely closer than singles. When mates have different favorite holdfasts, consider letting the pair adopt one shared favorite.
3. **Bubbles trick** still waits for 48 shells (around day 10). This is intended now that the twirl exists, but worth watching.
4. **Headless browser at 0.3 fps** makes every timing-based drill fragile. A lighter test render mode would make the suite trustworthy.
5. **`chooseFirst` refuses in a member-less solo rules call** (sim only; the UI tutorial works). Worth a look.
6. **Unpaid "PERFECT DAY" label:** it is now clearly a celebration. If players read it as a reward anyway, consider removing the label.

---

## 12. Updated design assessment (out of 10)

| Area | Before | Now | Why |
|---|---|---|---|
| Animal attachment (visible) | 7 | **7.5** | 4 of 6 behaviors clearly visible; the homebody fixed; keepsake and pair still weak |
| Early game (levels 1–3) | 6 | **7.5** | The level 3 promise is now real within a day |
| Return experience | 5 | **7** | Per-person, real, at the top, not noisy |
| Economy clarity | 4 | **7** | No change needed; the path is shown |
| UI honesty | 5 | **7.5** | Four broken promises removed; one health scale |
| Late game (after level 8) | 5 | 5 | Unchanged: turtles and breeding carry it, and nothing new opens |
| Test trustworthiness | 6 | 6.5 | Better drills, but the headless speed limits them |

---

## 13. If someone played Tako Cove for 30 days, what would make them genuinely care?

Not the level ring. In 30 days a regular player reaches level 8 around day 27, and the ring stops meaning much after that. What actually holds people is **recognition**: opening the tank and seeing *that* octopus, the one that hides at home under its shell. It comes to the glass for you and not for your partner. It sometimes drags a bottle cap home from somewhere. They care when the seahorse pair they bought on day 15 has babies on day 40, and the journal says so the next morning before anything else.

The game now does most of that for real: personalities you can tell apart by watching, recognition you can see, favorite places, friendships that change how fish swim, births and pairings surfaced on return. The three things still standing between Tako Cove and real attachment:

1. **Physical memory.** The keepsake has to be a thing the octopus visibly owns: carried, kept, rearranged. Right now that only works when the keepsake is nearby.
2. **Pairs that look like pairs.** Seahorse mates should be visibly inseparable all day, not only at their morning meeting.
3. **Something after level 8 that comes from the animals, not from a level.** Generations, a turtle coming back, a bred color. The rules already contain these; they need to be what the Today screen celebrates in weeks 4–8.

If those three land, a player on day 30 won't be checking a progress bar. They'll be checking on someone.
