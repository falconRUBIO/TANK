# Tanklings: Verification Before Outside Testers

**Date:** 2026-10-23 · Screenshots: `docs/audit/verify/`

**How this was checked:** headless Chromium in the cloud (iPhone-sized window, 390×844). **No real iPhone was available.** The browser draws about 0.3 frames per second, so it can show what appears and when. It cannot show smoothness, battery or heat, or the short tap reactions (under a second). Those need your phone (section 5).

---

## 1. The first 60 seconds (returning player, latest build)

**Setup:** a tank grown by ordinary play to level 5, last opened 8 hours ago. The player is the octopus's own caretaker and it trusts them fully (level 3). A page-level log recorded the exact second every message appeared.

| When | What appeared |
|---|---|
| 0–5.1 s | Loading. The tank appears at 5.1 s, with animals already moving. |
| 11.3 s | The small return-news line: "7 things happened while you were away · Today ›" (the one allowed indicator). |
| 15.8 s | The quiet window ends. Goal hint: "Pip is unwell. Food and fresh water will bring it back." |
| 17.9 s | A top card about eggs. |
| 37.7 s | Toast: "A decision is waiting for you". |
| 41.4 s | A top card: "Dot was born". |
| 68 s | Tip: "Eggs in the tank". |

- **Nothing blocks the tank automatically.** No pop-up that has to be dismissed, no replay, no death warning.
- **Caretaker recognition works but is not guaranteed**, as intended. Over three openings, the trusted octopus came to the glass once ("Came to the glass to see you") and looked up at the player twice. That matches the measured rate of about 68% for its personality.
- **Tapping the octopus** shows "Ink · at its den". Its eyes widen and it flushes with color (the values were set; the movement itself is not visible headless).
- **Tapping a fish** that is doing nothing notable shows only its name, by design.
- **Opening Care** puts a waiting decision (one fish chasing another) first, then Feed, Animal health and Tank upkeep.
- **Feeding:** choosing flakes closes the menu and the food drops in by itself. The tank's hunger went from 0.85 to almost 0, and fish swam to the food.

**Fixed during this check:**
1. **The quiet window was being cut short.** When eggs were in the tank, the egg code reset the quiet timer to "4 seconds from now", which let an eggs card cover the tank at about 5 s. Now any code can only lengthen the quiet window, never shorten it.
2. **"Just now" was untrue.** The top card said "Just now" for things that happened days ago while the player was away. It now says "New in your tank".
3. **Cards piled up after the quiet window.** Birth and egg cards now come at least 30 seconds apart.

**Still true (not changed):** after the quiet window, a returning player with lots of news still gets about five messages in the next minute: a hint, cards, a toast and a tip. None of them blocks the tank, but it is busy. See Unresolved, item 1.

---

## 2. The eight browser-test failures

| # | Test | What it expected | What the game does | Verdict | Done |
|---|---|---|---|---|---|
| 1 | loop_check: Care opens with "Inky is hungry. Feed Inky a crab" | A one-line headline at the top of Care | Care is now a list of rows ("Feed · 1 animal could use food"). The headline was removed on purpose; care_check even checks it is gone. | Outdated test | Now checks for a Feed row that needs you |
| 2 | loop_check: when all is done, "All looked after" | The same old headline | Nothing needs you, and the Feed row says when food is next due | Outdated test | Checks for that instead |
| 3 | loop_check: a hungry octopus comes to the glass for a crab | It comes to the front and watches you | **It never did.** The game marks an octopus "Hungry" from about 0.75 hunger, but a separate "listless with hunger" rest started at 0.6 and almost always ran first. | **Real bug** | **Fixed:** a hungry octopus asks at the glass first, rests listlessly between asks, and above about 0.8 hunger only lies listless. The test now passes. |
| 4 | care_check (busy) | A row called "Health" | The row is called "Animal health" (renamed on purpose so it isn't confused with Tank Health) | Outdated test | Accepts the new name |
| 5 | care_check (calm) | The same | The same | Outdated test | The same |
| 6 | playthrough: shells fly up after feeding | A shell paid for feeding | Feeding pays nothing on purpose ("feeding is care: no pay", from the earlier calmer-rewards change). Care earns level points instead. | Outdated test | Checks that feeding works and no shells change hands |
| 7 | playthrough: feeding pays one shell | +1 shell | No shells, as above | Outdated test | As above |
| 8 | playthrough: a plant costs 10 shells | The Red Gorgonian at 10 | It is now level 2 at 16. At level 1 it was locked, the test misread a leftover label, and the run then crashed. | Outdated test | Uses a level-1 plant (Sea Anemone, 14) |

**More outdated checks, found once the playthrough stopped crashing early:**
- the Torii Gate is now earned, not bought
- the clownfish is always "today's special" at level 1
- shop fish arrive young, not as babies
- levels come from care, not from buying fish
- babies stay babies for 3 days
- the first animal is now an octopus, which keeps a den rather than a favorite spot
- the water change moved into "Tank upkeep"
- the "welcome back" replay was removed (as you approved)

Each was checked against the current rules before the test was changed.

**Results now:**
- `npm test`: 95/95
- loop_check: passes
- care_check: passes
- playthrough: passes, including first run, feeding, the shop, adopting, care, reload, and coming back with nothing covering the tank

---

## 3. The first 10 minutes as a new player (completely new tank)

What a new player sees, in order (screenshots `np_01` to `np_12`):
1. **Welcome card:** choose an octopus color and a name. Clear.
2. The octopus drops in; about 25 s later (headless timing) a tip: "Time for a snack: Open Care, tap Feed, then Feed on its card." Clear, though the wait may feel long.
3. **Care:** "One thing needs you right now", with Feed, Animal health and Tank upkeep rows. Clear.
4. **Feed:** one card for the octopus with a Feed button. One tap: the menu closes and a crab drops in. Clear.
5. "You are all set", then **Coming up** (grows up in 3 days, something will turn up, a visitor tomorrow). Fine.
6. **Tapping the octopus:** "Squid · hunting a crab". Its card has a lot on it: needs, trust, milestones, likes.
7. **The two rings** (level and Tank Health) open a sheet with a plain explanation, a "Best next step", and points to the next level. Clear.
8. **Shop:** shells (20), categories, and locked items marked with their level.

| Topic | Understandable? | Problems found |
|---|---|---|
| First octopus | Yes | The card says trust "Hides from you" a minute after adopting it. It's honest, but it reads a little cold. |
| Feeding | Yes | None. One tap, food drops in. |
| Care | Yes | "Animal health · Squid needs you" a minute into the game. Squid is not ill: its needs (a den, puzzles) are simply not met yet. |
| Tank Health | Yes, if they tap the rings | Nothing points a new player to the rings. |
| Shells | Partly | The first-feed toast said nothing about shells, and that is now correct. A new player isn't told how shells are earned until later tips. |
| Shop | Mostly | **Fixed:** the hint said "press and hold" (out of date). **Not fixed:** at level 1 the only single fish, the clownfish, is always "today's special", so the tile says "carries ghost". Adopting one asks about a hidden rare color before you have even named it. That is jargon and an extra step at minute 3. |
| First animal interaction | Yes | Tapping shows real activity; the card offers "Let Squid follow your finger". |

**Also fixed:** the card line "Missing 5 things: a den of its own and puzzles to solve" (it named only two). It now reads "Missing 5 things, such as a den of its own and puzzles to solve."

**Messages in the first 2 minutes:** welcome, tip, "all set", Coming up, a "New chapter" card 7 s later, then three explanation toasts as each screen is first opened. Nothing blocks the tank, but there is a lot of text. No new tutorial is needed. If anything, there should be fewer messages.

---

## 4. Real-player test plan (3–4 people, their own iPhones)

**Before:** deploy the latest build. Each person opens the link in Safari and adds it to the home screen. Say only: *"It's a game about an aquarium. Play however you like for about 10 minutes and think out loud."* Don't help unless they are stuck for more than a minute; if you do, write down exactly what you said.

**Session 1 (10 min). Observe:**
- Time from opening to the first tap on something (target: under 20 s).
- Do they name the octopus with care, or rush it?
- **Do they find Feed without help?** (Target: everyone within 2 minutes.)
- Do they watch the food fall and the animals eat?
- Do they tap an animal on their own? Do they read what it says it is doing?
- Do they open the two rings? The Shop? Do they buy anything?
- Any pause over 5 seconds: write down the screen.
- Smoothness: stutter, heat, and battery percentage at the start and end.

**Session 2 (next day, unprompted).** Don't remind them. Note whether they open it, and when. Watch what they look at first, and whether they notice the "things happened while you were away" line.

**Ask afterwards:**
1. "What were you supposed to do?"
2. "Tell me about your octopus." (Listen for personality and recognition.)
3. "What do the two circles at the top mean?"
4. "How do you get shells, and what are they for?"
5. "Was anything confusing or annoying?"
6. "Did you feel welcomed back, or told off?" (day 2)
7. "Would you open it tomorrow? 1–5."

**Counts as a serious problem:**
- Anyone can't feed their animal within 3 minutes without help.
- Anyone thinks an animal will die or is being punished.
- The game crashes, freezes, loses progress, or the tank is blank or black.
- Noticeable stutter or heat within 10 minutes on a recent iPhone.
- Two or more people say there are "too many pop-ups or messages".
- Nobody can say anything about their octopus's personality.
- Nobody returns on day 2.

---

## 5. Exact steps to verify on your iPhone (about 10 minutes)

1. Redeploy. On your iPhone, open the site and **pull to refresh twice** so the new version loads. (Settings shows the build; it should end in v295.)
2. **Returning player:**
   1. Close the app fully and wait 30 minutes or more.
   2. Open it and count to 15. Nothing should cover the tank in that time apart from the small "things happened while you were away" line.
   3. Watch your octopus. If it trusts you, it should come to the glass or look up at you. It won't happen every time.
3. **Tap the octopus.** The label under it should say what it is really doing. Its eyes should widen for a moment (and it should flush with color if it trusts you).
4. **Tap a fish.** You should see a quick flick, and its name, plus an activity if it is doing something.
5. **Feed:** Care → Feed → pick a food. The menu should close and food should fall by itself with no second tap, and the fish should go for it.
6. **Hungry octopus:** if your octopus is hungry, it should come to the front glass now and then and "watch you for a crab".
7. **Shop:** tap any item. A card should open saying what it is for and what it would do for your tank. Nothing should be bought until you press its gold button.
8. **New player:** in a private Safari tab, open the site and play the first 5 minutes as a stranger would. Note anything you had to think about.
9. **Smoothness:** play for 10 minutes. Note any stutter, heat or battery drop.

---

## Unresolved problems

1. **Busy after the quiet window.** A returning player with lots of news gets about five messages in the minute after the first 15 s. Each is non-blocking, and birth and egg cards are now spaced out, but the hint, toasts and tip are not. Suggestion (not done): allow one automatic message per 20–30 s in the first few minutes.
2. **"Today's special" at minute 3.** A new player's first fish purchase asks about a hidden rare color. Suggestion (not done, since it touches the economy): no special until level 2 or the second fish.
3. **"Squid needs you" for a healthy new octopus.** Care's Animal health row flags unmet needs as if the animal were ill. A wording question.
4. **Many first-session messages:** a chapter card right after Coming up, plus first-visit toasts on each screen.
5. **Not verified anywhere yet:** iPhone performance, battery and heat, and the short tap reactions. Two other drills are untested since these changes (attach_check's rendered seahorse-pair distance failed once earlier and may vary between runs; `tools/eat.mjs` printed no results).

## Recommendation

**Yes, Tanklings is ready for its first 3–4 outside testers, after one check on your own iPhone (section 5).** The core loop works end to end:
- open the app
- see a live tank with nothing blocking it
- feed with one tap
- read Care
- buy with a clear card
- come back to news in Today

The three browser-test suites that were failing now pass, and the one real gameplay bug they hid is fixed. What's left is about wording and how many messages appear. That is exactly what outside testers will tell you about better than more automated tests can. Don't add features first.

Hold the test if, on your iPhone, the tank stutters badly, a pop-up blocks the tank in the first 15 seconds, or feeding needs a second tap.
