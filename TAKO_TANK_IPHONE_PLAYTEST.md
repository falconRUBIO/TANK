# Tako Tank: iPhone Playtest

**Build:** branch `claude/our-tank-game-design-xhmavw`, cache version **v478** (Settings shows the build; pull to refresh twice).
**Status: the physical-device test and the first-player test have NOT been run yet.** Sections 2, 4 and 5 are blank forms to fill in. Nothing in them is a result.

---

## 1. How to get this build on an iPhone

- **Website (works today):** open the game's address in Safari, then Share → Add to Home Screen. Open it from the home screen icon, so it runs full screen like an app. If an older version shows, pull down to refresh twice and check that Settings shows v478.
- **TestFlight app:** the "iPhone app to TestFlight" workflow has **never been run**. It needs the Apple keys added to the repository first (four secrets and one variable; the steps are in `ios-app/README.md`). Once they're in, run it from GitHub → Actions → "iPhone app to TestFlight" → Run workflow. The build shows up in TestFlight about 15–30 minutes later.

## 2. The 10-minute check (what changed recently, on a real phone)

Tick each one, or write what happened instead.

| # | Do this | Expect | Result |
|---|---|---|---|
| 1 | Care → Feed → **Feed everyone** | every hungry sea life gets its own food, in one tap | ___ |
| 2 | Tap a hungry fish → **Feed** on its label | that fish is fed right there, and the label says Full | ___ |
| 3 | Care → **Sea life health** → tap a need (for example "Something to explore") | the Shop opens on that exact item | ___ |
| 4 | Care → To do → the **best next step** row | the Shop opens on that item | ___ |
| 5 | Crew → **Sea life** → **Sell** beside a name | asks first, then sells; the tap lands on the first try | ___ |
| 6 | Crew → Journal | no time-capsule section; postcard buttons work | ___ |
| 7 | Crew → Settings (gear) → **‹ Crew** | goes back; the page scrolls all the way to the Privacy link | ___ |
| 8 | Watch the octopus for 2 minutes | no popping at its den, no shivering against rocks, no walking in place | ___ |
| 9 | Watch a sleeping mandarin (or any sleeping fish) at night (`?tod=night`) | it rests still; no dipping and bowing over and over | ___ |
| 10 | Watch a seahorse with a favorite plant | it keeps going back to the same plant | ___ |
| 11 | A baby fish over a few days | still a baby for about 5 days; grown up at about 3 weeks | ___ |
| 12 | Every button with your thumb, on the smallest phone you have | nothing needs a second try; nothing hides under the notch or the home bar | ___ |

## 3. Automated results for this build (headless Chromium, so nothing here says how smooth it is)

| Test | Result |
|---|---|
| `tools/phone_audit.mjs` (new): every menu screen, Feed, Health, the fish card and the tab bar at 390×844, 375×667 and 320×568 | **passes**: nothing scrolls sideways, no text spills, every button has a tap area of at least 32 px, most 44 |
| `attach_check`, `octopus_pot` (nightly; failing before this build) | pass (`attach_check` on 3 random seeds) |
| `seahorse_check`, `sealife_motion_check`, `octo_motion_check`, `octopus_den`, `routine_check`, `real_tank` | pass |

**What the phone audit found and fixed:** several buttons were smaller than a thumb. Edit look and the Privacy link were 15–16 px tall; the rename pencil was 20 px; Sell, the postcard button, the fish label's Feed button and the fish card's tabs were 27–30 px. Each one now has an invisible margin that brings its tap area to about 44 px, the size Apple recommends. They look exactly the same as before.

---

## 4. Physical-device observations (fill in on a real iPhone)

Phone model: ______  iOS: ______  Date: ______

Open the game with **`?fps`** added to the address. A meter shows frames per second, quality level and sim time. Write down the number you actually see.

| Check | How | Actual result |
|---|---|---|
| FPS, ordinary play | Watch 2 minutes in a normal tank | ___ fps (lowest seen ___) |
| FPS, nearly full tank | A tank at 25+ animals, while feeding | ___ fps (lowest seen ___) |
| Touch and selection | Tap 5 animals, including a small fish and a crab | right animal ___/5 |
| Loading | Cold start (closed fully); warm start; airplane mode | cold ___ s; warm ___ s; offline message shown? ___ |
| Transition | Any blank or black flash between the loading screen and the tank? | ___ |
| Octopus recognition | Open the app 5 times; watch the octopus | turned to face you ___/5; came to the glass ___/5 |
| Fish resting | Watch 3 minutes | saw a fish stop at a place? ___; two fish resting together? ___ |
| Placing a decoration | Buy and place a Reef Cave; watch 2 minutes | who came to it: ___ |
| Feeding | Care → Feed → a food | food fell by itself? ___; animals ate? ___ |
| Toys | Toy box → ball | who played: ___ |
| Two phones | The same tank on two phones | same animals in the same places? ___; decoration appears on both? ___ |

---

## 5. First-player observation (15 minutes, fill in during the test)

**Setup:** a new player on their own iPhone, with a fresh tank. Say only: *"This is an aquarium game. Play for about 15 minutes and think out loud."* Don't explain anything about the animals. If asked, answer: "What do you think?"

**Prompts,** one at a time, only after the last is done:
1. Open the aquarium.
2. Feed the animals.
3. Do something with the octopus.
4. Look around the tank.
5. Put a decoration in.
6. Watch for a bit.
7. Show me something interesting.

| Observe | Notes (their words where possible, with the minute) |
|---|---|
| Understands feeding? | |
| Understands the shop? | |
| Notices individual animals (names, "that one")? | |
| Recognizes a relationship (two animals together)? | |
| Notices an animal reacting to them or to something they did? | |
| Knows what to do next, or waits? | |
| Explores on their own? | |
| Which animal do they remember at the end? | |

**At the end, ask exactly:** *"What would you want to see happen tomorrow?"*
Their answer, word for word: ________________________________

---

## 6. Problems found (so far, from code and drills only)
1. **Octopus behavior since v312:** a temperament value overwrote the octopus's own `temper()` method, so its update threw an error every frame. Fixed in v315. **If testers saw an odd, frozen-looking octopus on v312–v314, that was this bug.**
2. **Rests are easy to interrupt.** A rest only shows when nothing frightening or interesting is nearby. In a busy tank with an octopus and a turtle, fish may rarely get a rest in. That is natural, but it may make rests rare on screen. The device test should check this.
3. **Moving a decoration** still produces only a faint reaction (from the last pass).
4. **Shell rubble** has no reaction that sets it apart from other rocks.

## 7. Recommended fixes (after the device test, not before)
- If the device test shows rests are rarely seen, make settling more likely when the fish is calm (Calm or Lazy traits). That's a one-number change.
- If FPS falls under about 40 in a full tank, check the per-frame cost on the phone using the `?fps` meter's sim-time figure.

## 8. Recommendation
**Fix player-experience problems before Living Ecosystem Phase 2.**
- Phase 2 adds more behavior on top of behavior that hasn't been seen on a phone yet.
- Run sections 2, 4 and 5 first. Then do Phase 2 only if players notice the animals but want more; if they don't notice them, fix readability first.
