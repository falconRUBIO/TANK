# Tako Tank: The Living Ecosystem Update

**Status: Phase 1 (Living Habitat Foundation) is built and tested. Phases 2–4 have not started.** You asked for each phase to be completed and tested before the next, so this document will grow phase by phase. The five final questions are answered for where the game stands now.

## Architecture audit (what existed before this update)
| Area | What is there | File |
|---|---|---|
| Animal AI | `Fish3D.update` branches by how each animal moves: seahorses hover, octopuses jet, turtles have their own tick. `Crab3D` has its own brain. `FishManager.update` runs the social, reef, seahorse, octopus-awareness and crab ticks. | w3/fish3d.js, w3/crab3d.js, w3/fishmgr.js |
| Sensing | All-to-all loops every frame (schooling, personal space, shy fleeing). No spatial grid for animals. | fishmgr.js, fish3d.js |
| Personality | Fish `traits` (Shy, Calm, Curious, Playful, Brave, Lazy, Social, Greedy). Seahorses have `persona`, octopuses `octoMind` types, crabs six temperaments. | rules.js, profile.js, crabs.js |
| Memory | Seahorse holdfast memory (`log.fav`, hitch seconds). Octopus `mem.fam` / `likes`, which already react to moved decorations. Crab `fav` / `area` / `met` / `wary`. Fish `spotId`, but it was assigned once, by decoration category. | rules.js `fishLog`, `octoMem`, `crabMem` |
| Relationships | Best friend `pal`, seahorse pairing, octopus partners, `octoMemo` likes and grudges, crab `met`. | rules.js |
| Decoration | `DECOR_DEF` had only label, category, price and level. **There were no habitat properties.** | rules.js |
| Day/night | Phone clock on each phone; `todOf` on the server. | main.js, life.js |
| Offline | `_advance`: crab life, seahorse families, octopus partners, needs, illness and ageing. | rules.js |
| Multiplayer | The server picks one director phone, which streams snapshots. Every lasting change is a server action (`ACTIONS`). The lead phone reports what animals did (`fishLog`) every 3 minutes. | server/, main.js |
| Journal | A server journal table; per-animal `story` (14 entries); `DISCOVERIES` (one per animal); While You Were Away from `away_from`/`away_to`. | logic.mjs, rules.js |
| Economy | 8 levels; room grows from 7 to 28 animals; species and decorations each have an unlock level. | rules.js `LEVELS` |

**Decision:** extend these systems, don't replace them. Octopuses, seahorses and crabs already have deep place memory, so Phase 1 adds what was missing around them:
- what decorations offer
- earned favorite places for ordinary fish and turtles
- shared sensing
- personality driving those choices

## Phase 1: what was built
1. **What decorations offer** (`web/src/game/habitat.js`). Every decoration has hidden 0–1 values for shelter, climb, hold, rest, forage and interest:
   - each category has defaults, and 21 items have their own values (a cave is full shelter, a sea fan full hold, live rock high forage);
   - each kind of animal weighs them differently (an octopus wants shelter, a seahorse hold, a crab forage and climb, a turtle rest).
2. **Temperament from traits** (`temperOf`). It sets how strongly an animal keeps to a favorite place, how readily it tries a new one, and how quickly it takes cover:
   - Shy: quick to take cover;
   - Calm or Lazy: keeps to its place;
   - Curious or Playful: roams more;
   - seahorses keep to a holdfast they know.
3. **Favorite places that grow from real time spent** (`foldHaunt`, in the server's `fishLog` action).
   - Every 3 minutes the lead phone reports how many seconds each fish or turtle spent at each decoration.
   - The server keeps a decaying score for up to 4 places per animal, weighted by how well each place suits it. Old time fades, so preferences can change; a homebody needs a clearer winner before it switches.
   - A new favorite changes where the animal goes. Its wandering already leaned toward its favorite spot; that pull now scales with temperament, from 12% to 52% of its wander picks.
   - Journal lines (at most one per animal per day):
     - "Nemo has taken to the reef cave. It keeps going back there."
     - "…has moved on to the rock."
     - after its favorite was removed: "…has found a new favorite place."
   - This builds on the existing rules for removed and moved decorations: when its favorite is sold, the animal misses it, and when it's moved, the animal searches where it used to be.
4. **Shared sensing.** A coarse spatial grid (2-unit cells) is rebuilt 4 times a second. Each animal looks around on its own staggered half-second beat instead of every frame.
   - **Taking cover:** a fish that is quick to take cover, with something at least 1.8× its body size within 1.7 units, darts to the nearest decoration offering real shelter. Its label reads "Took cover by the reef cave". If the big animal is an octopus, it turns to watch it go; a seahorse glances.
   - **Familiarity:** the seconds each pair of animals spends near each other are counted on the phone, ready for relationships in Phase 2. They are not saved yet.
   - **New decorations:** for 90 seconds, curious animals come to look at a new decoration ("Came to look at the new treasure chest"), while shy ones mostly hang back.
5. **Habitat notes** (`habitatNotes`). Plain lines built from what is in the tank and what the animals actually chose:
   - "Only one good den spot. An octopus likes a choice."
   - "Seahorses could use more to hold on to…"
   - "The reef cave is becoming a favorite: Nemo, Blue."
   - "…is looking for a new favorite place."

   These are not shown in the app yet; that is Phase 3.

## Tests (run, real results)
- `npm test`: 95/95.
- `tools/habitat_check.mjs`: all checks pass.
  - A favorite grows from real time spent and gets a journal line.
  - Spending time elsewhere moves it on.
  - Sold: the animal misses its place, then settles on a new one, with a journal line.
  - A shy fish takes cover at the cave when a grown turtle comes close.
  - A curious fish visits a new chest.
  - The habitat notes describe the real tank.
- Regression: `toy_kinds` and `playthrough` pass.

## Known limits of Phase 1 (honest)
- **Not everything is reciprocal yet.** A turtle, puffer or other fish doesn't visibly react when a fish hides from it; only an octopus or seahorse does.
- **Familiarity isn't saved yet,** so relationships don't grow from it yet (Phase 2).
- **The habitat notes and journal lines aren't gathered in a Field Journal view** (Phase 3).
- **No levels 9–15, coral growth, offline habitat events or 30-day simulation** (Phases 2–4).
- **iPhone performance isn't measured.** The new sensing does at most about 40 animals × 9 grid cells, twice a second, but that is not the same as measuring it on a phone.
- **Cover depends on true body size.** A young turtle is smaller than a tang, so a young turtle doesn't send a tang into hiding; only a grown one does.

## The five questions, at the end of Phase 1
1. **Routines without scripts?** Partly yes. Favorite places now come from real time spent, for every kind (octopuses, seahorses and crabs already had this). There are no time-of-day routines tied to those places yet: that's Phase 2.
2. **Can rearranging change behavior?** Yes:
   - add a cave and shy fish hide there;
   - add something new and curious fish come to look;
   - move or remove a favorite and the animal searches, then settles somewhere new;
   - spend time elsewhere and the favorite shifts.
3. **Do species recognize each other?** Mostly. Crabs (both ways), octopuses, seahorses and toys already did; shy fish now react to big animals. A full two-way reaction for every pair is Phase 2.
4. **Discoveries after Level 8?** Some: favorite-place changes are new journal events with no level limit. Without Phase 4, the stream of new things after Level 8 is still thin.
5. **A reason to open it tomorrow if you own everything?** A small one so far: seeing where the animals have settled after you rearranged. The **smallest next step** is Phase 3's Field Journal and habitat notes, so those changes are visible in one place without hunting for them.
