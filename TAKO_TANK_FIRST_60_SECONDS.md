# Tako Tank: The First 60 Seconds — Audit, Recommendations, Newcomer Test

**Date:** 2026-10-22 · **Build:** `ca9195b` · Nothing in this document has been implemented yet.

**How it was audited:**
- I read the opening code: `welcomeBack`, `octoHello`, `FishManager.greet`, the reunion card and the sick alert in `main.js`, `ui.js` and `w3/fishmgr.js`.
- I recorded a real opening second by second in the browser. The tank is a save made by ordinary play to level 5 (`tools/sim/milestones.mjs`), opened as a returning player. Each second I logged what was on screen (pop-ups, cards, toasts) and what the octopus and the fish were doing, with screenshots at 2, 5, 20 and 60 seconds.

**Limits of the recording:**
- The save was a few days old when opened, so this is the "back after days away" case, not "back after a night".
- The octopus's trust in that save belonged to the simulated player, not the browser player, so it acted as with a stranger. Recognition was checked separately (`tools/living_check.mjs`, `tools/attach_check.mjs`).
- The headless browser draws about 0.3 frames per second, so its timings are not phone timings.

---

## 1. Audit: what happens today

### Q1. Does the aquarium appear immediately, without menus?
**Mostly yes, then it gets covered.** No menu has to be passed: the tank renders straight away for a returning player. A new player gets the short welcome card first (choose an octopus's color and name), which is fine.

**For a returning player, about 3 seconds in, two things land on the tank at once:**
- A **blocking pop-up**, "⚠️ PIP IS VERY SICK", whenever an animal's neglect has passed the warning level. It blurs the whole tank and stays until tapped; in the recording it was still there at 60 seconds. Worse, its text says **"Without help it could die within a day or two"**, which is **false**: animals no longer die of neglect, only of old age (`main.js` sick alert, `ui.js` `sick()`).
- The **on-tank "While you were away" card**, which plays its lines one by one (here "1 of 7"), about 4 seconds each, and holds other pop-ups back while it plays (`welcomeBack` → `ui.reunion`).

The same news is also in **Today → While you were away** (stored per caretaker on the server), so a returning player can get it twice.

### Q2. Does a familiar octopus visibly recognize the returning caretaker?
**The behavior exists, but two systems fight over it.**
- `FishManager.greet` (called by `octoHello` 4 s after opening, and when the app comes back to the front) is the real, trust-based greeting:
  - trust 3: comes right up to the glass, about 35% of openings
  - trust 2, for a show-off or a watcher: comes to the glass, about 25%
  - trust 1 or more: watches you from its den
  - a stranger: carries on with what it was doing
- In the browser this is **visible on screen**: the octopus that knows you presses to the front glass 75–77% of the frames after greeting, and a stranger never does (`attach_check`).
- **But** about 1.4 s after opening, `welcomeBack` sends the caretaker's highest-bond animal to the glass **whatever its trust**. For an octopus this sets a plain glass visit, so a barely-known octopus can rush to the glass and a trusted one's real greeting can be overwritten 3 s later. That is effectively the scripted welcome you don't want.
- At 35%, a trusted octopus comes to the glass on only about one opening in three. A player may never connect the behavior with being recognized.

### Q3. Are the animals already behaving naturally when the tank opens?
**Yes.** The simulation runs from the first frame: no frozen poses, and no animals reset to a spawn point. In the recording the octopus was already busy ("Sulking in the cloudy water", examining something) and the fish were swimming. Seahorses go straight to their holdfasts, the goby to its station, pals swim together.

### Q4. Can a player notice relationships, favorite places and activities without opening profiles?
**Partly: the behavior is on screen, the meaning is not.**
- **Visible on screen** (measured in `attach_check`):
  - pals swim closer together (3.06 vs 4.67 apart)
  - mated seahorses dance and then settle near each other (about 27% closer than singles)
  - animals return to favorite spots (20–50% of their time vs under 10% for others)
  - the octopus carries keepsakes home, from all 6 places tested (`keepsake_check`)
  - the goby cleans other fish at its station
- **Only in text:** what each animal is doing and why (`thought`, `actText`, e.g. "Cleaning Pip", "Watching you from its den", "Holding its mate's plant") is shown only on the animal's card. Tapping an animal shows a small pill with its name and "More info", not what it is doing. A newcomer sees fish moving but will not know two of them are best friends.

### Q5. Does Today surface real developments without interrupting the aquarium?
**Today itself, yes. The opening, no.**
- **Today works:** it opens with "While you were away", built from real journal events, big news first (births, pairings, best friends, favorite spots, octopus trips, keepsakes). It is a sheet you open, it never interrupts, and routine care and daily dances are filtered out.
- **The interruptions come before Today:** the on-tank reunion replay and the sick pop-up. There are also chapter banners and level-up dialogs (already held back while the reunion plays), and goal hint toasts.

### Q6. Is there a satisfying animal reaction to the first interaction?
**Yes, for the two main interactions:**
- **Feeding:** choosing a food closes Care and drops it near the right animals; every fish goes for it. Seahorses snick mysis from their holdfast; the octopus hunts its crab.
- **Petting / play:** a burst of bubbles, a sound and a haptic, and the animal perks up. The octopus follows your finger along the glass.

**Weaker:**
- **Tapping an animal:** a pill with its name and "More info". The animal itself doesn't react to being tapped.
- **The first action on returning** is often dismissing a pop-up rather than touching an animal.

---

## 2. Recommended changes (smallest first; no new systems, no scripted welcome)

| # | Change | Why | Size |
|---|---|---|---|
| **R1** | **Remove the blocking "VERY SICK" pop-up.** Show a sick animal the way the game already shows needs: the Care tab's red dot, Care's "To do" list first, the Tank chart's "Best next step" ("Help Pip"), and the animal's own unwell look (pale, low, slow). Fix the text everywhere to the truth: *"Pip is unwell. Food and clean water will bring it back."* | It blocks the tank on opening, and it threatens a death that cannot happen. | Small |
| **R2** | **One return summary, not two.** Replace the on-tank replay with one quiet line at the top for about 5 seconds: *"3 things happened while you were away · see Today"*. It never blocks the tank, and a tap opens Today. Today keeps the full, per-person list. | The aquarium is the welcome; the news belongs in Today. | Small |
| **R3** | **Let the octopus's own greeting be the only greeting.** Remove `welcomeBack`'s forced "favorite swims to the glass". Run `greet()` as soon as the tank is visible (about 1–1.5 s, not 4 s). Make a trusted octopus come to the glass more often: trust 3 about 70%, trust 2 show-off or watcher about 45%. Den-watching and ignoring stay as they are. | Recognition then comes only from trust and personality, and a trusted octopus says hello often enough for a player to notice and connect it with themselves. | Small |
| **R4** | **A quiet first 15 seconds.** No pop-ups, banners, coach tips or toasts for the first 15 seconds after opening, or until the player's first tap. Only a real decision or a birth happening right now may show, and only as a small banner. | The first impression should be the animals. | Small (the "quiet until" timer exists) |
| **R5** | **Say what an animal is doing when tapped.** The name pill gains its current activity, from data the animals already keep: *"Neo · cleaning Pip"*, *"Mia · resting by her mate"*, *"Ink · watching you from its den"*. | Relationships and habits become noticeable without opening a profile. | Small |
| **R6** | **A small reaction to being tapped.** The tapped animal turns toward the glass for a moment: a fish flicks, a seahorse swivels an eye, an octopus that trusts you raises an arm. This reuses existing poses (glance, flick, swivelling eyes). | The first touch gets an answer from the animal, not just a label. | Small |

**Not recommended now:** a welcome animation, new greetings, new tutorial steps, or changes to Tank Health, levels or economy.

---

## 3. First-time iPhone test: 3–4 people who have never played

### Setup
- Each person uses **their own iPhone**, on the deployed build, added to the home screen (as a real player would).
- Give them **no instructions** beyond: *"This is a game about an aquarium. Play with it however you like for about 10 minutes. Think out loud."*
- One observer per player. Write down **what they do, what they say, and where they hesitate** (over 5 seconds without acting). Don't help unless they're stuck for over 60 seconds; if you do help, note exactly what you said.
- Record the screen if they agree (iOS Screen Recording) and note the time of each event.
- Session 1 is about 10 minutes. Session 2 is the next day, at a time they choose. Ask them to open it on their own and note **whether they do, and when**, without reminding them.

### What to measure

| Goal | Watch for | Ask afterwards |
|---|---|---|
| **A. Understands what to do without instructions** | Time to first meaningful action (pick and name an octopus; first feed). Any hesitation over 5 s, and on which screen. Taps on things that aren't buttons; buttons they missed. | "What did you think you were supposed to do?" "Was anything confusing?" |
| **B. Notices individual animal behavior** | Do they comment on a specific animal ("it's hiding", "those two are together", "it came to me")? Do they tap animals? | "Tell me about your octopus." "Did any animal seem to have a personality?" "Did anything surprise you?" |
| **C. Enjoys feeding and interacting** | Smiles or laughs; repeated feeding or petting without being asked; time spent just watching. | "What was the most fun moment?" "Was anything boring or annoying?" |
| **D. Understands Tank Health and leveling** | Do they open the two rings (top right)? Can they say what raises health? Do they notice a level-up? | "What do the two circles at the top mean?" "How does your tank get bigger?" (Score: right / partly / wrong.) |
| **E. Wants to return** | Day 2: did they open it unprompted? How long until they did? | "Would you open it tomorrow? Why?" "What would you want to check?" (1–5 scale.) |

### Day 2 checklist (their own return)
- What do they look at first: the tank, the "While you were away" news, or a pop-up?
- Do they notice anything that changed (an animal grown, a pair, a keepsake)?
- Does the octopus react to them, and do they notice? Ask: "Did your octopus do anything when you came back?"
- Is anything about coming back stressful (a sick animal, a low health ring)? Ask: "Did you feel welcomed back, or told off?"

### Sorting what you find: usability or gameplay?
Put each problem in one column. They need different fixes.

| Usability problem (fix the interface) | Gameplay problem (fix the game) |
|---|---|
| They wanted to do something but couldn't find how (feed, close a sheet, place an item). | They knew how, but didn't want to. |
| A button or label was misunderstood, missed, or tapped by mistake. | An activity felt repetitive, pointless or too slow. |
| Text was unclear or misleading (e.g. thought an animal would die). | Rewards felt too small, or progress felt too slow or too fast. |
| They didn't notice something that was on screen (a ring, a badge, a choice). | They noticed the animals but didn't care about them. |
| Performance: stutter, heat, battery, slow loading. | No reason to come back tomorrow. |

**Rule of thumb:** if a hint from the observer instantly fixes it, it's usability. If they understand it and still don't care, it's gameplay.

### Per-player summary (fill in for each)
- Phone and iOS version; time to first feed; number of hesitations over 5 s.
- Best moment, worst moment (their words).
- Can they name an animal and describe its behavior? (yes / no)
- Understood health and leveling? (right / partly / wrong)
- Day 2: returned unprompted? (yes / no, and when)
- Top 3 usability problems; top 3 gameplay problems.

---

## 4. Recommended order before the test
1. **R1** (no false death warning, no blocking pop-up) and **R2** (one quiet return line): these change the first impression most.
2. **R3** (the octopus's real greeting, more often) and **R4** (a quiet first 15 seconds).
3. **R5** and **R6** (what an animal is doing when tapped, and a small reaction to being tapped).
4. Re-record the first 60 seconds with the same method and compare, then run the newcomer test.
