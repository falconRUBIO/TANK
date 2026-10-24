# Tako Tank: what each level opens

Read straight from the code (`web/src/game/rules.js`: `LEVELS`, `LEVEL_PRIZE`, `SPECIES_CURVE`, `DECOR_DEF`, `TOYS`, `TRICK_LEVEL`, the adventure gate, `WISHES`; `web/src/game/crabs.js` for shells). Prices are in shells. "Room" is how many animals the tank holds at that level (a school of four counts four).

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
**Decorations:** Sea Grass 6, Purple Sea Fan 7, Broadleaf Seaweed 7, Red Gorgonian 10, Coralline Ball 6, Reef Rock 6, Reef Boulder 12, Starfish 4 (it creeps about).
**Toys:** Ball.
**Always on from here:** the daily mystery (one glowing thing on the sand a day, +6 shells), today's request, rare visitors every 2–4 days, breeding (any two grown fish of one kind can be paired from their cards; eggs, a hatching, babies you raise), themes (Kelp Forest: 4 of kelp/grass/seaweed/sea whip; Coral Garden: 4 of anemone/gorgonian/sea fan/coralline/brain/table/spire; Sunken Ruins: 3 of pot/coconut/pillar/arch/torii/bridge/skull/anchor/chest; Lantern Cove: 2 of lantern/crystal/lighthouse/bubbler; each pays +3 and brings its own visitor), floors and backdrops (Pearl 20, Gravel 20, Black sand 30, Pink coral 40; Lagoon/Sunset/Mint 25, or won from goals).
**Day 3–4:** the first decision ("your call") arrives, then one every 4–7 days.

## Level 2 — "New sea life" (~day 1)
**Animals:** Yellow Goby 22, Damselfish 26 (pair), Cardinalfish 36 (pair), Royal Gramma 42, Neon Goby 30 (a cleaner: runs a station on a rock, every fish it cleans counts it a friend).
**Decorations:** Driftwood 18, Old Pillar 15, Stone Lantern 20 (glows at dusk), Treasure Chest 24, Bubbler 16, Giant Clam 14, Mossy Skull 10, Sea Anemone 16, Brain Coral 14, Coconut Shell 8 (an octopus den), Clay Pot 14 (an octopus den).
**UI:** the Crew tab and the Shop's NEW tab open.

## Level 3 — "Tricks and bubbles" (~day 2–3)
**Animals:** Blue-leg Hermit Crab 24 (comes in a free Ivory Spiral shell; shells to grow into: Rose Stripe 6, Moon 10, Pearl Spiral 16, Tiger 18, Coral 22; the Ancient Spiral is found, not bought).
**Decorations:** Torii Gate 34, Giant Kelp 14, Table Coral 20, Sea Urchin 24.
**Toys:** Bubbles.
**Play:** octopus tricks open (once it trusts you: bond 3).
**Adventures:** from level 3 *and* a week-old tank, the octopus may start pushing at the lid: the escape decisions, keepsakes and clues begin.
**Wish:** "Reach tank level 3" pays +5.

## Level 4 — "Seahorses and the blue tang" (~day 5)
**Animals:** Seahorse 70 (four kinds: Yellow, Lined, Slender, Dwarf; they pair only with their own kind after two days together, the father carries the young 6–9 days, babies in the nursery 5 days), Emperor Angelfish 60, Blue Tang 64 (grazes the glass: wiping needed ~40 % less), Scarlet Reef Hermit Crab 36.
**Decorations:** Sea Fan 36 (the seahorse holdfast), Stone Arch 30.

## Level 5 — "New habitats and toys" (~day 10)
**Animals:** Mandarin Dragonet 80 (grazes Live Rock).
**Decorations:** Live Rock 50, Maxima Clam 150 (water stays fresh ~50 % longer), Old Anchor 24, Orange Sea Whip 18.
**Toys:** Twist cube (the octopus's), Hitching hoop (the seahorses').

## Level 6 — "Puffer, anthias and a second octopus" (~day 16)
**Animals:** Octopus 120 (a second one: Common, Day, Two-Spot or Mimic; a female and a male with a den each become partners after 3 days, eggs after ~5, hatch after ~5 more), Valentini Puffer 58 (puffs up, comes to the glass; nips seahorses), Pink Anthias 50 (a school of four), Halloween Hermit Crab 52.
**Decorations:** Little Bridge 44.
**Wish:** "Reach tank level 6" pays +10.

## Level 7 — "A turtle sanctuary corner" (~day 24)
**Animals:** none new (this is the preparation level).
**Decorations:** Turtle Ledge 40, Sea Grass Bed 30, Glow Crystal 56, Little Lighthouse 150 (a landmark; its lamp glows at night).
**Toys:** Light spot.

## Level 8 — "Sea turtles" (~day 35, the top)
**Animals:** Sea Turtle (green) 180, Hawksbill 220, Loggerhead 260, Kemp's Ridley 240: rescued hatchlings to raise and release to the sea; released turtles come back to visit. The Leatherback only ever passes by.
**Decorations:** Coral Spire 250 (the biggest piece).
**Wish:** "Reach the top tank level" pays +15. Beyond this, care points keep banking for whenever a level 9 exists.

---

## Things worth a look while you audit
1. **The hawksbill is meant to open only after a turtle has been released** (the code checks `needRel` and a comment says so) but no species sets `needRel`, so all four turtles open together at level 8.
2. **Level 7 has no new animal.** It is the only level that opens nothing alive; the Light spot and four decorations carry it.
3. **Two price lists.** The base species table says seahorse level 3 / octopus level 4 / angelfish 3 / anthias 4 / mandarin 4 / turtles 7, but `SPECIES_CURVE` overrides all of them to what is listed above (seahorse 4, octopus 6, angelfish 4, anthias 6, mandarin 5, turtles 8). The curve is what the game uses; the base table is misleading to read.
4. **Big saves against small income.** The Maxima Clam (150, level 5), Lighthouse (150, level 7) and Coral Spire (250, level 8) cost two to four weeks of a typical day's shells (mystery 6 + occasional visitor/request/goal). Turtles are 180–260 on top of that.
5. **Level 2 arrives within the first day** (18 points); a new player sees a level-up almost immediately, then waits ~1.5 days for level 3. If that first one is meant to be a moment, it may be too soon to feel earned.
6. **Toys outrun their users in one place:** the Twist cube opens at level 5, a bought (second) octopus at level 6; fine because the first octopus is free, but a tank whose octopus has left or died has a cube and nobody to use it until 6.
7. **Themes can all be finished at level 2** (Lantern Cove needs lantern + bubbler, both level 2; the others have level-1 or level-2 pieces), so the theme visitors and +3s are all spent early.
8. **Nothing opens by tank age except adventures** (level 3 and 7 days). Everything else is level or shells.
