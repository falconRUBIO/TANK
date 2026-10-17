# Tanklings: the full game loop (for review)

A calm, shared aquarium for phones. One tank, up to four caretakers (friends or family). The animals live on a real clock: they get hungry, grow up, make friends, lay eggs, have babies and die of old age whether or not anyone has the app open. No ads, no streaks, one soft currency (shells).

All numbers below come from the game rules (`web/src/game/rules.js`), which run on both the phone (solo tank) and the server (shared tank). When the two disagree, the server wins.

---

## 1. First minutes

1. **Welcome:** every tank starts with an octopus. The player picks one of six colors (Coral, Violet, Ocean, Amber, Kelp, Ink) and a name, then taps "Bring it home".
2. **Meet the octopus:** a few quiet seconds to watch it drop in and explore its new home.
3. **Say hello:** "Touch and hold the glass": the octopus swims over to the finger.
4. **Time for a snack:** open Care, tap Feed, tap Feed on its card; a crab drops in and it hunts it.
5. **You are all set:** "Show me what is coming" or "Done". Inviting friends and the Shop's free plant come later, quietly.
6. A chapter banner reached during the tips (e.g. "Eight Arms Aboard") waits until they are done. The daily gift waits a further 45 seconds after that, so a new player sees one thing at a time.

## 2. The daily loop

| Step | What the player does | What they get |
|---|---|---|
| Open the app | Sees the tank; the Bell shows what happened while away | A welcome-back card ("Pip grew up", "Mimi dragged it out of its den") |
| Daily gift | One tap on a card | +2 shells, once a day for the tank (whoever comes first) |
| Care | Feed (the meal drops in by itself); wipe the glass and change the water when due; trim plants | Shells for the chores (see section 4) |
| Daily checklist | Small things to watch or do (watch a fish for 15 seconds, say hello to three fish, see two friends swim together...) | 3, 5 or 8 shells per item depending on tier (a full day is ticked, not paid) |
| Today's request | One shared wish a day for the whole tank (e.g. "a plant for Pip") | +4 shells, the animal's happiness |
| Play | Toys, Hide a treat, Puzzle jar | Bond, journal moments, discoveries |
| Shop | Spend shells on fish, decorations, floors, backdrops | Tank level, new animals, themes |
| Journal (Crew tab) | Read and heart the day's moments, each with a photo | Postcards to send; a weekly recap |
| Evening | A small recap card: today in the tank, and what is next | Once a week it becomes "This week in the tank" |

Nothing is lost by skipping a day. The animals get hungrier and the water cloudier, but there are no streaks to break.

## 3. The animals

### Fish (bought in the Shop)

| Species | Shop name | Price | From level | Comes as | Lifespan |
|---|---|---|---|---|---|
| goldfish | Clownfish | 10 | 1 | 1 | 420 days |
| neon | Blue Chromis | 20 | 1 | school of 4 | 240 days |
| cory | Yellow Goby | 18 | 2 | 1 | 300 days |
| blue | Royal Gramma | 28 | 2 | 1 | 300 days |
| guppy | Damselfish | 18 | 2 | pair | 300 days |
| angelfish | Emperor Angelfish | 40 | 3 | 1 | 420 days |
| platy | Cardinalfish | 24 | 3 | pair | 240 days |
| danio | Pink Anthias | 32 | 4 | school of 4 | 240 days |
| betta | Mandarin Dragonet | 52 | 4 | 1 | 300 days |
| (special) | Ghost Dragonet, Golden Angelfish, Rose Goby | not sold | | | rare: hatched or gifted only |

- **Arrival:** a bought fish is ordered and arrives later, from 10 minutes up to a few hours for rarer kinds.
- **Life stages:** baby, then youngster at 1 day, adult at 3 days, then elder in the last quarter of its life. "All grown up" comes after 7 days in the tank.
- **Character:** each fish has 1–2 traits (Calm, Shy, Brave, Social, Greedy, Curious...) and a favorite food. Over time it makes a best friend (or a rival), finds a favorite spot, learns two tricks with a caretaker (swim through a gate, ride the bubbles), and learns toys.
- **Feeding:** the fish share one hunger. They are due about every 12 hours, and a meal can be given from 8% hunger.
- **Eggs:** adult pairs of the same kind lay eggs, which hatch in 3 days. A tank full for the shop keeps 4 extra places for eggs and babies, so births go on. Many species really care for their eggs, and the game shows it: a clownfish or damselfish father guards and fans them, and some species carry them in their mouths. A father keeps the octopus away from his eggs. Caretakers can "look after" the eggs on two days for a strong hatch. The first hatch pays +5 shells.

### Octopus (every tank starts with one; more can be bought at level 4 for 52 shells)

- **Lifespan:** 120 days, as real octopuses are short-lived.
- **Personality:** one of six types, which steers what it chooses to do: Explorer, Homebody, Show-off, Watcher, Collector, Trickster.
- **Own caretaker:** each octopus belongs to one caretaker, and only they can feed it. A friend can take it on if its caretaker has been away for 14 days.
- **Feeding:** a crab (4 shells, at most one every 2 hours). It hunts the crab on the sand and eats it leg by leg. Hunger comes back about every 12 hours.
- **Home and rest:** it lives under a coconut shell (and can learn to use a clay pot). When tired or frightened it goes home and rests under the shell.
  - Worn out, it stays home most of the next few minutes.
  - Frightened, it stays hidden instead of coming out to greet anyone.
- **What it does:** inspects anything new, moves rocks and its own shell, builds a shelter, and carries things.
  - It camouflages to the ground.
  - It does impressions: lionfish, sea snake, jellyfish, flatfish, kelp. A frightened mimic octopus prefers the sea snake, as real ones do.
  - It inks, bats the ball, comes to the glass to greet people it knows, follows a fingertip on the glass, and smacks an annoying fish.
- **Memory:**
  - It remembers each decoration: how familiar it is, how often it has visited, and where it was moved from.
  - It remembers each caretaker: trust, and who helped.
  - It remembers each fish: buddies and rivals.
- **Puzzle jar** (3 shells, once every 3 hours, adults): a crab in a jar. The first solve takes 150 seconds, then 75, 35 and 15 as it gets better. +3 shells the first time.
- **Hide a treat** (5 shells, once every 20 minutes): the caretaker hides a treat in a decoration and the octopus searches spot by spot.
  - The order it searches in is what it has learned about *that caretaker*: the places they have used, and the last one, count more with every hunt.
  - Hide in the same place and it soon goes straight there. A new place fools it.
  - Journal lines, bond, and a discovery after three straight finds ("Ink has learned your hiding places").

### Seahorse (from level 3, 36 shells)

- **Lifespan:** 180 days.
- **Holdfasts:**
  - It spends most of its time anchored by its tail to plants, its holdfasts. It swims slowly between them and earns a favorite after two visits and two minutes held.
  - Two seahorses never hold the same stem at once.
  - A calm one may stay on one stem for minutes.
- **Eating and looks:** it snaps up drifting plankton, each eye looks its own way, it takes on a little of its holdfast's color, and it rests at night.
- **Feeding:** tiny mysis shrimp (free). Each seahorse has its own hunger and its own caretaker, like the octopus.
- **Family life:**
  1. **Pairing:** a male and a female that share the tank as adults for 2 days pair up for life. They are never parent and child, or brother and sister.
  2. **Courtship:** at dawn, a settled pair dances, circling with tails linked.
  3. **Pregnancy:** the male carries the young in his brood pouch for 6–9 days. The pouch visibly fills.
  4. **Birth:** on the server's clock, whether or not anyone is watching. 10–15 babies; three are tracked with their own names, looks and roles (one roams, one keeps to the plants, one stays near family).
  5. **Nursery:** 5 days. The babies catch food themselves. Each day one baby gets a journal line about what it did in this tank.
  6. **Choosing:** "They're ready!" The caretakers choose one baby to stay, with a confirmation. The others swim off to new homes, together. The kept baby's profile shows its mother, father and birth date.
  7. **Rest:** the father rests for 14 days before he can carry again.
- **Notifications:** the new pair, the courtship, the birth and "They're ready" reach caretakers who are away.

### Visitors and finds

- A rare visitor every 2–4 days (say hello: +4 shells).
- Finds in the tank: a pearl drifting down or a lost item (+1 to +4).
- A message in a bottle between friends.
- Wrapped gift bags: a fish bought for a friend waits wrapped on the sand until they open it.

## 4. Shells (the only currency)

| Earn | Shells |
|---|---|
| Daily gift (once a day per tank) | +2 |
| Feed a properly hungry animal with free food | +1, once a day per tank |
| Wipe the glass (every few days) | +4 (a pearl every 5th: +6) |
| Change cloudy water (every few days) | +6 |
| Trim grown plants | +1 each |
| Daily checklist item | +3 / +5 / +8 |
| Today's request | +4 |
| Rare visitor | +4 |
| A fish grows up / turns 14 or 30 days | +1–2 / +5 / +8 |
| Tricks, themes, a friend joins | +3 each |
| Tank wishes (long goals) | +4 to +25 |

**Spending:**
- **Fish:** 10–52 shells.
- **Decorations:** 29 kinds in Plants, Rocks, Wood, Structures and Special, up to 60 in a tank.
- **Floors** (20–40) and **backdrops** (25).
- **Foods:** pellets 2, treats 4, crab 4.
- **Games:** puzzle jar 3, hide a treat 5.

Toys are free: the ball from the start, bubbles after 3 plays, the light spot after 8.

> After the October rebalance (docs/LOOP_AUDIT.md): about 26–38 shells a day, level 8 around day 31–34, about 1,000–1,400 unspent by day 120 (was 3,000+). Hide a treat is the steady use for spare shells.

## 5. Progress

- **Tank level 1–8:** from a score of animals, adults, decorations and discoveries. The thresholds are 14, 36, 66, 100, 140, 184 and 220. Levels open new species and decorations, and the tank gets bigger.
- **Chapters**, each said once: Day One, A Small Crew, A Week Together, Eight Arms Aboard, A Little Reef, All Grown Up, A Busy Tank, A Month of Water.
- **Discoveries** per animal (the collection book): best friend, favorite spot, trusts a caretaker, follows a fingertip, became a parent, comfortable at the glass, waits at the surface, rests at night, a hiding place, investigates objects...
- **Milestones** per animal: hatched, made a friend, found a favorite spot, trusts you, learned a trick, all grown up, became a parent.
- **Reef themes** (kelp, coral, ruins, lanterns): pieces that belong together lift the fish, pay once, and draw their own visitor.

## 6. Upkeep and consequences

- **Hunger:** fish are due about every 12 hours; each octopus and seahorse has its own hunger on the same rhythm.
- **Water** gets cloudy and **glass** gets algae over about 66 hours. Each is a chore with a reward.
- **Neglect never kills.** It starts building up about 30 hours after an animal's last meal, or while the water is bad. After 2 days the animal looks tired; after 3 it is very unwell (slow, pale, keeping to itself) and stays that way until someone cares for it. With care it recovers within about two days, and the journal says "___ is back to its old self". Hunger notifications only go out once an animal has started to suffer for it.
- **Death comes only from old age**, at the end of each species' lifespan: a farewell card ("Rest well. The others stay close.") and a memorial that keeps its story.

## 7. Social (shared tanks)

- **Joining:** up to 4 caretakers join with a six-character code. Each gets one free first fish of their own.
- **Caring:** anyone can feed the fish, wipe and change the water. Octopuses and seahorses have one caretaker each.
- **Notes on the glass:** sticky notes, with colors and doodles, that others read. A note is only marked "seen" when someone really looks at it.
- **Gifts:** buy a fish for a friend; it arrives wrapped in a bag in the giver's ribbon color.
- **Bottles and nudges:** "Ana says Inky is hungry", for example.
- **Journal:**
  - an Instagram-like feed of the day's moments, each with an automatic close-up photo;
  - a heart per person, saved on the server;
  - postcards of a moment or of the tank;
  - a photo can be removed by anyone.
- **One phone runs the animals** (the smoothest one), and the others mirror it, so everyone sees the same thing.

## 8. Notifications (opt-in, per kind, quiet hours 22:00–08:00)

- **Kinds:** Eggs and babies, Gifts and bottles, Hungry animals, Friends, Visitors and news.
- **Daily limit:**
  - Light news (a new pair, growing up) only goes out on a quiet day.
  - What matters (a hungry animal, a birth, a gift for you) still gets through, up to three a day.

## 9. Menus

- **Tank:** the aquarium itself. Tap an animal for its card: profile, personality, stats and journal.
- **Care:**
  - **Needs you:** what is due now, each with one gold button (Wipe, Change). Feed appears here when an animal is hungry.
  - **Later:** what is not due yet, with no button and when it will be due.
  - **Coming up:** births, hatches, arrivals and growing up.
  - The daily checklist and level bar.
- **Feed** (opened from Care):
  - One card per animal, with a dot-and-word status (Full / Peckish / Hungry).
  - An animal that wants to eat has an obvious gold Feed button; a full one has none, and its card opens to say when it can eat next.
  - The fish share one card with Flakes (free), Pellets (2) and Treats (4), shown only when they can eat.
  - Choosing a food closes the menu and the meal drops in by itself, right by the animals. There is never a need to tap the water.
- **Play:**
  - "With *octopus name*": Hide a treat, Puzzle jar.
  - Toy box: only the toys that are open, plus one line for the next.
  - Share: postcard.
- **Shop:** New, Plants, Rocks, Wood, Structures, Special, Fish, Floor, Backdrop, Themes. Press and hold an item for a closer look.
- **Crew:** Friends, Journal, Collection, Settings (behind the gear icon).
- **Bell:** everything that happened, newest first.

## 9b. Little Adventures (rare events)

The full detail is in `docs/LITTLE_ADVENTURES.md`.

- **The octopus goes exploring:**
  - Every 4–8 days it has a chance to go (an explorer often goes, a homebody rarely).
  - It paces the glass, then climbs out over the back rim.
  - It is away for one of four lengths: a 5–20 minute hide, a short trip of 30 minutes to 3 hours, a night of 6–12 hours, or, exceptionally, 24–48 hours.
  - It comes home with one of 16 outcomes chosen by its nature, sometimes carrying a keepsake that it then keeps by its den.
- **While it is away it is completely safe:**
  - no hunger and no illness;
  - it cannot be fed, sold or played with;
  - its trust and its owner are unchanged.
- **Where it shows:** the Feed card says "Out exploring", Coming up mentions it with no time, and a major trip writes one journal line and sends one push when it leaves and one when it returns.
- **Small moments:** every 3–6 days, a fish, seahorse or tank moment drawn only from what the tank really has, at most 2 a week.
- **No rewards:** no shells and no new currency.

## 10. Open questions for review

1. **Shells:** do they still pile up late in the game? What else is worth spending on, without a second currency or pay-to-win?
2. **Late game:** after a month, what keeps a caretaker coming back besides upkeep (seahorse families, rare hatches, themes)?
3. **Neglect:** animals no longer die of it (they become very unwell and recover with care). Is that consequence strong enough?
4. **Octopus ownership:** is "only its caretaker can feed it" right for a shared tank, or does it frustrate friends?
5. **Daily checklist and request:** do they feel like chores? Too many small rewards at once?
6. **Hide a treat:** is 5 shells and a 20-minute rest the right pace?
7. **Fish naming:** the internal species ids (goldfish, neon, betta...) differ from the shop names (Clownfish, Blue Chromis, Mandarin Dragonet...). Players only see the shop names; is the mapping sensible?
8. **Notifications:** is three a day the right ceiling?
