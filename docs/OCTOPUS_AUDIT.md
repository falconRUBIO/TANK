# Octopus intelligence & behavior audit

*Read-only audit of the code as of `eb39bb1`. Nothing was changed for it.*

**Where the octopus lives in the code**
- `web/src/w3/fish3d.js`: body, arms and the moment-to-moment brain (`jetUpdate`, `pickAct`, den, hunt, hold and twine).
- `web/src/w3/fishmgr.js`: tank-level wiring: dens, rearranging, thoughts, mood, audience, partners.
- `web/src/game/rules.js`: server-side truth: `octoMind`, trust, hunger, crabs, puzzles, `octoMemo`, `octoMove`, `octoMoment`.
- `server/`: saves the tank world, and only that.

---

## 1. Decision-making

**States** (`S.s`): `rest`, `crawl`, `jet`, `drift`, `ponder`, `work`, `glass`, `dash`, plus the act states `flat`, `bury`, `kelp`, `lion`, `jelly`, `snake`, `watch`, `tour`, `follow`, `squirt`.

**Errands** (`S.mode`): `inspect`, `hunt`, `jar`, `greet`, `den`, `denfront`, `tsettle`, `tgo`, `thaul`, `carry1`, `carry2`.

**How it decides.** Each frame it runs the current state until its timer `S.t` runs out. Then, while resting, it walks a fixed priority chain, and the first rule that fires wins:

1. **Errands, which interrupt everything:** a crab to hunt, a puzzle jar, a finger on the glass (`glassAt`), a task (moving a decoration).
2. **Den:**
   - Tired (>0.65) or frightened goes home with a long stay.
   - Already home and still tired, or it's night, or it's frightened: it stays on.
   - Night: it goes home.
3. **Rear bank:** on the high back bank it lingers to look out.
4. **Hunger:**
   - Starving: it lies listless.
   - Hungry: it begs at the glass, with a cooldown.
5. **Random return home:** a 12–27% chance of going home if it has a shell.
6. **`pickAct`:** one weighted random roll over the acts, scaled by:
   - temperament, the signature act, and audience;
   - the context added last round (no repeats, calm near a plant, a mimic when scared or watched, prowling when hungry, staying put when tired).
7. **Back to its favorite spot**, when it has no den.
8. **Roaming:** wandering to a spot on the sand banks.
9. **Inspecting a decoration**, with 55% bias to the one it likes most.
10. **Going to look at a fish.**

**Interruptions:**
- A poke, or four in a row, makes it annoyed, then squirt or startle.
- A startle makes it jet away and records a fear spot.
- A fish hanging around too close gets silt, a shell or an arm smack thrown at it.

**Cooldowns:**
- Glass visits: 5–10 min. Begging: 90–150 s. Squirting: 120–240 s.
- Gazing at you, journal moments (per kind, 12 h – 3 days), and partner arm-twining (4–10 min) also have cooldowns.

**Movement:**
- **Crawl** on the terrain, with `crawlGoal` choosing a reachable free spot and a clear way.
- **Jet** (pulsed swimming), including over obstacles (`hop`).
- **Getting unstuck:** it counts turnarounds.
- **Arms:** each arm is posed against the world so it never goes into rock, plants or the shell.

**Rest and activity:**
- **Tiredness (new):** rises with activity and is slept off at home.
- **Night:** it goes home and its sleep state deepens (`sleepK`).

**Verdict:** a *priority list with a weighted dice roll at the bottom*. The top of the list is meaningful: hunger, crabs, night, fear, tiredness. Below that, most of what you see in a quiet minute is still the dice roll. It's shaped by personality and context, but nothing it *noticed* or *remembered* causes it.

## 2. Memory

| Memory | Where it lives | Lasts | Affects behavior? |
|---|---|---|---|
| Home shell (`f.home`) | **Server** (`octoMove` with `home:true`) | Forever | Yes: den target, den checks |
| Friend / rival fish (`buddy`/`rival`) | **Server** (`octoMemo`) | Forever | Yes: who it follows; who it smacks or throws at |
| Bond per caretaker (`bond[uid]`), trust level | **Server** (feeding, crabs, visits) | Forever | Yes: shy with strangers, glass greeting, takes the crab from your fingers |
| Hoard of shells (`hoard`) | **Server** (crabs) | Forever | Yes: carry and tidy errands |
| Decorations it moved | **Server** (`octoMove`) | Forever | World changes; no memory of having done it |
| Puzzle record, crabs caught, tricks, toys | **Server** | Forever | Puzzle speed improves; tricks learned |
| Journal moments, discoveries (`disc`), habit log | **Server** | Forever | Story and text only (**cosmetic**) |
| Favorite spot (`fav`), liked decorations (`likes`), fish memories (`fishMemo`) | **localStorage on the lead phone only** | That phone only | Yes, but lost on any other phone, a reinstall or a director change |
| Fear spots (`fears`, up to 4, 5 min) | RAM | Minutes | Yes: avoids the spot |
| Tiredness, fear, recent acts, bored, sulk | RAM | Session | Yes |
| Objects it inspected | Not kept | n/a | No |
| Food locations | Not kept (crabs are hunted live) | n/a | No |

**Biggest gap:** the memories that make it feel individual (favorite spot, favorite things, how it feels about each fish) are not on the server. A second phone that becomes director starts from nothing.

## 3. Personality

**Where personality comes from:**
- **`octoMind`:** one of 6 types, fixed from the seed: explorer, homebody, showoff, watcher, collector, trickster. It sets `cur`, `bold`, `soc` and `tidy`, each nudged ±0.15 by the seed.
- **`TEMPER`:** a weight on each act per type, plus a tempo (how brisk it is) and a signature act ×2.2.

**What each part actually changes:**

| Part | What it changes |
|---|---|
| **cur** | Act weights (`flat`, watch bonus); how often it inspects or roams; the bored threshold |
| **bold** | Lion and tour weights; spontaneous glass visits; hesitation at things |
| **soc** | Follow weight; visiting fish; partner bonding, where low soc means it keeps its distance |
| **tidy** | Carrying shells home; gathering a rock shelter when it has no shell |
| **type** | All act weights, the signature act, tempo; showoffs go to the glass and to lion/jelly when watched; tricksters squirt |

**Observably different in a 3–5 minute visit?**
- *Somewhat.* A trickster squirts and a homebody stays in.
- In a quiet tank most of what you see is roaming, inspecting and resting, and those differ only in frequency. Two octopuses side by side are often hard to tell apart without watching for several minutes.
- Personality changes **how often**, almost never **what for**.

## 4. Environmental awareness

| Can it detect… | How | Does it change the next action? |
|---|---|---|
| Nearby objects | `getSpots()` within a radius | Yes: grab, inspect and kelp choices |
| New decorations | **No dedicated octopus reaction** (the seahorse has one) | Only by chance, through random inspection |
| Moved decorations | Only by its den moving (it re-homes) | Den only |
| Removed decorations | The den disappears, so it picks or builds another; "misses" text for loved decorations | Den only, plus a mood dip |
| Other animals | Fish within 4.5 m; partner octopus | Yes: watch, follow, smack, twine |
| Food | Crabs (hunt); hunger | Yes, strongly |
| Your presence | `audience` (people online, bonded or not) | Yes: showing off, squirting, gazing |
| Tank changes (water, glass) | No | No |
| Familiar locations | Favorite spot, rear bank | Weakly (it returns to its favorite spot) |

## 5. Object interactions

| Interaction | Physically changes the world? |
|---|---|
| Inspect: walks over and wraps arms around a decoration | No (animation) |
| Grab / hold | No (animation) |
| Push a small decoration to a new place (`octoMove`) | **Yes, saved on the server** |
| Carry a shell home (`carry1`/`carry2`) | Updates the hoard count; shown in the den |
| Gather rocks into a shelter | **Yes**, decorations are moved |
| Take a coconut as home, turn it over and hide under it | **Yes** (home saved), plus animation |
| Hunt and eat a crab, leg by leg | Updates server state (hunger, crabs) |
| Puzzle jar | Server state (solved, best time) |
| Throw silt or a shell, or smack a fish | Moves the fish (local); cosmetic otherwise |
| Revisit a liked object | Yes, but the likes are local to one phone |
| Hide objects / collect into a hoard | Only shells from crabs; it doesn't choose what to collect |

## 6. Learning

**What exists:**
- **Bond and trust** grow with feeding and visits: it gets bolder with you and takes crabs from your fingers.
- **Puzzle jars:** it gets faster with practice.
- **Tricks:** five sessions and a trick is learned.
- **Toys:** five plays and it has learned the toy.
- **Likes:** the more it handles a decoration, the more often it goes back to it.
- **Fear spots:** it avoids a place where it was startled, for 5 min.

**Missing:**
- **Familiarity with an object:** it doesn't get used to a thing, so a new thing isn't treated differently from an old one.
- **Recognizing a moved object** as the same object.
- **A den it returns to because it found it:** a den is assigned by rule (nearest shell or pot, or one built from rocks), not discovered.
- **Lasting effects of experiences:** a fright doesn't make it more cautious for days; a good crab spot isn't remembered.

## 7. Temporary states

| State | Exists as | Triggered by | Resolved by | Changes behavior? |
|---|---|---|---|---|
| Resting | `rest`, `sleepK` | The end of an act; night | Its timer | Yes |
| Tired | `tired` 0–1 | Activity | Resting at home | Yes (new) |
| Frightened / cautious | `scared` (40 s), fear spots (5 min) | Startle, poke | Time | Yes (new) |
| Annoyed | `annoyT` | Pokes, crowding | Time | Yes: smacks, squirts, dark skin |
| Bored | `bored` | A quiet, unchanging tank | Something new | Yes, mildly: more curious |
| Sulking | `sulk` | Neglect | Care | Yes, mildly: less social |
| Curious / engaged / alert | **Not explicit**: only inside act weights | n/a | n/a | n/a |

## 8. Social and caretaker response

| When… | What it does |
|---|---|
| **A caretaker feeds it** | Its own caretaker drops a crab and it hunts and eats it leg by leg. Bond rises. At trust level 3 it comes up and takes the crab from your fingers. |
| **Someone taps near it** | Pokes accumulate: annoyed, then a squirt, or a startle and jet away, leaving a fear spot. |
| **A finger is held on the glass** | It comes over and presses its arms on the glass. |
| **A new decoration appears** | **No specific reaction**, unless a wish was fulfilled (wish text) or the decoration becomes its home. |
| **Another animal approaches** | It watches, follows, or smacks and throws at rivals. Its partner gets arm-twining. |
| **The tank has been quiet** | Boredom builds, so it roams and inspects more. |

**Does it tell caretakers apart?**
- **Yes, for bond and trust:** each caretaker's own count, and it's shy with someone it doesn't know.
- **No, for remembered events:** it doesn't remember who scared it or who played with it. Only aggregate bond counts are kept.

## 9. Persistence and multiplayer

**Who decides:** one phone, the **director**, runs the octopus's brain. The other phones receive position and pose snapshots (`snap`) and show those. Saved actions (moves, memos, moments, logs) are sent only from the director.

**Saved on the server:**
- home, buddy and rival, bond and trust, hoard, crabs, puzzles, tricks, toys;
- decorations it moved, journal moments, discoveries, habit totals.

**Not saved:**
- position, current act, tiredness and fear, favorite spot, likes, fish memories, fear spots.

**Contradictions between phones:**
- Within a session they are low-risk: only the director decides.
- Across sessions, likes and the favorite spot differ by phone, so when the director changes, preferences "reset".
- After a reconnect, a phone may show a different act until the next snapshot (short).

**Nobody online:** the server only runs time-based rules (hunger, health, aging, pairing). The octopus does not act, explore, move decorations or discover anything while nobody watches. A "Welcome back" can only report rule events, not things it did.

## 10. Performance

From `tools/bench_octo.mjs` (headless Chromium, 3 octopuses):
- **Size:** about 3,070 voxels each, all of them moving parts.
- **Arm posing:** about 650 calls per frame, **0.93 ms per frame** for all three.
- **Whole simulation step:** **3.0 ms per frame** for all three (brain, movement, posing, the rest of the tank).

**What's already done to keep it fast:**
- Arm posing is cached per frame.
- Bodies are redrawn 30 times a second, and every frame only for the animal you're looking at.
- Camouflage is recomputed only when it changes.

**Limits:**
- The voxel count per octopus and the arm checks against the world (12 samples per arm per frame) are the main costs.
- New brain logic is cheap by comparison, as long as it runs a few times a second rather than every frame, and doesn't scan every decoration every frame.

## 11. Recommended next steps (three phases)

**Phase A: memory and awareness that matter**
1. **Move its personal memories to the server**, small and capped: favorite spot, top 3 liked decorations, and familiarity per decoration (0–1). The director sends them now and then, like `octoMemo`. Then every phone and every director change shows the same individual.
2. **Notice new, moved and removed decorations.** On a decoration change, the octopus within view gets a *novelty* target. It approaches cautiously, with care set by `bold`: a homebody watches from its den first, an explorer goes straight over and touches it. Familiarity rises each time it handles the thing, and novelty fades with it.
3. **One journal line when it really happens**, through the existing moment system ("Inky crept out to check the new rock").

**Phase B: personality-driven decisions** (replace the dice roll with *reasons*). Pick the act with the strongest drive:
- **curiosity:** novelty plus `cur`;
- **comfort:** tiredness, fear, and `tidy` and homebody;
- **hunger;**
- **social:** fish nearby plus `soc`;
- **display:** audience plus showoff.

Each drive leads to one or two acts. Randomness stays only *within* a drive, for variety. Two octopuses then differ in *why* they do things, which you can see in five minutes.

**Phase C: learning and meaningful object interactions**
- **Familiarity changes behavior:** familiar objects become part of a route it patrols, and are what it carries to its den or hides behind.
- **Lasting fear:** a scare near a decoration lowers its familiarity, so it avoids that thing for a day, and the server remembers.
- **Caretaker memory:** "who fed me" is already bond. Add "who startled me" as a small negative, so it hides from one person and greets another.

**Throughout:**
- No new currencies, chores, menus or statistics.
- Show it all through the existing card thought line, the journal moments and the Welcome Back card.
- Only report what actually happened.

## 12. Final summary

- **Existing capabilities:**
  - A rich body and animation: arms, camouflage, mimics, den and shell, crab eating, puzzles.
  - A priority list that handles needs well: hunger, food, night, fear, tiredness.
  - Server-backed bond, trust, home, friends and rivals.
- **Missing capabilities:**
  - Noticing novelty.
  - Object familiarity.
  - Lasting effects of experiences.
  - Reasons behind idle choices.
  - Per-caretaker memory of events.
- **Cosmetic vs functional:**
  - **Functional:** hunting, homes, moving decorations, avoiding fear spots, bond.
  - **Mostly cosmetic:** inspect/grab, mimics, journal moments, habit text.
- **Architecture:** a director phone runs the brain; the server keeps the world and a few octopus facts; other phones mirror snapshots.
- **Persistence gaps:** likes, the favorite spot and fish memories are in one phone's localStorage. Nothing it does is simulated while offline.
- **Multiplayer risks:**
  - Preferences reset when the director changes.
  - Brief mismatched acts after a reconnect.
  - Low otherwise.
- **Performance risks:** voxel and arm posing cost. Brain additions are safe if throttled to a few times a second.
- **Roadmap:** A (server-side memory and novelty) → B (drive-based decisions) → C (familiarity, lasting fear, per-caretaker memory).
- **The smallest useful first step:** move `likes` and `fav` to the server, and add one reaction: **a new decoration is noticed, approached according to boldness, touched, and becomes familiar**, with one true journal line. It's about a day's work, touches only the octopus and one new small saved field, and you'd see it the first time you place a decoration.
