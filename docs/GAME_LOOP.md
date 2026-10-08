# OUR TANK: the game loop as built

Three friends share one aquarium on a phone. Calm, no ads, no purchases, no streaks. All numbers below come from the code; the pacing numbers are from a bot simulation, not from real players yet.

## 1. One visit (1 to 3 minutes)
1. Open the tank. A small hint pill names the single most useful thing: feed, wipe the glass, change the water, collect a gift, greet a visitor, open a bottle, or "an egg is about to hatch".
2. Do the care.
   - Feed: tap the water to drop food. +1 shell, only if the fish are actually hungry.
   - Wipe the glass: swipe it clean. +1 shell; every fifth wipe finds a pearl for +3.
   - Change the water: one tap. +2 shells, only when the water is cloudy.
3. Collect what is waiting: a washed-in gift, a friend's bottle, a rare visitor.
4. Spend shells (fish, decorations), arrange the tank, or just watch. Tap a fish to see its card and play with it by dragging a finger along the glass (the fish follows it; five seconds builds a bond).

## 2. Time passes while you are away (hours)
| Thing | Pace |
|---|---|
| Hunger rises to its cap | about 6 hours |
| Algae on the glass | about 30 hours |
| Cloudy water | about 48 hours |
| Washed-in gift (1 to 3 shells, a 4-shell pearl, or fish treats; waits forever) | every 6 hours |
| Ordered fish arrives | 10 min to 4 hours, by species |
| Rare visitor (Moon Betta, Sun Angelfish, Rose Corydoras; greet for +4 and a book entry) | every 9 to 15 hours, stays 3 hours |
| Egg (two adults of one species; hatches in 4 hours into a blend of both) | every 16 to 28 hours |
| Journal story about a fish | every 3 to 5 hours |
| Tank birthday | +8 shells each week of the tank's age |

Light follows the phone's clock (morning, afternoon, evening, night). At night most fish drift low and slow.

## 3. Stakes: neglect and death
A fish that is starving or in foul water accumulates neglect time. Care wins it back twice as fast.
- Days 1 to 2: normal, needs decline gradually.
- Day 3: sluggish and paler; growth pauses.
- Day 4: critical: slow, little appetite, a warning goes out.
- Day 5: death becomes possible, and only if that fish's own health is still critically low.
- When a fish dies it stops swimming and floats slowly to the surface, belly-up. It stays until any caretaker taps it and chooses LAY TO REST (card shows name, species, age, original caretaker, date of death). While it floats the water fouls faster.
- A memorial record is created at death (identity, arrival date, death date, original caretaker, personality, milestones) and is kept in the Journal under Remembered after the fish is laid to rest.
- Safeguards: no deaths in a tank's first 3 days; at most one death per rolling 24 hours; the last fish never dies; the server decides, so two phones cannot produce two deaths; any one caretaker keeping up care keeps everyone's fish healthy.

## 4. Growth and progression (days to weeks)
- Fish: baby, juvenile (1 day, +1 shell), adult (3 days, +2 shells).
- Tank level comes from a score (fish, adults, decorations, collection entries, shared wishes). Thresholds: 14, 36, 66, 100, 140, 184, 226 for levels 2 to 8. Capacity is 4 + 3 per level (7 at level 1, 28 at level 8). Each level-up pays 3 + level shells and unlocks content. Bot simulation at three short visits a day: level 2 around day 2, level 5 around day 12, level 7 around day 44.
- Shop: 9 fish species (goldfish 10, neon school of 4 at 20, corydoras 18, guppy pair 18, blue ram 28, platy pair 24, angelfish 40, danio school of 4 at 32, betta 52) and 22 decorations (4 to 56 shells). Each fish has a wait before it arrives. One fish a day is 25% off.
- Collection book: 34 entries (fish, decorations, rare visitors); +3 shells for every 5 found.
- Tank wishes (shared goals, in order): 12 of them, from "three fish swimming together" (+4) to "find everything in the book" (+25).
- The tank starts empty except for one goldfish and a free starter pack of five decorations. Floor (5 choices) and backdrop (4 choices) are picked in the Decorate tab.
- Nothing beyond level 8 exists yet.

## 5. Fish as individuals
- Each fish has one or two traits (Shy, Brave, Curious, Social, Playful, Lazy, Calm, Greedy) that drive real movement: shy fish hide behind plants and bolt when others come close; brave fish swim to the glass; curious fish inspect decorations and other fish; social fish keep a buddy; playful fish chase bubbles; lazy fish rest low; greedy fish wait near the surface.
- Every fish also gets a small colour and size variation from its seed, a home corner of the tank, a favourite decoration it returns to (found after living here a while), a best friend it stays near, and a caretaker.
- A fish swims out to the glass more often for its own caretaker (the person who brought it in, or who has bonded with it most). Each caretaker gets one free first fish of their own (the creator's is the starter goldfish).
- The fish card shows traits, age, time to next growth stage, favourite spot, original caretaker and who it is closest to.

## 6. Three players
- Up to three caretakers share everything: fish, decorations, shells, journal, chat. Join by a 6-character code or link; a fourth person sees "This tank is full".
- Nudge a friend when the tank needs something. Send a message in a bottle (40 characters, 2 shells to send, +4 shells for whoever opens it; one per 6 hours). Chat. Activity list.
- Opt-in push notifications (needs keys on the server): rare visitor, an arrival or hatch, a critical-state warning, a nudge, a bottle. Maximum two a day per person, never 22:00 to 08:00 local time, never while the game is open.

## 7. Not built yet
- Small optional daily wishes (shared, no penalty for missing a day).
- A no-cost "thank you" between caretakers.
- Cooperative discoveries (one finds an object, another investigates it, a third places it).
- Progression beyond level 8 (new species, environments, rare decorations, behaviour milestones, aquarium history).
- Usage analytics and the developer dashboard.
- Simulations for one versus three caretakers, absent players, and level 10+, and a written audit.
- Real-device testing: frame rate, touch feel, how the fish movement reads, and whether the timings feel right.

## 8. Questions for the reviewer
1. Is five days of neglect before death possible the right weight for a casual shared game, or too harsh for friends who stop opening it?
2. After the first few days, what gives a visit a goal beyond care (levels are slow: about 12 days to level 5)?
3. Is the shared shell wallet right for three players, or should contributions be visible?
4. Which of the unbuilt items matters most?
