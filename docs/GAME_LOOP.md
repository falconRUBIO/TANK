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
| Tank birthday | +8 shells each week of the tank's age |

Light follows the phone's clock (morning, afternoon, evening, night). At night most fish drift low and slow.

## 3. Stakes: neglect and death
A fish accumulates neglect time when the tank has gone 30 hours without any feeding, or when the water is foul. A caretaker who feeds once a day never builds any. Care wins it back twice as fast.
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
- Nothing beyond level 8 exists yet (see `docs/PROGRESSION_9_12.md`).

## 5. Fish as individuals
- Each fish has one or two traits (Shy, Brave, Curious, Social, Playful, Lazy, Calm, Greedy) that drive real movement: shy fish hide behind plants and bolt when others come close; brave fish swim to the glass; curious fish inspect decorations and other fish; social fish keep a buddy; playful fish chase bubbles; lazy fish rest low; greedy fish wait near the surface.
- Every fish also gets a small colour and size variation from its seed, a home corner of the tank, a favourite decoration it returns to (found after living here a while), a best friend it stays near, and a caretaker.
- A fish swims out to the glass more often for its own caretaker (the person who brought it in, or who has bonded with it most). Each caretaker gets one free first fish of their own (the creator's is the starter goldfish).
- The fish card shows traits, age, time to next growth stage, favourite spot, original caretaker and who it is closest to.

## 6. Three players
- Up to three caretakers share everything: fish, decorations, shells, journal, chat. Join by a 6-character code or link; a fourth person sees "This tank is full".
- Nudge a friend when the tank needs something. Send a message in a bottle (40 characters, 2 shells to send, +2 shells for whoever opens it; one per 6 hours). Chat. Activity list.
- Opt-in push notifications (needs keys on the server): rare visitor, an arrival or hatch, a critical-state warning, a nudge, a bottle. Maximum two a day per person, never 22:00 to 08:00 local time, never while the game is open.

## 7. Added since the first version of this document
- **Behaviour discoveries (14).** Noticed once per fish, from real behaviour, saved permanently, written to the journal, shared by everyone, and shown only as a small toast. Found a best friend, a favourite spot, trusts a caretaker, follows a fingertip, became a parent (all decided by the server), and comfortable at the glass, waits at the surface, rests at night, has a hiding place, returns to one decoration, investigates objects, swims with a friend, plays in the bubbles, has a daily routine (all seen by a watching phone and checked by the server: right personality, a real decoration, a real partner, a real bubbler).
- **One shared daily wish.** Watch fish swim for 15 seconds, say hello to three fish, see two fish swim together, watch a fish visit a decoration, watch a playful fish by the bubbles, give the tank some needed care, or place a plant. Only wishes that can be done right now are chosen; it is replaced each day; +3 shells once; nothing happens if it is missed. It shows quietly in the hint pill and in the Care sheet.
- **Thank-yous.** A heart beside a friend's recent contribution (24 hours). Free, once per contribution, limited to one per friend per ten minutes, no counts or rankings anywhere. They get a small toast: "Sam appreciated you feeding the fish."
- **Journal versus activity.** The Journal holds meaningful history (arrivals, births, growth, deaths and memorials, friendships, discoveries, tank milestones, unusual events, your own notes). Feeding, cleaning, purchases, decorating, renamed fish and opened bottles go to the Activity list in the Friends tab, which names who did what ("You fed the fish", "Alex and Sam helped Pip grow up"). The invented stories every few hours are gone; old journal rows are kept.
- **Family trees.** Eggs record both parents. A hatchling keeps its parents, a snapshot of its grandparents, its generation number and blended colour genes (pattern from one parent, tint and size from both, with a little mutation). The Family button on a fish card lists generation, parents, grandparents and children, including ones that have died. Memorial records carry the same lineage. The journal marks the first hatch of each generation.
- **Usage tracking and a private dashboard** (see README).

## 7b. Not built yet
- Progression beyond level 8 (a proposal is in `docs/PROGRESSION_9_12.md`).
- A first-generation family tree picture beyond the text dialog.
- Real-device testing: frame rate, touch feel, whether the timings feel right, and whether people actually notice the discoveries.

## 8. Questions for the reviewer
1. Is five days of neglect before death possible the right weight for a casual shared game, or too harsh for friends who stop opening it?
2. After the first few days, the daily wish and discoveries give a visit a small goal beyond care. Is that enough, given levels are slow (about 12 days to level 5)?
3. Is the shared shell wallet right for three players, or should contributions be visible?
4. Do the discoveries, daily wish and family trees make players care about individual fish, or do they read as extra chores?
