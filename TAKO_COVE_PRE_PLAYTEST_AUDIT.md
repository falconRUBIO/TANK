# Tako Cove: Pre-Playtest Audit (Animal Response, Recognition and Readability)

**Date:** 2026-10-23. **No real-device test and no real-player test has happened yet.** Everything below comes from reading the code and from headless-browser drills. A headless browser draws about 0.3 frames per second, so it can show *that* an animal does something, but not whether a person would notice it at phone size. Every "readable?" verdict is my judgment from the code and the measurements, and is marked as such.

## 1. The five situations

| # | Situation | What the game does (code) | Visible without opening a profile? (judgment) |
|---|---|---|---|
| 1 | **The octopus recognizes a caretaker** | On opening (and on returning to the app), each octopus answers by trust and personality (`FishManager.greet`). A stranger carries on; one that knows you watches from its den or looks up at you; about 1 open in 100 it comes all the way to the glass. A tap widens its eyes, and if it trusts you it flushes with color. | **Before:** weak. "Looking at you" moved only its pupils, a few pixels at phone size. **Now:** better. While resting it turns its **whole body** to face the glass for the length of the look, and its label says "looking at you". Still subtle by design; it needs checking on a real phone. |
| 2 | **An animal prefers a place** | Seahorses go back to favorite holdfasts; an octopus to its den and liked places; crabs to a favorite spot. Fish and turtles now **earn** a favorite from time actually spent there (Phase 1) and go back to it in 12–52% of their wander picks, depending on temperament. A tap near it says "at its favorite spot, the reef cave". | **Seahorse and octopus: yes,** because they sit at the same place for minutes. **Fish: only over several minutes of watching.** A fish visits often but doesn't settle visibly. |
| 3 | **A reaction to a new or moved decoration** | The octopus creeps over to new things ("Creeping over to the new reef cave"); a seahorse keeps "one eye on the new thing" and takes to a new holdfast; crabs pick over new rock. Curious fish swim up to look; **shy fish now watch from about 2 m away instead of ignoring it.** A moved favorite: the animal searches where it used to be, twice, then settles. | **Placing: yes for the octopus, seahorse and crabs** (measured below). **Fish: plausible, not proven on screen.** **Moving: weak.** The measured difference was mostly noise; nobody would notice it without being told. |
| 4 | **A relationship** | Best friends swim together (45% of wander picks) and rest side by side at night; seahorse pairs dance each morning and settle near each other; crabs rest together by day and follow one another; a tap says "swimming with Pip, its best friend". | **Seahorse pairs: yes** (the dance and linked tails). **Fish best friends: maybe.** Two fish swimming together reads as schooling unless you tap one. |
| 5 | **Two personalities, one event** | The **ball:** a timid crab tucks into its shell; a bold one walks up and pokes it. A **big animal coming close:** a shy fish darts for real cover ("taking cover by the reef cave"); a brave one carries on. A **new decoration:** a curious fish swims up; a shy one keeps its distance. The octopus's six personalities answer the greeting differently. | **Crabs and the ball: yes,** a clear contrast (measured). **Fish:** the cover dash is quick and readable if you happen to be watching. **The octopus greeting:** only one octopus per player, so nobody can compare. |

**Overall (judgment):** the octopus, seahorses and crabs are readable. Ordinary fish are the weak point: their intelligence is real but looks like ordinary swimming. That is the main thing to watch in the playtest.

## 2. Changes made in this pass (small, using existing state, nothing theatrical)
- **The octopus turns its body to face you** when it looks at you while resting. It never does this while hunting, at a puzzle, doing a task or lying listless. The label shows "looking at you". The rare full glass approach is unchanged (about 1 in 100).
- **Shy fish watch a new decoration from about 2 m away** ("watching the new anchor from a distance"), and curious ones swim right up. That gives a visible contrast between personalities.
- **Labels now show the new behaviors:** "taking cover by the reef cave", "looking at the new treasure chest", "watching the new … from a distance".
- Nothing new interrupts feeding, sleep, pregnancy, puzzles, tricks or hunting.

## 3. Cause and effect, measured (`tools/cause_effect.mjs`)
For each item, the drill watched the same spot for 40 simulated seconds before and after placing it (and again after moving it). It recorded who came within reach and what they said. **Single runs; noisy.**

| Item | Placed: who came and what they did | Verdict |
|---|---|---|
| Reef Cave | The octopus ("Creeping over to the new reef cave", 17 s there) | **Clear** |
| Sea Fan | The seahorse ("Holding on to the seafan with its tail", the whole 40 s) | **Clear** |
| Live Rock | Crab Pebble ("picking over the live rock", the whole 40 s) | **Clear** |
| Shell Rubble | No crab came in this run; one fish passed by for 4 s | **Not shown.** Crabs graze any rock, so rubble doesn't stand out. |
| Toy (`toy_kinds`) | A timid crab tucks in; a bold one pokes the ball; a turtle shoves it | **Clear** |
| **Moving** any of them | Small, noisy differences | **Weak.** The search-where-it-used-to-be rule exists, but this short sample didn't show it. |

**Persistence:** a favorite earned from time spent is saved on the server and survives a reload (checked). Preferences fade and can change (habitat_check).

## 4. Automated results (this pass)
- **`npm test`:** 95/95.
- **`habitat_check`:** all checks pass, including the two new ones (the octopus turns to the glass; a shy fish keeps its distance).
- **`cause_effect`:** all pass, but see section 3 for what that really shows.
- **`glass_check`:** updated to the 1-in-100 glass visit, and passes.
- **`toy_kinds`:** passes 3/3 after giving the turtle check more time. It had failed once in three runs; the turtle ended 1.8 units from the ball, so it was the ball's random path, not a broken rule.

## 5. Real-device test build (to do on your iPhone; not done by me)
The current build is deployed from this branch; the cache version is v314. **Pull to refresh twice.** Add `?fps` to the address for an on-screen frame-rate meter.

| Check | How | Pass if |
|---|---|---|
| Frame rate | Open with `?fps`; watch for 2 minutes, then while feeding | Mostly 50–60 fps; never under 30 for long |
| Touch | Tap 5 different animals, including a small fish and a crab | The right animal's name shows each time |
| Animation size | Watch the octopus at its den when you open the app | You can tell when it turns toward you |
| Loading | Cold open (fully closed), warm open, airplane mode | The cove shows, no blank flash, a clear retry when offline |
| Recognition | Open the app 5 times over a day | It looks at you or watches from its den; it rarely comes to the glass |
| Shop placement | Buy and place a Reef Cave, then move it | It lands where you put it; the octopus goes to look within a minute or two |
| Multiplayer | Two phones in the same tank | The same animals in the same places; a decoration placed on one appears on the other |

## 6. First-player test (15 minutes, observation only)
**Setup:** their own iPhone, a fresh tank. Say only: *"This is an aquarium game. Play for about 15 minutes and think out loud."* Don't explain any animal systems.

**Ask them, one at a time, only when they seem done with the last:**
1. Open the aquarium.
2. Feed the animals.
3. Do something with the octopus.
4. Look around the tank.
5. Put a decoration in.
6. Watch the animals for a bit.
7. Tell me something interesting you saw.

**Write down (don't prompt):**
- What they notice on their own, with the minute it happened.
- What they misunderstand.
- Which animal they mention first, and by name or by kind.
- Whether they say anything that sounds like personality ("that one's shy", "it likes that rock").
- Whether they link a change they made to an animal's behavior.
- Whether they say they'd come back.

**At the end, ask only:** *"What would you want to see happen tomorrow?"*

**A serious finding is any of these:**
- they never notice the octopus reacting to them;
- they can't name or describe any animal;
- they place a decoration and see no response at all;
- any stutter or freeze.

## 7. Remaining limitations
- **Not seen on a real phone:** none of the readability verdicts has been checked by a person at real frame rate.
- **Fish are the weak point:** their preferences and friendships are real but look like ordinary swimming.
- **Moving a decoration** produces a reaction too faint to notice.
- **Shell rubble** has no reaction that makes it stand out from other rocks.
- **The octopus's "new thing" line** can linger in its label after it has finished looking.

## 8. Recommended next priority
**Run the real-device check (section 5) and one first-player test (section 6) before building anything else.**

If testers don't notice the fish:
- the smallest fix is to let a fish visibly *settle* at its favorite place for a few seconds (hovering, fins slowing) instead of just passing through;
- then give best friends a short side-by-side rest during the day, not only at night.

Both use state that already exists.
