# OUR TANK: economy audit (shells, prices, income, sinks)

Everything below is read from the code (`web/src/game/rules.js`) or produced by running the real rules in a simulator (`tools/econ.mjs`, `tools/farm.mjs`). **No real players have played yet, so every pacing figure is simulated, not measured.**

## 1. The currency
- One currency, **shells**, shared by everyone in the tank (one wallet, three caretakers). There are no individual wallets, no premium currency, no real-money purchases, no ads.
- Shells only buy things *inside* the game. The game earns the developer nothing; the only real cost is hosting (about a few dollars a month on Render).

## 2. What you start with
- **10 shells.**
- One goldfish (Pip) and **a free starter pack** of one fern, one tall grass, one pebble rock, one starfish and one moss ball (worth 29 shells at shop prices).
- Every other player who joins gets one **free first fish** (a goldfish, no waiting).
- Tutorial: feeding Pip once pays +1, so a new player has 11 shells and can afford a second goldfish (10) straight away.

## 3. How shells are earned

### Care (only when the tank actually needs it)
| Action | Pays | Limit that stops farming |
|---|---|---|
| Feed (tap the water, up to 3 drops) | +1 per drop, only while hunger is above 25% | hunger rises about 20% an hour, one drop removes 30%, so at most one shell per ~1.5 hours |
| Wipe the glass | +1, and every 5th wipe is a pearl for +3 in total | algae returns slowly: at most about one wipe every 3.6 hours |
| Change the water | +2, only when the water is below 70% | water clouds by 30% in about 14 hours |

### Things that arrive
| Source | Pays | Pace |
|---|---|---|
| Gift in the tank | 62%: 1 to 3 shells, 15%: a 4-shell pearl, 23%: fish treats (no shells); average about 1.8 | one every 6 hours, waits forever, only one at a time |
| Rare visitor greeted | +4 | one every 9 to 15 hours, stays 3 hours |
| Friend's bottle opened | +4 (the sender paid 2) | one per sender per 6 hours |
| **Daily wish** (shared, optional) | +3 | once a day, never penalised |
| Tank birthday | +8 | once per week of the tank's age |

### Progress
| Source | Pays |
|---|---|
| A fish grows to juvenile / adult | +1 / +2 per fish, once each |
| Tank level-up | 3 + the new level (+5 at level 2 up to +11 at level 8) |
| Every 5 collection-book entries | +3 |
| Shared tank wish (12 in order) | +4, +4, +5, +5, +6, +6, +8, +10, +15, +15, +12, +25 |
| A fish finds a favourite spot / a best friend / learns to trust a caretaker | +2 each |
| Selling a decoration | half its price (rounded down) |
| New behaviour discoveries, thank-yous, Family trees | 0 (history, not income) |

Fish themselves **do not produce shells**. A fish's only shell value is the +3 it pays for growing up.

## 4. How shells are spent

### Fish (price, level to unlock, wait before it arrives)
| Fish | Price | Level | Wait | Comes as |
|---|---|---|---|---|
| Goldfish | 10 | 1 | 10 min | 1 |
| Neon Tetra | 20 | 1 | 20 min | school of 4 (5 each) |
| Corydoras | 18 | 2 | 60 min | 1 |
| Guppy | 18 | 2 | 25 min | pair (9 each) |
| Blue Ram | 28 | 2 | 90 min | 1 |
| Platy | 24 | 3 | 40 min | pair (12 each) |
| Angelfish | 40 | 3 | 3 h | 1 |
| Zebra Danio | 32 | 4 | 60 min | school of 4 (8 each) |
| Betta | 52 | 4 | 4 h | 1 |

One fish a day is 25% off (rounded up). The 3 rare visitors are not for sale. **Total for one of every fish: 242 shells.**

### Decorations (price, level), 22 of them, maximum 60 in a tank
Starfish 4 (L1) · Tall Grass 6, Pebble Rock 6, Moss Ball 6 (L1) · Fern 7, Sword Plant 7 (L1) · Red Plume 10 (L1) · Boulder 12 (L1) · Mossy Skull 10 (L2) · Pearl Clam 14 (L2) · Old Pillar 15 (L2) · Bubbler 16 (L2) · Driftwood 18 (L2) · Stone Lantern 20 (L2) · Treasure Chest 24 (L2) · Giant Kelp 14 (L3) · Torii Gate 34 (L3) · Stone Arch 30 (L4) · Bamboo 18, Old Anchor 24 (L5) · Little Bridge 44 (L6) · Glow Crystal 56 (L7). **Total for one of every decoration: 395 shells.** Floors and backdrops are free.

### Other spending
- A bottle to a friend costs 2.
- That is all. Nothing else costs shells.

### Capacity and level gates (these cap spending, not just price)
Fish capacity is 4 + 3 per level (7 at level 1, 28 at level 8). Level needs a score of 14, 36, 66, 100, 140, 184, 226 for levels 2 to 8 (score = fish x2, adults x2, decorations x1, collection entries x1, completed tank wishes x3).

## 5. Income rates

### Ceiling for pure care (simulated, one fish, visits at fixed spacing, 30 days, no spending)
| Visiting | Shells per day |
|---|---|
| once a day | 9.7 |
| every 8 hours | 20.9 |
| every 3 hours | 33.1 |
| every hour | 22.0 (hunger can't regrow fast enough to pay) |
| every 15 minutes | 26.3 |
So the care ceiling is roughly **33 a day** at best, and spamming does not pay more.

### A goal-driven bot that cares, collects gifts and buys, through all rules (simulated, 90 days)
| Visits a day | Net shells a day | Level 2 | Level 5 | Level 7 | Shells unspent at day 90 |
|---|---|---|---|---|---|
| 1 | 5.5 | day 3 | day 13 | day 56 | 215 |
| 3 | 13.7 | day 2 | day 9 | day 28 | 860 |
| 6 | 18.4 | day 1 | day 7 | day 21 | 1275 |
The bot does not complete the daily wish or greet visitors, so real income would be a little higher. It also never lets a fish die.

## 6. What this shows
1. **The first week is generous.** 10 shells plus a free starter pack buys a second fish in minutes. The cheapest fish costs one day of one visit.
2. **Care income is deliberately small and capped.** Every care action has a regrowth limit, so you can't grind. About 5 to 15 shells a day is a normal player.
3. **Prices are about 2 to 5 days of income each**, and **level gates, not price, are what slow people down** (level 5 at about day 9 to 13, level 7 at about day 28 to 56).
4. **Nothing to spend on after about day 30 to 60.** A bot that has bought one of everything ends with 200 to 1,300 unspent shells. After that, shells pile up with no use. This is the main economic gap.
5. **A hard ceiling near level 7.** At 60 decorations and full tank capacity the bot's score tops out around 217, just short of level 8 (226). Level 8 needs the rare visitors and more wishes. There is nothing past level 8 (see `docs/PROGRESSION_9_12.md`).
6. **Fish are an expense, not an income.** That fits "care about fish, not shells", but it means shells never reward keeping fish healthy beyond the one-time growth bonus.
7. **Shared wallet:** the daily wish, gifts and bottles are all tank-wide, so friends neither compete nor divide the money. A bottle costs 2 and pays 4, so bottles create a small amount of shells; the limit is one per sender per 6 hours.

## 7. Risks and open questions for the reviewer
1. Is a shell sink needed after level 7 (cosmetics, floors and backdrops unlocked with shells, a "restock" for rare things, memorial decorations)?
2. Should deaths cost shells (a replacement fish, a memorial)? Today death is free apart from losing the fish.
3. Are 2 to 5 days of income per item the right price pressure for a calm game?
4. Should the daily wish pay more, or is +3 right when the average player earns 5 to 15?
5. Should fish growth pay more than +3 to make raising fish feel rewarded?
6. Is there a risk a single heavy caretaker earns everything while two friends watch, and is that fine since the wallet is shared?

## 8. Not yet verified
- Every number in sections 5 and 6 is from a simulation. Real play will differ, especially visits per day, whether people greet visitors and finish wishes, and how often fish get neglected.
- The analytics dashboard (see README) will show real `shells_earned` and `shells_spent` per day once people play.
