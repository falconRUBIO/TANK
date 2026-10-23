# Tako Tank: iPhone Playtest

**Build:** branch `claude/our-tank-game-design-xhmavw`, cache version **v315** (Settings shows the build; pull to refresh twice).
**Status: the physical-device test and the first-player test have NOT been run yet.** Sections 3 and 4 are blank forms to fill in. Nothing in them is a result.

---

## 1. Code-verified behavior (what the code does; this is not what a player sees)

### Fish rest at their favorite place (new)
- When a fish's own choice sends it to its earned favorite place, it **settles there** half the time: it slows to its idle swim for 8–14 seconds.
- **What still moves it during a rest:** food, a fright, cleaning, or taking cover.
- **What no longer moves it:**
  - small whims: the bubbler, a curious detour, a schooling lag, swimming to the glass when someone's watching;
  - the "stuck against a decoration" check;
  - its own decision timer.

### Best friends rest side by side (new)
- By day, when a fish's choice turns to its best friend, and both are free, they swim to a spot between them and rest together for 10–16 seconds. The first one there waits up to 4 seconds for the other.
- "Free" means not eating, fleeing, cleaning, taking cover, already resting, or asleep.
- **Friendships come from the existing best-friend data** (`pal`), never from random pairing. At night best friends already settled near each other; that is unchanged.

### Tap labels
"resting at its favorite spot, the reef cave" and "resting with Pip, its best friend".

### No effects
No hearts, particles or popups were added. Movement is ordinary swimming toward a target; nothing teleports.

### A bug found and fixed in this pass
The Phase 1 sensing code stored each animal's temperament under a property named `temper`. That overwrote the octopus's own `temper()` method, so an octopus's update could throw an error on every frame. That error was caught, so the game didn't crash, but **the octopus could stop behaving properly on any phone running v312–v314.** It is renamed now and checked.

---

## 2. Automated results (headless Chromium; about 0.3 fps, so this says nothing about smoothness)

| Test | Result |
|---|---|
| `npm test` | 95/95 |
| `tools/habitat_check.mjs` | **3/3 runs pass, after fixes** |
| `tools/toy_kinds.mjs` | passes |
| `tools/playthrough.mjs` | passes |

What `habitat_check` covers in this pass:
- a fish settles at its favorite place for several seconds, barely moving;
- best friends both rest for 11–15 seconds together, measured;
- the octopus turns to face the glass.

**How the drills were made to pass:**
- **Isolation:** the octopus and turtle were parked away and the octopus fed first. Otherwise a frightened or hungry animal (correctly) breaks the rest, and the check can't measure it.
- **Measured gap:** best friends rest **about one body length apart, center to center: 1.9–3.3 units for a tang about 2.5 long.** The fishes' own personal-space push keeps them from touching. The limit is 1.5 body lengths.

---

## 3. Physical-device observations (fill in on a real iPhone)

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

## 4. First-player observation (15 minutes, fill in during the test)

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

## 5. Problems found (so far, from code and drills only)
1. **Octopus behavior since v312:** see section 1. Fixed in v315. **If testers saw an odd, frozen-looking octopus on v312–v314, that was this bug.**
2. **Rests are easy to interrupt.** A rest only shows when nothing frightening or interesting is nearby. In a busy tank with an octopus and a turtle, fish may rarely get a rest in. That is natural, but it may make rests rare on screen. The device test should check this.
3. **Moving a decoration** still produces only a faint reaction (from the last pass).
4. **Shell rubble** has no reaction that sets it apart from other rocks.

## 6. Recommended fixes (after the device test, not before)
- If the device test shows rests are rarely seen, make settling more likely when the fish is calm (Calm or Lazy traits). That's a one-number change.
- If FPS falls under about 40 in a full tank, check the per-frame cost on the phone using the `?fps` meter's sim-time figure.

## 7. Recommendation
**Fix player-experience problems before Living Ecosystem Phase 2.**
- Phase 2 adds more behavior on top of behavior that hasn't been seen on a phone yet.
- Run sections 3 and 4 first. Then do Phase 2 only if players notice the animals but want more; if they don't notice them, fix readability first.
