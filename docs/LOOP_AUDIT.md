# Loop audit, October 2026

> **Update:** every recommendation below except shared feeding has now been implemented (see "After the fixes" at the end).

Each finding is marked:
- **[code]**: confirmed by reading the code.
- **[test]**: an automated test.
- **[sim]**: a simulation.
- **[design]**: my recommendation.
- **[verify]**: an assumption still to check.

Simulations play bots through the real rules (`web/src/game/rules.js`). They measure events, not how players feel, and prove nothing about retention.

**Tools added for this audit (read-only):**
- `tools/econ4.mjs`: economy and journal over 30, 60 and 120 days, with one to four caretakers.
- `tools/neglect_sim.mjs`: absences from 24 hours to 14 days.

Shared feeding (octopus and seahorse) is **out of scope by your decision**. Ownership stays as it is.

---

## 1. Strengths

- **[code]** The animal systems are deep and real:
  - Octopus memory: of objects, of caretakers (trust), of fish (buddies and rivals).
  - Six personality types that steer what each octopus does.
  - Hide a treat, which learns each caretaker's habits (`hideOrder`).
  - Seahorse families from pairing to choosing a baby (`seaFamilies`, `conceive`).
  - Egg care that matches each species' real biology (`EGG_CARE`).
  - Natural aging and death from old age, with memorials.
- **[code]** The rules run on the server for shared tanks, so every phone sees the same tank.
- **[code]** The death safeguards are generous: no deaths in a tank's first 3 days, at most one a day, never the last animal (`tendFish`).
- **[code]** Postcards use the native iOS share sheet, with the image as a file (`main.js`, `navigator.share`).

## 2. Confirmed problems

| # | Problem | Evidence |
|---|---|---|
| P1 | **The tank is "finished" by about day 25.** Level 8, a full tank (28 fish, 58–59 of 60 decorations), then nothing left to buy. | [sim] all four scenarios |
| P2 | **Shells pile up:** 3,000–3,500 unspent by day 120 in every scenario. | [sim] |
| P3 | **The journal turns repetitive after a month.** Kinds of journal line: 120–135 in days 0–30, then 16–68 after. "A ___ is visiting" and "said hello" appear ~1.5 times a day each; "A perfect day" and "both looked after the tank" daily. | [sim] econ4 journal count |
| P4 | **The "rare" visitor isn't rare.** One comes every 9–15 hours, about twice a day. | [code] `visitAt = now + (9 + …%6) h`, rules.js:401, 1456 |
| P5 | **Breeding stalls in a full tank.** Only 2–4 births in 120 days, because eggs need free room. Schooling fish (Blue Chromis, Pink Anthias) never breed. | [sim] [code] `capacity`, the egg rules |
| P6 | **A week away kills an animal; two weeks kills all but the last.** The warnings only arrive late. | [sim] neglect_sim |
| P7 | **The daily gift is per caretaker, into one shared wallet.** Four friends get four gifts (+8 a day). Bottles add +8 a day in a busy tank, but they cost what they pay, so the net is zero. | [code] rules.js:1123, `BOTTLE_PAY` |
| P8 | **Many small rewards and pop-ups.** Each step below has its own toast: gift, checklist item (3/5/8), perfect day (+3), today's request (+4), a fish's wish every 6 hours (+4), visitor (+4), each feed (+1), level-ups, age milestones, the tank's weekly birthday (+8). | [code] 29 places that add shells |
| P9 | **Naming:** the game calls itself "OUR TANK" in code, shares and notifications. You call it Tako Tank. | [code] main.js:78, push title |
| P10 | **Quiet hours are fixed at 22:00–08:00** and can't be changed. | [code] push.mjs:41 |

## 3. Daily activity and reward audit

**What a visit offers today [code]:** the daily gift, feeding, the glass, the water, trimming, one daily checklist item (a tier of 3, 5 or 8), the perfect-day bonus, today's request, fish wishes (every 6 hours), visitors (about twice a day), finds, bottles, petting, play, and the shop.

**Time:**
- **[design]** About 2–4 minutes covers everything due. The checklist items need watching a real event, so they can take longer or not happen at all.
- **[code]** The checklist only uses events the phone actually saw. Nothing is made up to complete it.

**Shells per day [sim], 3 visits a day each:**

| | Solo | 2 caretakers | 4 caretakers | Uneven |
|---|---|---|---|---|
| Earned per day (120-day average) | 38 | 45 | 57 | 42 |
| Biggest sources | visitor 6, feed 6, finds 4, checklist 4, petting bonds 3.6, age 3 | + gift 4, bottles 4 | gift 8, bottles 8, visitor 7, feed 7 | visitor 6, gift 5.5, feed 5 |

**[design] Enjoyable:** the octopus games (hide a treat, the puzzle jar), visitors when they are actually rare, bottles between friends, the journal, seahorse family events.

**[design] Repetitive:** collecting a reward for every feed, the perfect-day bonus, a fish's wish every 6 hours, visitors twice a day, the weekly birthday +8.

## 4. Four-caretaker economy (simulation)

Means of 3 seeds. Prices and rewards are the real ones. The bots buy each new item once (fish first) and play the puzzle jar or hide a treat once a day. "Couldn't afford" counts the times a bot wanted the next new item but lacked the shells.

| Scenario | Day 30 balance | Day 60 | Day 120 | Highest | Level 8 on day | Fish bought | Decorations bought | Couldn't afford | Deaths | Births |
|---|---|---|---|---|---|---|---|---|---|---|
| A. Solo | 239 | 1,354 | 3,070 | 3,070 | 24.5 | 15 | 59 | 17 | 0 | 4 |
| B. Two | 302 | 1,419 | 3,127 | 3,127 | 23.3 | 15 | 58 | 34 | 0 | 4 |
| C. Four | 471 | 1,672 | 3,492 | 3,492 | 21.8 | 17 | 59 | 58 | 0 | 2 |
| D. Uneven | 260 | 1,567 | 3,520 | 3,520 | 24.2 | 17 | 58 | 30 | 1 | 3 |

**Reading it:**
- Shells are tight until about day 25: the "couldn't afford" moments all happen then.
- After that, everything has been bought and income has nowhere to go.
- Four caretakers reach the end only about 3 days sooner than one. So the per-caretaker income (P7) isn't the main problem. The main problem is that **there is little left to want after day 25** (P1).

**[design] Recommended direction:** cut repetitive rewards rather than add new expensive items. The simulation shows a cut moves the end of buying later, but doesn't fix "nothing left to want". That needs P3 and P5.

## 5. Neglect and mortality (simulation)

**Confirmed thresholds [code]**, in `tendFish`:
- **Neglect builds up** while an animal is hungry, from about 30 hours after its last meal, or while the water is bad.
- **2 days of neglect:** "looks tired". **3 days:** "critical".
- **5 days, and health at or below 0.4:** death becomes possible.
- **Safeguards:** at most one death a day, never in a tank's first 3 days, never the last animal.
- **Recovery:** neglect fades twice as fast as it builds once care resumes.
- **A setting turns death off for a tank** (`flags.mortality`).
- **Rules:** solo and shared tanks follow the same rules. A shared tank's time keeps moving on the server while everyone is away.

**What each absence does [sim]**, for a well-kept tank with nobody visiting:

| Away | Result | After 2 days of care |
|---|---|---|
| 24 h | All healthy, a little hungry | Full health |
| 48 h | Octopus, seahorse and Blue Chromis at health 0.56 | Full health |
| 72 h | Same, health about 0.47; no warning sent yet | Full health |
| 7 days | All critical (health 0.2); **the seahorse died** | The rest fully recover |
| 14 days | **Every animal died except the octopus** (one a day; the last is protected) | Only the octopus left |

**Other facts:**
- **[code]** Several caretakers do prevent neglect: anyone's feeding feeds the fish. The octopus and seahorses only eat if their own caretaker visits.
- **[verify]** Is a vacation mode in place? There's only the death setting. And how quickly does a push notification reach a caretaker away for a week?

**[design] Recommendation:** soften rather than remove.
- Keep death from old age.
- Change neglect: instead of dying, a neglected animal stays "unwell", rests, avoids others, and needs a day or two of care to recover. Its history is kept.
- A tank left for weeks becomes a quiet, sad tank, not an empty one.

This is about 30 lines in `tendFish`. **It needs your approval.**

## 6. Shared ownership

Out of scope by your decision. One fact for the record **[code]**: a friend can take on an animal after its caretaker has been away for 14 days (`awayOwner`). The 7-day result above shows that window is longer than a seahorse can survive without its caretaker.

## 7. First five minutes

**Today [code]:**
1. Color and name.
2. Four tip cards: snack, friends, starter plant, done.
3. A held chapter banner.
4. The gift after a quiet minute.

**[design] Proposed flow** (not built), reusing existing behavior:
1. Name the octopus. It drops into the tank and investigates the nearest decoration, as it already does with anything new.
2. About 10 seconds of nothing to read: just watch it.
3. One tip: "Touch the glass": a finger held on the glass, which the octopus already comes to. It comes over.
4. Then "Time for a snack": the Feed screen. The crab drops in by itself and the octopus hunts it.
5. Only after that: the shop's free plant, and inviting friends, both as quiet lines in the Bell rather than cards.

## 8. Coming up

**Today [code] (`forecast`):** shows the next 8 hours, or a day ahead for an egg or a birth: hatching eggs, seahorse births, the nursery being ready, arrivals, growing up, the next puzzle.

**[design]** Add only things the rules can already compute:
- **"Pregnant: due in about 3 days"**, from `preg.due`.
- **"Nearly paired"**, from the seahorse pairing clock.
- **"Getting old"**, for elders: the start is exact, the end is not, so no countdown.

Keep the 3-line limit.

## 9. Journal and sharing

**Today [code]:**
- **Where lines come from:** the rules (growth, births, deaths, visitors, finds, wishes, hunts, puzzles) and the phone running the animals (real moments: impressions, play, inking, at the glass).
- **Duplicates** are prevented per moment and animal, with gaps (`MOMENTS` gaps of 4–12 hours).
- **Saved** on the server; every phone sees the same journal, photos and hearts.

**[sim]** After day 30, routine lines dominate (P3). **[design]** Fold these into the existing "Also:" line instead of full posts:
- visitor arrivals and hellos;
- "perfect day" and "both looked after";
- the weekly tank birthday.

Then real moments rise to the top on their own.

**Sharing:**
- **[code]** Through the native share sheet.
- **[design]** Change "OUR TANK" to the name you want on postcards and invites (P9).
- **[verify]** Look at a postcard on a real iPhone.

## 10. Hide a treat

**[code]** 5 shells, a 20-minute rest; learns per caretaker. **[test]**:
- After 2 hides in the same spot it goes straight there.
- A new spot costs it 3 or more tries.

**[sim]** It's the biggest spending in busy tanks, 2–9 shells a day. With 3,000 spare shells, the price matters little once the tank is finished.

**[design]** Keep 5 while shells are tight in the first 3 weeks. Revisit after the reward cuts. Can it be exploited? There's nothing to gain beyond bond and journal lines; it pays no shells.

## 11. Species check

**[code]** Egg care matches the displayed species' biology:
- Clownfish, damselfish and goby fathers guard eggs on rock.
- Royal gramma fathers build a seaweed nest.
- Cardinalfish fathers carry eggs in their mouths.
- Emperor angelfish and mandarin dragonets release eggs to drift.

Old internal ids (goldfish, neon, betta...) only appear in data, never on screen.

**Mismatches found:**
- Blue Chromis and Pink Anthias never breed in the game. Real chromis fathers guard nests; anthias release eggs to drift. This is a simplification, not an error.
- **[verify]** The species blurbs and food preferences, one by one, against the shop pictures.

## 12. Notifications

**[code]:**
- **Kinds:** five, opt-in each.
- **Quiet hours:** 22:00–08:00, in the caretaker's own time zone, not adjustable (P10).
- **Daily limit, by priority:** light news only on a quiet day; important news up to 3 a day.
- **No repeats:** each event is told once (stored keys), and a hungry octopus at most once in 12 hours.

**[design]**
- If neglect is softened (section 5), hunger only needs a notification when an animal is close to "unwell", about day 2. Most days would then have zero notifications.
- Make quiet hours adjustable later; not urgent.

## 13–15. Retention at 30, 60 and 120 days (simulation)

| | Days 0–30 | Days 30–60 | Days 60–120 |
|---|---|---|---|
| Journal lines per day (solo / four) | 14 / 20 | 7.5 / 11 | 6 / 9 |
| Kinds of line (solo / four / uneven) | 122 / 136 / 128 | 27 / 31 / 24 | 38 / 68 / 16 |
| Fish | grows to the limit (28) | 28 | 28 |
| New purchases | almost everything | almost none | none |
| Births / deaths | 2–4 / 0–1 | about 0 | about 0 |
| Required chores | about 4 a day (feed ×2, glass and water every few days) | same | same |

**[design] Where it slows:**
- Purchases and levels stop around day 25.
- Breeding stops when the tank is full.
- Old-age deaths only begin around day 90–120 for octopuses (lifespan 120 days), later for fish (240–420 days).

Between day 30 and day 90, very little changes in the life of the tank.

## 16. Highest risks

1. **Days 30–90 feel the same** (P1, P3, P5). The biggest risk to "the animals create the stories".
2. **Losing animals after a week away (P6).** A real-life vacation kills a pet. Harsh for a calm game.
3. **The reward clutter (P8)** makes it feel like ticking boxes.

## 17. Recommended changes, ranked

1. **Turnover so stories keep coming** (uses existing systems):
   - Room for breeding in a full tank: eggs count against a separate small nursery allowance.
   - Old age begins sooner for the shortest-lived fish.
   - **[design]** Tune `capacity` and egg room, not new features.
2. **Make visitors rare and routine lines quiet:**
   - Visitors every 2–4 days instead of twice a day.
   - Fold routine journal lines into "Also:".
   - Drop the "perfect day" post and its +3 shells.
3. **Soften neglect death** to "unwell and recovering" (section 5).
4. **Fewer, calmer rewards:**
   - Feeding: +1 only the first time each day.
   - Fish wishes every 12–24 hours, not every 6.
   - The weekly birthday becomes a journal line, without +8.
   - The daily gift becomes one per tank (shared), not one per caretaker.
5. **First five minutes** as in section 7.
6. **Coming up additions** (section 8).
7. **Name and branding** (P9).

## 18. Smallest implementation plan

Each step can be released, tested and reverted on its own.

1. **Constants:** the visitor gap, fish-wish gap, feed reward, removing perfect day, the birthday reward, the daily gift scope. Then rerun `econ4`.
2. **The journal fold list** in `ui.js` (`ROUTINE`).
3. **Egg room in a full tank** (`capacity`, the eggs rules). Then rerun `econ4` to check births and wallet.
4. **Neglect becomes recovery** (`tendFish`), keeping the death setting for old age.
5. **The onboarding order** (`tut` steps in `main.js`).
6. **Coming up lines** (`forecast`).

## 19. Effort

| Step | Effort |
|---|---|
| 1, 2 | Half a day with simulations |
| 3 | A day |
| 4 | A day with tests |
| 5 | A day |
| 6 | Half a day |
| 7 (naming) | An hour, once you decide the name |

## 20. Needs your approval

- [ ] Visitors every 2–4 days (now about twice a day).
- [ ] Remove the perfect-day bonus (+3 and its journal post).
- [ ] Feeding pays +1 only once per day.
- [ ] Fish wishes every 12–24 hours (now every 6).
- [ ] The weekly birthday +8 becomes a journal line only.
- [ ] The daily gift: one per tank instead of one per caretaker.
- [ ] Room for eggs and babies in a full tank.
- [ ] Neglect no longer kills: animals become unwell and recover. Old-age death stays.
- [ ] The new onboarding order (section 7).
- [ ] The game's name in invites, postcards and notifications: Tako Tank or Our Tank?
- [ ] Hide a treat price: leave at 5 for now.


---

## After the fixes (implemented, tested, re-simulated)

**What changed:**

| Area | Before | Now |
|---|---|---|
| Visitors | every 9–15 hours | every 2–4 days (a new tank still gets its first within a day) |
| Perfect day | +3 shells and a journal post | ticked on the checklist only |
| Feeding | +1 per hungry feed | +1 once a day per tank |
| Fish wishes | every 6 hours | every 18 hours |
| Weekly birthday | +8 shells | journal line only |
| Daily gift | one per caretaker | one per tank |
| Journal | routine lines posted in full | "said hello", "both looked after", the birthday and "perfect day" fold into "Also:"; visitors, now rare, stay as posts |
| Births in a full tank | stopped | 4 extra places for eggs and kept babies (the shop limit is unchanged) |
| Neglect | could kill after 5 days | tired, then very unwell, never dies; recovers with care ("___ is back to its old self"); old age is unchanged |
| Hunger notifications | at about 70% hunger | only once an animal has started to suffer for it |
| Coming up | the last day of a pregnancy | the whole pregnancy, and "___ and ___ are getting close: they may pair up" |
| First minutes | straight to "Time for a snack" | a quiet moment, "Say hello" (hold the glass, the octopus comes), then the snack |
| Name | OUR TANK | Tako Tank in invites, postcards, notifications, the home-screen name and the welcome screen |

**Re-simulated** (`tools/econ4.mjs`, `tools/neglect_sim.mjs`):

| | Before | After |
|---|---|---|
| Shells earned a day (solo / four) | 38 / 57 | 26 / 38 |
| Balance at day 120 | 3,000–3,500 | 1,000–1,400 |
| Level 8 reached | day 22–25 | day 31–34 |
| Births in 120 days | 2–4 | 11–12 |
| Deaths after 7 / 14 days away | 1 / all but one | 0 / 0 (full health two days after care) |
| Kinds of journal line, days 60–120 | 16–68 | 50–108 |

**Tests:** all 94 rule tests, 86 server tests and the 8 browser checks pass. Tests that relied on neglect killing now use old age.

**Still open:**
- Shells still pile up slowly after the tank is complete, about 8 a day.
- After level 8, progression stands on births, aging and the octopus's learning. Real players will show whether that's enough.
- Quiet hours are still fixed at 22:00–08:00.
- The "Say hello" moment needs a look on a real phone: the octopus can stay high up behind the tip card.
