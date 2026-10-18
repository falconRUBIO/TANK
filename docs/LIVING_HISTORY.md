# Living History: implementation report

## Update: the last four, and a full audit

### The four items left open, now built

| Item | What it does (an observable change, not just a line of text) |
|---|---|
| **A grudge** | An octopus resting in its den now counts the fish that keep poking round it. This feeds its existing annoyance memory (which already makes it react to a rival). When that fish becomes its rival, the phone sends the reason with it. The tank keeps `f.grudge = { id, name, since, why }` and writes "Biscuit has decided Nosy is a nuisance. It keeps poking about round its den." If the rival is let go after 2 days or more, its story says "Has made its peace with Nosy.", and up to 4 past grudges are kept. Its profile shows "Has it in for Nosy, who keeps poking round its den." |
| **A friend away, not dead** | While an octopus is out on an adventure, its fish friend (its buddy) keeps going up to the back of the tank, where it climbed out. Its profile shows "Waiting for Biscuit to come back." A friend sold to a new home is missed for 2 days: its old spot draws the fish, and the profile says "Misses Pip, who went to a new home." Nothing is mourned. |
| **Personality passed down** | On top of the one trait a baby already takes from each parent, a young fish or seahorse gets `lean`: a small nudge (±0.05 per parent trait) toward its parents' temperament. A trait both parents share always counts; one parent's counts one time in three. `personaOf` applies it, so a seahorse's choice of holdfast (boldness, curiosity) really shifts. Its own traits are unchanged. The profile says "Takes after Mo and Ma: a little more sociable, a little more bold." |
| **Who visits a keepsake** | Each keepsake records which animals come to handle it, counted by days, up to 6 animals (`k.h.visits`). Its story names another animal that keeps coming, for example "…Sly has come to look at it on 3 days". |

### The full-system audit

A separate reviewer audited every new module and its wiring, and I also scanned the whole codebase.

**Fixed: bugs from this round of work**
1. **A seventh keepsake crashed `octoTouch`.** When remembering a new keepsake pushed the count over six, it deleted the one being touched, then read it. The least-known other keepsake is now forgotten instead. Regression test added.
2. **News that came due during a refused or repeated action was lost.** If someone's action was refused or repeated just as an adventure ended, or a capsule, birth or visitor became due, the state moved on but no journal line was written or sent. Every path (tick, action, refused, repeated) now goes through one `writeEvents`. A refused or repeated action's news is broadcast too. Regression test added: a refused action still writes Biscuit's return, at its real time.
3. **The action path and the tick path passed on different event fields.** For example, `visitor`, `birth` and `warn` were missing on actions. Both now use one field list.
4. **An octopus out on an adventure could eat an unguarded egg.** Fixed.
5. **Selling or releasing an animal left links pointing at it, and its friends never missed it.** The links were friend, buddy, mate, partner, rival and grudge; the "missed" check ran after the links were deleted. A shared `unlink` now clears them, and the check runs first. Regression test added.
6. **Octopus pairing progress was wiped whenever one of the two went on an adventure, even a short hide.** It now waits.
7. **A new tank's day-1 capsule was only made on day 2.**
8. **The stay offer could say "21th time".**
9. **A small moment could mention a visitor that had already left.**
10. **The visitor step and four others had stopped running.** A comment I wrote in the middle of a line, in the tank's time step, silenced the visitors, eggs, wishes, daily and theme steps. An existing test caught it. Fixed.

**Fixed: older bugs of the same kind**

The scan found the same problem elsewhere: real code sitting after a `//` comment on the same line, so it never ran. These predate this round.
- **Server:** the "You are not in a tank" check never ran.
- **Postcards:** the day and date line on a postcard was never drawn.
- **Octopus moving decorations:** `fishes.canMove` and `fishes.onMove` were never set, so octopuses could never move small decorations on any phone. That behavior is now switched on, as originally intended.
- **Octopus walking:** a "no walkable spot found" guard never ran.
- **Nursery:** the family record (`t.families`) was never saved.
- **Bottles:** a bottle's leaving animation never started.
- **Eggs:** a parent fish's egg-guarding settings were never set.

**Fixed: found by the full browser suite**
- **Pop-ups overwriting each other.** The first-fish chooser opened without waiting its turn, so it could cover another pop-up, such as a visitor's "wants to stay" question, which was then lost. It now waits like every other pop-up.
- **A tired or frightened octopus could leave its den to rearrange a decoration.** This came with switching decoration-moving back on. The octopus now only rearranges when rested and calm.
- **A fish could search for its moved spot more than twice.** The search count was reset on the wrong condition.

**Last full run of `tools/check_all.sh`:** 12 of 14 steps passed.
- `seahorse_check` and `life_check` failed in that run: a seahorse's swimming share, and the keepsake carry.
- Run alone, each passed 3 times out of 3.
- They are timing-sensitive under the full run's load. That is noted here rather than hidden; making them steadier is the next item.

**Reviewed and left as they are**
- `keepStory` uses `Date.now` for display only.
- `keepMove` without a report id could count twice. The client always sends one.

**Tests after the audit:**
- **Rule and server tests:** all passing:
  - 94 rule tests
  - 27 adventure tests
  - 22 Emergent Life tests
  - 18 Living History tests
  - 10 Biscuit proof checks
  - 87 server tests
- **Browser drill `tools/living_check2.mjs`:** all 8 checks pass: the nuisance and its reason, the friend waiting, the leaning, keepsake visits, and both profile lines.


## The Biscuit proof (asked for first)

**Question:** can Biscuit escape, come back with a bottle cap, carry it to its den, and still recognize that same bottle cap 30 simulated days later? Does that survive a server restart, and does it look natural in the game?

**Yes. Two automated proofs check every step, and both pass.**

### `server/biscuit.test.mjs`: the real server

This proof uses the real server, its database file and its actions. It is part of `npm test`.

1. **Escape (Little Adventures).** Biscuit is restless, climbs out and is away. It is not in the water and cannot be fed.
2. **Return.** It comes home with a bottle cap from that same adventure, recorded as `adv: 'aB'`. The cap lies by its coconut shell. The journal line carries the time it really came home.
3. **Carrying (Emergent Life).** Over four days it takes the cap off and carries it home again, through `keepMove` reports from the phone. It handles the cap through `octoTouch`. The cap records 8 carries and the day it was left by the den. The milestone "Biscuit has been carrying the bottle cap around for 4 days…" is written exactly once.
4. **Recognition.** Biscuit now knows the cap. That comes only from handling it: one touch is not enough, and the same touch counted twice adds nothing.
5. **Restart.** The server is stopped and started again from the same database file. The cap, its history, Biscuit's memory of it and its den are all still there.
6. **30 days later.** Biscuit is fed and does nothing else special, and never touches the cap again. It still knows the cap.
7. **Same cap, still home.** It is the same cap, from the same adventure, still by its den, and listed in its den record.
8. **Its story.** "Bottle cap: Biscuit found it on day N, carried 8 times, kept beside its den for 3x days." It is built only from the record.
9. **Tank history.** The tank history has the adventure and the carrying, once each, in order.

### `tools/biscuit_check.mjs`: the real game in the browser

This drill uses the real rendering, behavior code and saved data.

1. **Escape.** Biscuit climbs up the back glass and over the rim while you watch, then is gone from the water.
2. **Return.** It climbs back in with a bottle cap, which appears as a small voxel mesh by its den.
3. **Fetching.** The cap is somewhere else. Biscuit goes to it, picks it up (the cap rides under its arms) and carries it to its coconut shell. The tank records it.
4. **Handling.** It handles the cap a few times, and the game counts each touch, so it comes to know the cap.
5. **Restart.** The page is reloaded, so the game starts again from its saved tank. The same cap is there, with its history, and Biscuit still knows it.
6. **30 days later.** The game's clock is moved on 30 days, one day at a time; Biscuit is fed and never touches the cap. Biscuit is alive and still knows that same cap. The cap is part of its den, and its story reads "kept beside its den for 31 days".
7. **Recognition shows in behavior.** Given the chance, Biscuit goes to it as its own: "Going to fetch its bottle cap". A keepsake it does not know gets "Investigating a strange object" and is much less likely to be fetched.
8. **History.** Crew, then Journal, then Tank history lists Day 21 "Biscuit came back holding a bottle cap…" and the time capsules. A capsule opens to compare with the one before.

**Screenshots:** the drill saves seven to `OUT`, which defaults to `/tmp/biscuit`:
1. climbing out
2. climbing back
3. carrying
4. by the den
5. 30 days later
6. tank history
7. time capsule

**Limits of the proofs:**
- They place Biscuit in the restless state themselves rather than waiting for the scheduler's chance. The scheduler is covered by the adventure tests.
- In the server proof, the carrying arrives as `keepMove` reports, which is exactly what the director phone sends. That the phone really produces those reports by carrying the cap is shown by the browser drill.

## 1. Summary of completed features

| Feature | Status | Where you can see it |
|---|---|---|
| Den building | Built | The octopus fetches keepsakes, carries them to a spot its nature picks, puts them down, checks on them, and a trickster rearranges them. The den record and a "starting to look like home" line come from what really lies by the den. |
| Noticing changes | Built | Octopus: the existing search at the old spot. Fish: goes to where its favorite spot used to be twice, then settles for the new place. Seahorse: goes to where its plant was first. |
| Caretaker recognition | Built | When you open the tank, each octopus responds by its trust in *you*: it comes to the glass, watches from its den, or carries on. Different caretakers get different responses. |
| Life milestones | Built | Anniversaries at 7, 60, 90, 180 and 365 days, limited to what the animal's kind of life can reach. The existing 30-day line now carries recorded facts. No new shells. |
| Returning visitors become residents | Built | After 3 visits, if there is room, at most one offer a month per tank: "Let it stay / Let it wander". The first answer decides. The visitor becomes an ordinary fish of the tank. |
| Eggs and pregnancy | Small change | In the last part of a pregnancy, a father seahorse keeps to stems he knows and does not drift off. The rest already existed and is unchanged. |
| Atmosphere | Reused | Already present: day parts, sky events (full moon, rain outside, and so on), the lighting and rain effects. Nothing new was added. |
| Time capsules | Built | Day 1, 7, 30 and every 30 days, recording the real state. A photo of the tank is taken when someone has it open; otherwise the capsule is data only, and the card says so. They can be sent as a postcard. |
| Tank History | Built | Crew, then Journal, then "Tank history ›". A chronological list in which capsules open to a comparison card. |

## 2. Existing systems reused

- **Octopus decisions and memory:** `mem.fam`, likes, `octoTouch`, the moved-object investigation, den and home, trust and bond.
- **From Little Adventures:** keepsakes and their meshes, and `keepMove`.
- **From Emergent Life:** keepsake and decoration histories, habits, and the "moved its keepsake" story line.
- **Visitors:** `visitMem`.
- **Records:** journal and photos, postcard sharing, memorials, `arrived` and `born`, the age rewards.
- **Atmosphere:** sky events, lighting, `Rain`.

## 3. Files

**New:**
- `web/src/game/history.js`
- `web/src/game/history.test.mjs`
- `server/biscuit.test.mjs`
- `tools/biscuit_check.mjs`
- `tools/living_check.mjs`

**Changed:**
- `web/src/game/rules.js`: wiring, the `visitorStay` action, keepsake touches, the 30-day facts, `arrived`, and the dev "visitor" action skipping the night wait.
- `web/src/game/life.js`: a decoration's `from` position on moves.
- `server/logic.mjs`: action list, event fields.
- `server/test.mjs`: the visitor test now marks the night wait as done.
- `web/src/w3/fishmgr.js`, `web/src/w3/fish3d.js`, `web/src/main.js`, `web/src/ui.js`, `web/index.html`.
- `tools/life_sim.mjs`, `tools/check_all.sh`, `package.json`, `web/sw.js`.

## 4. Data and migrations

**New fields:**

| Field | What it holds | Limit |
|---|---|---|
| `f.mem.keeps` | How well an octopus knows each keepsake | 6 |
| `f.denMem` | Den id, the keepsakes beside it, since when | 6 objects |
| `f.arrived` | When the animal joined the tank. This never moves; `born` can. | — |
| `f.moments.anniv` | Anniversaries already written | — |
| `t.capsules` | Time capsule metadata | 40; the first is always kept |
| `t.history` | The tank's timeline: stable id, day, kind, text, reference | 200; capsules, births, deaths, arrivals and residents are never dropped |
| `t.visitMem[sp]` | Gains `asked`, `stay`, `kept` | — |
| `t.stayAskAt` | When the tank was last asked to keep a visitor | — |
| Decoration `h.moves[].from` | Where a moved decoration stood before | — |

**Migration:** older saves gain these fields quietly. Nothing about the past is announced, and a tank that was closed only gets the capsule that is due now. This is tested.

## 5. Den building

- An octopus looks over keepsakes now and then. It fetches one when it lies more than 1.3 units from its den, or a trickster rearranges one at home.
- **How likely a fetch is:**
  - whether it knows the keepsake: known 1, its own but not yet known 0.6, a stranger's 0.15;
  - its nature: collector 1.5, trickster 1.3, homebody 1.1, show-off 1.6 when someone is watching, others 0.8;
  - distance: an explorer goes further;
  - attention: twice as likely in quiet time.
- **Where it puts the keepsake down:**
  - **Homebody:** exactly where it last kept it.
  - **Watcher:** out in front where it watches.
  - **Show-off:** near the glass, when someone is looking.
  - **Trickster:** somewhere new around the den.
  - **Others:** beside the den.
- Drops happen on about 15% of carries.
- **Clutter:** at most 6 keepsakes on the sand, and at most 6 counted toward a den. A den only exists while its octopus does. Keepsakes stay in the tank after an octopus dies, with their history.
- **Not done:** octopuses do not carry ordinary decorations to their den. The existing rearranging of small decorations is unchanged.

## 6. Noticing environmental changes

- **Octopus:** reuses the existing investigation of moved and new objects. It goes to the old spot ("Searching for the …"), then finds the object and the memory updates.
- **Fish:** when its favorite spot has been moved in the last 12 hours, it goes to where it used to be twice, then to the new spot. It needs the decoration's `h.moves[].from`.
- **Seahorse:** when its favorite holdfast plant has been moved, it swims to the old place once before choosing a stem. The existing holdfast picker then weighs a moved place by how adaptable the seahorse is.
- Only meaningful changes count: moves under 0.3 units do not.

## 7. Caretaker recognition

- **Uses:** the per-caretaker bond and trust levels, earned by that person's own care and kept on the server with their authenticated id.
- **When this caretaker opens the tank, each octopus responds:**
  - **Trust level 3, or level 2 for a show-off or watcher:** it comes to the glass.
  - **Level 1 or 2, with a den:** it goes to its den and watches from there.
  - **Level 0:** it carries on with what it was doing.
- Each phone shows its own caretaker's response, so the same octopus can greet Ana at the glass while watching Ben from its den.
- **What it never does:** no ranking, no penalty, no jealousy. Feeding permissions are unchanged; Emergent Life's "comes to the glass when you look at another animal" is still there.

## 8. Milestones

- Anniversaries count from when the animal joined the tank (`arrived`), not from `born`, which pauses while an animal is run down.
- **Days:** 7, 60, 90, 180 and 365, each only if under 95% of the species' lifespan. An octopus gets 7, 60 and 90.
- **What a line can contain, and only if recorded:** its arrival day, its first adventure, its favorite keepsake, its favorite place, its best friend.
- The existing 30-day age line, with its existing shells, now carries the same recorded facts.
- No new shells, no pop-ups. They go into the journal and the tank history.

## 9–10. Returning visitors and residents

- **Identity:** a visitor is identified by its species, the explicit rule the existing visitor memory already used: first visit, count, last visit, animals met, favorite spot.
- **An offer needs all of these:**
  - 3 or more visits;
  - room in the tank;
  - the species is not marked `resident: false`;
  - it has not been declined in the last 30 days;
  - no offer anywhere in the tank in the last 30 days.
- **Choosing:** tapping the visitor asks "Let it stay / Let it wander". There is no cost. The first answer decides; a second answer from another caretaker changes nothing, so there are no duplicate adoptions (tested).
- **Becoming a resident:** the visitor becomes an ordinary fish of the tank. It has the shared meals, the default lifespan, ageing, and the profile. It has no owner, so it is not anyone's own animal.
- **Limit:** the three visitor species are ordinary swimmers with full fish models, so the existing fish lifecycle applies to them. They have no species-specific breeding rules: a resident visitor follows the generic fish rules.

## 11. Eggs and pregnancy

- The existing eggs, the visible brood pouch, nursery and births are unchanged.
- **Added:** in the last part of his pregnancy (brood 0.8 or more), a father seahorse keeps to stems he knows (the roost choice) and does not drift off.
- **Not added:** a new egg visual, or a "quiet period" announcement.

## 12. Atmosphere

Reused as it was: time-of-day lighting, sky events (rain outside, full moon and so on, fictional, no location), and the rain effect. Nothing new was built.

## 13. Time capsules

- **Schedule:** by the tank's age. Day 1, 7, 30, then every 30 days. A closed tank only gets the capsule that is due when it is next looked at (tested).
- **Contents:** day, time, level, number of decorations and their kinds, keepsakes, every living animal (name, species, days in the tank, whether away), the counts per kind, and up to 6 history events since the previous capsule.
- **Photo:**
  - When a phone that is open receives the capsule's journal line within 6 hours, that phone (the director, in a shared tank) renders the tank itself as a 540-pixel JPEG. The photo is attached to that journal entry through the existing photo channel.
  - If nobody has the tank open, the capsule stays data only, and its card says "No photo was taken that day".
  - A photo is never taken later, so a capsule never shows the wrong day.
- **Sharing:** "Send as a postcard" uses the existing postcard maker.
- **Storage:**
  - capsule metadata about 0.4 KB each, at most 40 kept;
  - photos use the existing journal photo store, one small JPEG per capsule;
  - at 120 days, history and capsules came to about 10 KB per tank.

## 14. Tank History interface

- Crew, then Journal, then "Tank history ›".
- One chronological list, "Day N · icon · line".
- A capsule row opens a card with its photo (if any), a comparison table against the previous capsule (animals, decorations, keepsakes, level), who lived there, and what happened.
- The journal stays the main record; the history page lists selected lines from it, each kept once by a stable id.
- **Limit:** rows do not yet link through to the animal profile or the object.

## 15. Offline progression

- Everything here is long-term state resolved from server time: anniversaries, capsules, den records, recognition fading, visitor offers.
- Physical moments (carrying, searching, greeting) only happen on a phone running the tank, and are recorded only when they happen. Nothing is invented while the tank is closed.

## 16. Multiplayer

- **Server-authoritative:** all long-term state lives in the shared world and changes only through checked actions and the daily step.
- **Single writers:**
  - `keepMove` carries a report id;
  - `octoTouch` ignores a repeat within 45 seconds;
  - the visitor decision is first-answer-wins;
  - history entries have stable ids;
  - capsules are keyed by day;
  - photos come from one phone (the director's).
- **Restart:** the Biscuit proof restarts the server from its database file.
- **Hand-off between phones:** the reports are idempotent; covered by the earlier tests.

## 17. Performance

- **Server:** 2.4 ms per simulated tank-day, measured over all the rules at 120 days.
- **Saved tank:** about 27 KB at 120 days in a busy two-octopus tank, up from 15 KB, mostly the history and capsules.
- **Phone:** the greeting runs once per open, and the new decisions sit inside the existing every-70-to-160-second keepsake pass.
- **Not measured on a real iPhone.**

## 18. Automated tests

- **Unit, server and proof tests (`npm test`), all passing:**
  - 94 rule tests
  - 27 adventure tests
  - 22 Emergent Life tests
  - 12 Living History tests
  - the Biscuit proof, 9 checks
  - 87 server tests
- **Browser drills:**
  - `tools/biscuit_check.mjs`: 13 checks, passing.
  - `tools/living_check.mjs`: 7 checks, passing. Three octopuses greet the same caretaker three ways. A fish searches its moved boulder's old place twice, then settles. A third-visit visitor asks to stay, "Let it stay" makes it a swimming fish of the tank, and a capsule photo is taken from the tank.
  - Both are now in `tools/check_all.sh`.
- **Fixed along the way:**
  1. **A server test that depended on the time of day.** The night-visitor change from the last pass broke the push test when it ran in daytime UTC. It passed earlier only because the suite ran at night. The test now marks the visitor's night wait as done, and so does the developer's "visitor" action.
  2. **Anniversaries were counted from `born`.** `born` moves while an animal is run down; they now count from the new `arrived`.
  3. **Unanswered stay offers repeated on every visit.** The simulation showed about 30 offers per tank over 120 days. It is now at most one a month per tank, about 4 over 120 days.

## 19. Long-term simulation

`node tools/life_sim.mjs --seeds=2` runs 24 tanks: 4 populations × 3 activity levels × 2 seeds.

| Days | Anniversaries per tank | Capsules | History items | History and capsule data | Stay offers per tank | Journal lines a day | Duplicate life lines | Saved size |
|---|---|---|---|---|---|---|---|---|
| 7 | 4.3 | 2 | 7 | 2.4 KB | 0.1 | 5.6 | 0 | 12 KB |
| 30 | 7.1 | 3 | 13 | 4.5 KB | 1.0 | 2.8 | 0 | 17 KB |
| 60 | 12.3 | 4 | 19 | 7 KB | 2.0 | 2.3 | 0 | 21 KB |
| 120 | 18.1 | 6 | 27 | 10 KB | 4.0 | 2.0 | 0 | 27 KB |

- The stay-offer column is from the run after the once-a-month fix.
- "Duplicate life lines" counts repeats of Emergent Life lines only (habits, keepsake carrying, family). Other journal lines were not checked for repeats.
- The simulation does not answer stay offers, so it has no adoptions.
- Caretaker-recognition differences are behavior on the phone and are covered by the drill, not the simulation.
- These are simulated behaviors, not player data.

## 20–21. Known limitations and incomplete features

- **Den building:** keepsakes only. Octopuses do not move ordinary decorations to their den beyond the existing small-object rearranging.
- **Eggs and atmosphere:** only the seahorse late-pregnancy tweak was added. New egg visuals, discovery presentation, and weather or light changes were not built; the existing systems were kept.
- **Tank History:** rows do not link to profiles or objects yet.
- **Capsule photos:**
  - A capsule only gets a photo if someone has the tank open within 6 hours of it being made.
  - The photo is the screen's own view: no framing, no interface hidden beyond what the renderer draws.
- **Recognition:** shown for octopuses only. Fish and seahorses have no per-caretaker trust system to build on.
- **Resident visitors:** follow the generic fish rules, with no breeding rules of their own.
- **Not tested:** iPhone performance on a real device, and four phones at once with the new features. The existing four-caretaker server tests still pass.

## 22. Screenshots

The drills save them to `/tmp/biscuit/`:

| File | Shows |
|---|---|
| `1-climbing-out.png` | Biscuit climbing out |
| `2-climbing-back.png` | Biscuit climbing back in |
| `3-carrying.png` | Carrying the cap |
| `4-by-the-den.png` | The cap by the den |
| `5-thirty-days-later.png` | 30 days later |
| `6-tank-history.png` | The Tank History page |
| `7-time-capsule.png` | A time capsule card |

The drills also save `/tmp/living/1-greetings.png` and `/tmp/living/2-wants-to-stay.png`.

## 23. Recommended next

1. Link Tank History rows to the animal's profile and the object's story.
2. Frame capsule photos like postcards (the whole tank, interface hidden).
3. Den building with small decorations, through the existing octopus move system.
4. Per-caretaker recognition for seahorses: approach the glass for the person who feeds them.
5. A quiet visual cue for eggs about to hatch.

## Later changes (October)

- **Visitors who stay.** Whoever taps "Let it stay" names it. "Not now" decides nothing; only "Let it stay" or "Let it wander" counts, and the first answer wins. A kind that stayed never visits again. A resident is not sold: "Let it go" sends it back to the open water, and it may visit again later. Residents live 300–420 days, like other fish.
- **Full tank.** A visitor that would like to stay in a full tank says so in the journal, at most once a month, so the missing offer is explained.
- **History page.** It shows the newest 50 moments plus every birth, death, arrival and time capsule, with "Show older" for the rest. Trimming never removes those landmarks.
- **Missed capsules.** A capsule day that passed while nobody opened the tank leaves one note: "No time capsule for day N: the tank was quiet that week."
- **Capsule photos.** Each photo is sized to stay under the server's limit. Shared tanks keep every capsule photo (outside the 60-photo cleanup); solo tanks keep the first and the last eleven in their own store.
- **Own keepsakes.** An octopus never forgets a keepsake it found itself once it has come to know it.
