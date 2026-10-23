# TAKO COVE — Full Game Loop (current build, 2026-10-22, updated after the first-60-seconds and shop passes)

Tako Cove is a shared virtual aquarium for up to **4 caretakers** (friends or family on their own phones, joined with a 6-character code). You raise real sea animals with personalities, keep the tank healthy, and watch relationships, babies and stories happen. The aquarium itself is the main screen; menus slide up over it. The server holds the real tank state; every phone shows the same tank.

---

## 1. The core loop

**Open the app → look at the tank → care for what needs it → watch / play → see what changed → come back later.**

| Session | What a player does |
|---|---|
| **30 seconds** | Open, see who is at the glass, feed (choose a food: the menu closes and food drops near the right animals, no second tap), tap the daily mystery (6 shells). |
| **2 minutes** | Plus: wipe the glass or change the water when due, pet or play with an animal, read the Tank chart's "Best next step". |
| **5 minutes** | Plus: teach a trick, shop, open an animal's card (friends, troubles, what it wants), make a decision if one is waiting. |
| **15 minutes** | Plus: watch seahorse pairs, octopus adventures and keepsakes, breeding and babies, work on a goal. |

Coming back: the tank opens with nothing over it (see section 1a). One small line, *"N things happened while you were away · Today ›"*, shows for a few seconds, only if something big happened. **Today** opens with **While you were away**, the real big news since *your own* last visit (stored per caretaker on the server): births, eggs, pairings, best friends, favorite spots, octopus trips and keepsakes, animals growing up, arrivals. Routine care and daily rituals are left out.

---

## 1a. The first 60 seconds of opening the app (new this pass)

- **Nothing covers the tank automatically for the first 15 seconds**, or until the player's first touch. Pop-ups, banners, coach tips and toasts wait. Menus the player opens work at once.
- **No blocking sick warning.** A sick animal shows calmly: the Care tab's dot, Care's to-do list, the Tank chart's "Best next step", and the animal's own pale look. The wording is *"Pip is unwell. Food and clean water will bring it back."* Nothing says an animal could die from neglect (only old age ends a life).
- **One return-news line, not a replay.** The old on-tank "While you were away" replay is gone. If big things happened, one small line links to Today, which has the full list.
- **The octopus's own greeting is the only greeting.** The old forced "favorite swims to the glass" is removed. About a second after the tank appears, each octopus answers by trust, personality and what it is doing (measured over 200 tries each, idle and awake):

| Trust | Homebody | Watcher | Show-off | Explorer, collector, trickster |
|---|---|---|---|---|
| 0 (stranger) | carries on | carries on | carries on | carries on |
| 1 | watches you from its den | from its den | from its den | from its den |
| 2 | from its den | watches you | comes to the glass | glass about 45%, otherwise looks up |
| 3 | from its den | comes to the glass | comes to the glass | glass about 68%, otherwise looks up |

  A busy octopus (carrying a keepsake, hunting, at a puzzle, mid-trick) is left alone. A sleeping one that trusts you opens an eye.
- **Tapping an animal says what it is really doing**, from its live state, e.g. *"Ink · at its den"*, *"guppy4 1 · swimming with guppy4 2, its best friend"*, *"Neo · cleaning Pip"*. If it is doing nothing notable, only the name shows; nothing is invented.
- **A small reaction to a tap:** an octopus's eyes widen (and it flushes with color if it trusts you), a seahorse swivels an eye toward you, a fish gives a quick flick. Feeding, cleaning and following are never interrupted.

---

## 2. Care (never punishing)

- **Feed** the tank (and some animals their own food: the octopus gets crabs, seahorses mysis shrimp, turtles greens).
- **Wipe the glass** (algae builds; the tang grazes some of it off). **Change the water** (it ages; the Maxima clam slows that).
- **Pet / play** (toys: ball, bubbles, light spot, and more unlocked by level).
- **No animal dies from neglect** and **no animal leaves on its own**. An unhappy animal *asks* to leave; it stays until cared for, or a caretaker lets it go. Only old age ends a life.

### Tank Health (one number, shown everywhere)

```
animals = average wellbeing of all animals
water   = how fresh the water is (0–1)
glass   = how clean the glass is (0–1)
space   = how uncrowded the tank is (0–1)
Tank Health = 0.6 × animals + 0.4 × (0.5 water + 0.3 glass + 0.2 space)
```

Bands: **Thriving 85+ (levels up ×1.5) · Happy 75+ (×1) · Struggling 55+ (×0.5) · Unwell (×0.25)**.

Each animal's wellbeing comes from being fed, its own real needs (shown on the Health screen), its friends and troubles, and space.

---

## 3. Progression: levels 1–8 (the first chapter)

Care earns **level points** (feed 2, glass 4, water 6, pet/play/train 2, puzzle 4), multiplied by Tank Health. Play-type points are capped at **8 per tank-day** (play still works after that, and a gentle note says so once). Discoveries add points too (new species, hatchings, mysteries, decisions, goals).

| Level | Points | Animals the tank holds | What opens |
|---|---|---|---|
| 1 | 0 | 7 | A free octopus; clownfish, chromis |
| 2 | 18 | 10 | Gobies, damselfish, cardinalfish, royal gramma, neon goby; **Cleaning Station** |
| 3 | 50 | 13 | **Tricks and bubbles**: the "twirl at the glass" trick needs nothing; the bubbler (48) opens more; **Reef Cave** |
| 4 | 115 | 16 | **Seahorses** and the blue tang, angelfish; Sea Fan; **Mangrove Roots** |
| 5 | 215 | 19 | Habitats and toys: mandarin, live rock, Maxima clam |
| 6 | 350 | 22 | Puffer, anthias, a **second octopus** |
| 7 | 520 | 25 | **Turtle sanctuary corner**: Turtle Ledge, Sea Grass Bed, **Sponge Garden**, **Shell Rubble**; the Tank chart shows "Saving for a sea turtle" |
| 8 | 740 | 28 | **Sea turtles** (180–260 shells): raise one, release it to the ocean, it may come back to visit |

Measured pace (real rules, simulated players): a regular player reaches level 8 in about **26–28 days**, a casual one about **49**. Points keep banking at level 8 for future levels (9+ not built yet).

---

## 4. Shells (the only currency)

Earned from: the daily mystery and gift (about 6/day), care, wishes and requests, goals (20), level-ups, visitors, growth milestones, tricks, turtle release (100+).
Spent on: animals, decorations, crabs, puzzles, the hide game.

Turtle economy (20 seeds per strategy): a regular player who **starts saving at level 7** can afford the first turtle about **4 days after level 8**; three caretakers saving together about **2 days**. Someone who buys everything first waits about two months, and the Tank chart's savings line is there to show that.

---

## 5. Animals and what makes them feel alive

Every species is a real one, with real needs (shown on the Health screen with why each matters in the wild), friends and rivals, life stages (baby → juvenile → adult) and a natural lifespan.

### Octopus (the heart of the game)
- **Six personalities**, visible in how it moves: explorer, homebody (stays by its den), show-off, watcher, collector, trickster.
- **Recognizes each caretaker**: trust grows per person; one that knows you comes to the glass when you open the app; a stranger ignores you.
- **Adventures**: it slips out of the tank and comes back, often with a **keepsake** (bottle cap, shell…) that it carries to its den and keeps. Keepsakes have a history.
- **Tricks**: twirl at the glass (level 3, no equipment), ride the bubbles, swim through a gate. Taught in sessions, then performed on request if it trusts you and is in the mood.
- Puzzle jars, a hide-a-treat game, lid-testing, camouflage, dens it moves into.

### Seahorses
- Four real species (Yellow, Lined, Brazilian/Reidi, Dwarf); pair only with their own kind, **for life**.
- Hold on to plants with their tails (mangrove roots, sea fans, seagrass…); have favorite holdfasts they return to.
- **Pairs are visible**: a morning dance together, then they settle on plants near each other.
- **The male carries the young**: his pouch visibly swells day by day through the 6–9 day pregnancy, then he gives birth; a nursery of babies; you choose which to keep.

### Sea turtles (level 8)
Raised from a baby; need a ledge to sleep under, greens or sponges or rubble to forage, clean water and room. At adulthood plus two weeks, **released to the ocean**, sending a postcard and sometimes coming back to visit. The hawksbill opens after the first release.

### Fish
Clownfish (anemone, pairs), chromis (shoal), gobies (burrow), royal gramma (cave), damselfish (territorial), angelfish, cardinalfish (urchin), **neon goby (runs a cleaning station; fish queue to be cleaned)**, blue tang (grazes algae off the glass), mandarin (needs live rock), valentini puffer (puffs, explores), anthias (shoal). Fish make **best friends** who swim together, have **favorite spots**, rivals, and breed: eggs, hatching, genetics with rare colors (gold, ghost, blue, ember).

---

## 6. The Shop (built around what the animals need)

Decorations matter: each animal's needs name what helps.

**Tapping any item opens its card** (buying is the button on the card). Everything on the card is worked out from the game's own rules, not written by hand:
- **In your tank now** (decorations): Tank Health before and after placing it (e.g. *32 → 36*), each animal whose wellbeing would rise and by how much, and which of its needs it meets (*"guppy4 1 · Something to explore · wellbeing +11"*), plus theme progress (*"Sunken Ruins theme: this makes it 2 of 3"*) or *"Completes the Coral Garden theme: every fish a little happier, +3 shells"*. If you already own some, it says *"You have 2 · another one would do"*, because a second copy often adds less or nothing.
- **Who it's for:** the kinds of animal whose needs one piece meets (e.g. Reef Cave: royal gramma *a cave to claim*, blue tang *rocks to sleep in*, puffer *rocks to explore*), marked *in your tank*.
- **Also counts toward:** animals that want several pieces like it.
- **Also:** the reef theme it belongs to and the octopus tricks it opens (gate, bubbles).
- **Animals' cards** show their nature and every need with what provides it.
- Tiles show a green **+N health** tag under the price when placing it would raise Tank Health now.
- **Verified:** for every item, placing it through the real purchase gives exactly the Tank Health the card promised, for a first copy and a second (a permanent unit test).

| Item | Level | Shells | For |
|---|---|---|---|
| Cleaning Station | 2 | 22 | the neon goby's station |
| Reef Cave | 3 | 32 | the royal gramma's cave, the tang's bed, the puffer explores it |
| Mangrove Roots | 4 | 34 | seahorse holdfast and nursery |
| Sea Fan | 4 | 36 | a seahorse's favorite holdfast |
| Live Rock | 5 | 50 | the mandarin's food |
| Maxima Clam | 5 | 150 | water stays fresh ~50% longer |
| Turtle Ledge, Sea Grass Bed | 7 | 40, 30 | where a turtle sleeps and grazes |
| Sponge Garden | 7 | 34 | what a hawksbill eats |
| Shell Rubble | 7 | 26 | what a loggerhead crunches |

Plus plants, rocks, structures (arch, bridge, lighthouse…), the Coral Spire (300, the big level-8 save), and earned-only pieces (torii gate, lighthouse).

---

## 7. Daily texture (reasons to open the app)

- **Daily mystery** (a glint, tracks in the sand…): tap to see what it is; pays the daily gift.
- **Wishes and requests** from animals ("Pip wants…").
- **Decisions** every few days, with real consequences. Example: *"Sunnie keeps pushing at the lid. It wants out."* Choose: **Weigh the lid down** (stays in a week, sulks), **Keep it busy with a puzzle** (stays in ~3 days, happy), **Let it explore** (adventure within ~2 hours, comes back, often with a keepsake). The animal's owner chooses first; if nobody chooses, the tank decides. You pick an option, then confirm.
- **Visitors** that may come back and ask to stay.
- **Goals**: long aims with steps (breed a golden fish, solve the mystery thread, raise a family).
- **Chapters and postcards**, a weekly story, a journal of real events.

---

## 8. Multiplayer

- Up to 4 caretakers per tank; everyone sees the same animals in real time.
- Each person has their own octopus relationship (trust), their own "While you were away", and first say on decisions about their own animal.
- Notes on the glass, bottles between caretakers, gifts, a friend can look after an absent friend's octopus.
- Push notifications: at most one a day, never at night.

---

## 9. Look and feel

- 3D voxel aquarium with underwater light: sunbeams, drifting caustics on the sand and the animals, rim light, light motes, time of day (morning, afternoon, evening, night, with moonlight).
- Dirty glass shows as algae spots; old water turns a little murky (both kept light so the tank stays vibrant).
- Menus follow one iOS-like design: one font, gold primary buttons, grouped lists; every choice is a list of options with circles, pick one, then confirm. Shop items open a card first; nothing is bought by a single tap.

---

## 10. What is deliberately NOT in the game

No second currency, no leaderboards, no streak pressure, no animals dying or leaving because you were away, no random drama unrelated to the animals, no mandatory chores beyond basic care.

---

## 11. Known gaps and open questions (for review)

1. After level 8 nothing new unlocks yet (levels 9–20 are planned, not built). Breeding, turtles, goals and stories carry the late game.
2. The first real-player test on iPhone has not happened yet; all checks so far are simulations and a headless browser (which draws about 0.3 frames per second, so timings and the small tap reactions are not verified on screen).
6. Known test failures that predate this pass: three in `loop_check` and two in `care_check` (Care screen wording, the hungry-octopus glass visit), and three in `playthrough` (feeding pays a shell, shells fly to the counter, one plant shows as free). They fail the same way on the code from before these changes.
7. Not done yet: a clean re-recording of the opening after the last quiet-window fix.
3. Are care requirements rewarding or repetitive after week 3?
4. Is it clear to a new player what to do in the first 5 minutes?
5. Do the animals feel like *individuals* to a player who never opens a profile?

**Question for review:** If someone played Tako Cove for 30 days, what would make them genuinely care about their aquarium and want to keep playing, and what is the single most important thing to improve before the first real player test?
