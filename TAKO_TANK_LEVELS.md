# Tako Tank: what each level opens

Read straight from the code (`web/src/game/rules.js`: `LEVELS`, `LEVEL_PRIZE`, `SPECIES_DEF`, `DECOR_DEF`, `TOYS`, `TRICK_LEVEL`, `GOALS`, the adventure gate, `WISHES`; `web/src/game/crabs.js` for shells). Corrected after the progression revision: the first version read a base decoration table that a curve table overrode. Prices are in shells. "Room" is how many animals the tank holds at that level (a school of four counts four).

**How a level is reached.** Care points: +0.3 per hour of a healthy tank, times the health multiplier (Thriving 1.5, Happy 1, Struggling 0.5, Unwell 0.25, and Unwell earns nothing from time), plus care actions (feed 2, crab 2, wipe glass 4, change water 6, pet/play/trick/puzzle 2–4, capped at 8 a day from play). The level-up pays 3 + level shells. Rough time from the start at a steady Happy tank (about 21 points a day) / Thriving (about 32 a day):

| Level | Points | Room | Days (Happy) | Days (Thriving) | Level-up bonus |
|---|---|---|---|---|---|
| 1 | 0 | 7 | — | — | — |
| 2 | 18 | 10 | ~1 | ~0.6 | +5 |
| 3 | 50 | 13 | ~2.5 | ~1.6 | +6 |
| 4 | 115 | 16 | ~5.5 | ~3.6 | +7 |
| 5 | 215 | 19 | ~10 | ~7 | +8 |
| 6 | 350 | 22 | ~16.5 | ~11 | +9 |
| 7 | 520 | 25 | ~24.5 | ~16.5 | +10 |
| 8 (top) | 740 | 28 | ~35 | ~23 | +11 |

**Shells to spend them on:** start with 20; the daily mystery pays 6 (more for a find); a rare visitor +4 every 2–4 days; today's request +3/+5/+8; a goal finished +20 and a floor or backdrop; a theme completed +3; wishes +4 to +25. Care itself pays nothing.

---

## Level 1 — Day one
**Animals:** your octopus (free, chosen at the start: coral, violet, ocean, amber, kelp or ink). Clownfish 10. Blue Chromis 20 (a school of four).
**Decorations:** Sea Grass 8, Purple Sea Fan 10, Coralline Ball 8, Reef Rock 8, Starfish 10 (it creeps about), Coconut Shell 12 (an octopus den), Sea Anemone 14 (a clownfish's home).
**Toys:** Ball.
**Always on from here:** the daily mystery (one glowing thing on the sand a day, +6 shells), today's request, rare visitors every 2–4 days, breeding (any two grown fish of one kind can be paired from their cards; eggs, a hatching, babies you raise), themes (Kelp Forest: 4 of kelp/grass/seaweed/sea whip; Coral Garden: 4 of anemone/gorgonian/sea fan/coralline/brain/table/spire; Sunken Ruins: 3 of pot/coconut/pillar/arch/torii/bridge/skull/anchor/chest; Lantern Cove: 2 of lantern/crystal/lighthouse/bubbler; each pays +3 and brings its own visitor), floors and backdrops (Pearl 20, Gravel 20, Black sand 30, Pink coral 40; Lagoon/Sunset/Mint 25, or won from goals).
**Day 3–4:** the first decision ("your call") arrives, then one every 4–7 days.

## Level 2 — "New sea life" (~day 1)
**Animals:** Yellow Goby 22, Damselfish 26 (pair), Cardinalfish 36 (pair), Royal Gramma 42, Neon Goby 30 (a cleaner: runs a station on a rock, every fish it cleans counts it a friend).
**Decorations:** Broadleaf Seaweed 14, Red Gorgonian 16, Reef Boulder 20, Giant Clam 22, Cleaning Station 22 (the neon goby's).
**UI:** the Crew tab and the Shop's NEW tab open.

## Level 3 — "Tricks and bubbles" (~day 2–3)
**Animals:** Blue-leg Hermit Crab 24 (comes in a free Ivory Spiral shell; shells to grow into: Rose Stripe 6, Moon 10, Pearl Spiral 16, Tiger 18, Coral 22; the Ancient Spiral is found, not bought).
**Decorations:** Clay Pot 26 (an octopus den), Brain Coral 28, Giant Kelp 30, Sea Urchin 24, Reef Cave 32, Bubbler 48. (The Torii Gate is earned, for the first rare color bred here.)
**Toys:** Bubbles.
**Play:** octopus tricks open (once it trusts you: bond 3).
**Adventures:** from level 3 *and* a week-old tank, the octopus may start pushing at the lid: the escape decisions, keepsakes and clues begin.
**Wish:** "Reach tank level 3" pays +5.

## Level 4 — "Seahorses and the blue tang" (~day 5)
**Animals:** Seahorse 70 (four kinds: Yellow, Lined, Slender, Dwarf; they pair only with their own kind after two days together, the father carries the young 6–9 days, babies in the nursery 5 days), Emperor Angelfish 60, Blue Tang 64 (grazes the glass: wiping needed ~40 % less), Scarlet Reef Hermit Crab 36.
**Decorations:** Sea Fan 36 (the seahorse holdfast), Mangrove Roots 34, Driftwood 38, Mossy Skull 40, Old Pillar 42.

## Level 5 — "New habitats and toys" (~day 10)
**Animals:** Mandarin Dragonet 80 (grazes Live Rock).
**Decorations:** Live Rock 50, Orange Sea Whip 55, Stone Lantern 60 (glows at dusk), Table Coral 64, Maxima Clam 150 (water stays fresh ~50 % longer).
**Toys:** Twist cube (the octopus's), Hitching hoop (the seahorses').

## Level 6 — "Puffer, anthias and a second octopus" (~day 16)
**Animals:** Octopus 120 (a second one: Common, Day, Two-Spot or Mimic; a female and a male with a den each become partners after 3 days, eggs after ~5, hatch after ~5 more), Valentini Puffer 58 (puffs up, comes to the glass; nips seahorses), Pink Anthias 50 (a school of four), Halloween Hermit Crab 52.
**Decorations:** Treasure Chest 85, Old Anchor 95, Stone Arch 120.
**Wish:** "Reach tank level 6" pays +10.

## Level 7 — "A turtle sanctuary corner" (~day 24)
**Animals:** none new (this is the preparation level).
**Goal:** "A turtle sanctuary" is always on offer from here until a turtle has lived in the tank: reach level 7, a ledge to sleep under (a Turtle Ledge or two rocks), sea grass to graze (a Sea Grass Bed or two plants), three days of care. It pays like any goal (20 shells and the next floor or backdrop), once per tank. A wild sea turtle may pass far behind the kelp now and then.
**Decorations:** Turtle Ledge 40, Sea Grass Bed 30, Shell Rubble 26 (a loggerhead's foraging), Sponge Garden 34 (a hawksbill's), Little Bridge 150, Glow Crystal 190. (The Lighthouse is earned: three goals finished.)
**Toys:** Light spot.

## Level 8 — "Sea turtles" (~day 35, the top)
**Animals:** Sea Turtle (green) 180, Loggerhead 260, Kemp's Ridley 240: rescued hatchlings to raise (two weeks, grown) and release to the sea for 100+ shells; released turtles come back to visit. The Hawksbill 220 opens once a turtle raised here has been released. The Leatherback only ever passes by.
**Decorations:** Coral Spire 300 (the biggest piece).
**Wish:** "Reach the top tank level" pays +15. Beyond this, care points keep banking for whenever a level 9 exists.

---

## Things worth a look while you audit
1. **The hawksbill now opens only after a turtle raised here has been released** (`needRel: 1`; the check existed but no species set it). Releases are counted in the shared tank's stats.
2. **Level 7 has no new animal by design:** it is the sanctuary level, with its own goal (a ledge to sleep under, sea grass to graze, three days of clean water) and the turtle decorations.
3. **Two price lists (fixed).** The base tables were overridden by two curve tables (`SPECIES_CURVE`, `SHOP_CURVE`); the first version of this document read the base decoration table and had the wrong levels and prices for most decorations. Both curves are now folded into one table each, and a test holds the snapshot.
4. **Big saves against small income.** The Maxima Clam (150, level 5), Lighthouse (150, level 7) and Coral Spire (250, level 8) cost two to four weeks of a typical day's shells (mystery 6 + occasional visitor/request/goal). Turtles are 180–260 on top of that.
5. **Level 2 arrives within the first day** (18 points); a new player sees a level-up almost immediately, then waits ~1.5 days for level 3. If that first one is meant to be a moment, it may be too soon to feel earned.
6. **Toys outrun their users in one place:** the Twist cube opens at level 5, a bought (second) octopus at level 6; fine because the first octopus is free, but a tank whose octopus has left or died has a cube and nobody to use it until 6.
7. **Themes came too early** (two at level 1, the Ruins at 4, the Lantern Cove at 5). Each now needs a key piece: giant kelp (level 3), a sea fan or table coral (4), a chest, anchor, arch, bridge or torii (6), a glow crystal or the lighthouse (7).
8. **Nothing opens by tank age except adventures** (level 3 and 7 days). Everything else is level or shells.
