# Tako Tank: Final Pre-iPhone Audit

**Date:** 2026-10-23 · **Build:** branch `claude/our-tank-game-design-xhmavw`, cache version **v324** (Settings shows the build; pull to refresh twice).
**No physical iPhone and no real player have been tested yet.** Everything below is from the code, unit tests and headless-browser drills (about 0.3 frames per second, so timings and smoothness on screen are unknown).

---

## 1. Animal attachment fixes

### Octopus keepsake pickup (fixed)
- **The problem:** the octopus walks to a shell and arrives "working at it", but on a far shell its walk stops where the sand lets it stand, about 1.3 away. Pickup needed 1.2. It then timed out and tried again.
- **The fix:** the pickup already allowed a 2.0 reach *at its den* when it had arrived and was working; the same rule now applies at the shell (1.8 when arrived and working on that shell). Passing by still needs 1.2, so there is no pickup from a distance.
- **No repeat pickups:** after it drops or sets a shell down, it leaves that shell alone for two minutes. It used to go straight back for it (19 of 30 chances in the drill; now 0).
- **Measured** (`keep_reach`, `keepsake_check`): arrives-and-picks-up at 1.3; no pickup at 1.5 while merely passing; no re-grab after a drop; 6 of 6 starting places reached and carried; 4–5 of 6 end by the den (the other one or two are set down short, as before this change).

### Seahorse pair attachment (small change; measured)
- **The change:** when a mated seahorse picks its next holdfast, a stem near its mate is no longer dropped by the "stay in your home range" filter, as its favorite stem already wasn't. So a pair that drifted apart can find each other again across the tank.
- **Measured against singles, 8 seeds each, same scenario:** pair mean distance 3.29 with the change vs 3.54 without (singles 4.14 / 3.92). The pair was closer than the singles in 7 of 8 seeds with the change and 4 of 8 without. **This is a modest effect, not a transformation.** The morning meeting dance (the big visible pair moment) is unchanged.
- **Unsuccessful case, reported:** the `attach_check` "saved favorite holdfast" check fails **on the old code too** (2 of 2 runs each). It is pre-existing and not caused by this work.

### Hermit crab navigation (new)
- Crabs plan routes over a 0.2 grid of clear-sand cells (A*), so they walk round the pot, rocks and caves instead of into them. From inside something they go straight out first. A climb's foot and a shell's "front" are moved to clear sand if they are not. Only rocks and wood are climbed; never a pot, a coconut den or an urchin.
- **Measured** (`crab_audit`, four crabs, two simulated minutes of their own lives, three runs): **5–13 route plans per crab per minute**, **1.5–5.5 ms each** (worst single plan 8–47 ms, the high values while three other browsers ran on the same machine); the crab's body center inside a decoration in **0–2 of 9,600 frames** (a plant growing over a resting crab); a route from clear sand **never passes through solid** (a walled-off target stops at the last clear cell; "expensive" solid cells are only used to get out of something); a boulder, rubble or removed rock mid-walk: no clipping beyond the 3 s it takes to walk out from under a boulder dropped on it, no stall over 3 s, it still arrives.
- **Finger play:** crabs come along the sand after the spot under your finger. Bold and explorer crabs keep within 0.4–0.6; timid and homebody hang 1.2–2.1 back on purpose; 5–14 route plans in a 24-point drag (a replan only when the finger moves more than 0.4 or something blocks the way).

---

## 2. Regression results (all 95 unit tests pass: `npm test`)

**The complete browser suite** (`FULL=1 tools/check_all.sh`, 60 drills) was run once on this branch, before the visual pass below, with three browsers sharing one machine. **Result: 47 passed, 13 failed** (`ux_check octopus_den life_check2 living_check care_sync sell_check octopus_acts bonds_check toys_check crab_check cause_effect attach_check dev_lifecycle`). That tally is from one loaded run; the per-drill verdicts below are what matters.

Every failure it reported was re-run alone on this code and on the code from before this work (commit `c9c7815`), to separate what this work broke from what was already failing:

| Drill | Old code | New code (after fixes) | Verdict |
|---|---|---|---|
| `octopus_den` | passes | **passes** (11/11 alone) | the suite failure was load: three browsers at once |
| `life_check2` (curious fish turns back) | passes | failed, **now passes** | mine: a fish on its way to rest lost its whims. Fixed. |
| `attach_check` homebody at den | passes (0.62) | failed (0.31), **now passes (0.82–0.95)** | mine: the new "turn to face you" also fired on its idle glance and drew it to the glass. Now only for a greeting or a tap. |
| `attach_check` seahorse favorite holdfast | **fails** | fails | pre-existing |
| `attach_check` pair closer than singles | varies | varies | noisy either way (see section 1) |
| `living_check` (Ada comes to the glass) | **fails** | fails | expects the old frequent glass visit; the 1-in-100 visit was your request. Test to update. |
| `care_sync`, `sell_check` ("Care has the tank upkeep row and a Health list") | **fail** | fail | pre-existing wording drift from earlier menu passes |
| `ux_check` (recap card; "the moment you saw is kept with a photo") | **fails** (same 2) | fails (same 2) | pre-existing |
| `toys_check` ("Toy box shows the ball… locked ones are not shown as buttons") | **same layout** | fails at its first check | the drill sets level 8, where every toy is open, then expects Bubbles locked and a "next toy" line the Toy box has not had since the Care menu pass. Test drift, not a game bug; the rest of the drill never runs. |
| `octopus_acts` ("eight minutes alone: four different things, six times or more") | **fails** (3 acts: jelly, grab, follow) | fails (0 acts in the loaded suite run; alone: see wait note) | pre-existing on the old code too; the suite run's empty count was load (the 8-minute sim ran at a fraction of real time). |
| `crab_check` (whole shell move played) | not re-run | fails in the suite | the swap sequence ran `inspect > backoff > idle > walk > inspect > swap/align > …`: a backoff step first, consistent with the new route planner moving the crab to clear sand before the swap. Needs its own look; the swap itself completes. |
| `bonds_check`, `dev_lifecycle` | not re-run | failed in the suite with no assertion line (timed out) | load; not re-run alone yet |
| `cause_effect` seafan *move* | n/a (new drill) | fails sometimes | the "moving a decoration" reaction was already reported as too faint to measure |

Homebody behavior, early trick progression (`twirl_check`), return news (`return_check`), and the turtle economy (`turtle_check`, `fund_check`) all passed in the suite.

---

## 3. Also in this build
- **Name:** Tako Tank everywhere (pages, manifest, push, share text, docs). Save keys unchanged.
- **Logo and icons:** a voxel octopus perched on chunky cream letters, the O a ring with a wave; `web/logo.svg`, icons at 512/192/180. The loading screen carries the logo.
- **Animal finish (designs unchanged):** a wet sheen on every animal's material, a slow mottling across each body so no patch of one color sits flat, warm light on backs and cooler bellies, deeper baked shade in the creases between fins and body. Eyes and glowing parts untouched. Sheet: `docs/audit/animals_before.png` / `animals_after.png` (the yellow bar through each fish is a hidden helper part the sheet tool draws; it is not in the game); close-up `docs/audit/fish_closeup.png`.
- **Visual pass 2–8 (this build):** caustic light now plays over every animal and decoration, not only the sand (same caustic texture, sampled in world space, strongest on upward faces, fading with depth and dimming with the time of day); thin fins are translucent (74%, alpha-hashed so it stays pixel-crisp; eyes and glowing parts never thinned); a soft shadow disc on the sand under each swimming animal that grows and fades with height (gone above 7 units; none under seahorses, visitors, fry, puppets or a hunting octopus; measured: 0.47 opacity at 0.5 up, 0.10 at 4, hidden at 8); two slow haze bands in the midwater; a glint on each bubble; shop and card thumbnails rendered from every species' real 3D model (sheet: all 29 render, no helper-bar artifact, 6.2 s for all of them on first draw in software GL, cached after); a faint glass streak in the top corner. Shader compile check: 0 errors. Screenshots `docs/audit/gfx_after_{afternoon,evening,morning,night}.png`.
- **Graphics, three passes, voxel look kept:** sand ripples and contact shadows under decorations, banks shaded on their faces and lit on top, far sand sinking into the water's color, stronger caustics and sunbeams, distant kelp that reads as kelp, brighter rim light, crisper voxel faces, edge shading on every voxel thing, water that deepens toward the sand, a calmer amber-and-blue dusk, more contrast, less blur in the distance. Before/after: `docs/audit/gfx_before_*.png`, `gfx_after_*.png`. **Frame cost not measured on a phone**; the added shader work is a handful of instructions per sand pixel and one `pow` per voxel pixel.

---

## 3a. Taken back out, and what moved where (this build)
- **Translucent fins: removed.** The dithered see-through read as film grain; fins are solid again (the per-voxel flag and the shader branch are gone, nothing else changed).
- **Haze bands and the glass streak: removed.** No more streaks in the midwater or the corner.
- **The octopus's time on each level:** it now keeps a fading tally of how long it has spent on each of the three sand levels and favors the ones it has been on least when it picks where to roam (and roams instead of visiting a decoration when it has been on the same level for most of the last few minutes). Ten simulated minutes, the lived-in tank: **front 31 → 24 %, middle 45 → 36 %, rear 24 → 40 %** (one run each; the octopus's type is random per run, so the exact split varies). Second pass, after it still read as living on the middle terrace: a roam jet now steers down onto the spot it chose (before, it landed wherever the glide ran out, which was mostly the middle), and once more than half its recent time has been on one level its rests there are cut to 8 s (its den, a nap, a hunger beg and any job are left alone). Three more ten-minute runs: middle **32 %, 18 %, 37 %** (front 51/29/63, rear 17/52/0: the third was a hungry octopus begging at the glass for half the run). The middle terrace is no longer where it spends most of its time in any run.
- **Menus and cards, one polish pass** (`docs/audit/menus_*`): every sheet, card and preview shares one glass material, cooler and more opaque, so the sand behind never turns it olive; the coach tip steps aside while a sheet or card is up (it used to sit over the Feed title); a shop preview fades the shop behind it instead of the two reading through each other; the toy box is a row per toy with two lines of text at most (the three narrow columns overflowed); a shop tag such as "carries sapphire" sits on its own line inside its card; milestones are a scrollable row of readable tiles instead of seven cramped columns; section labels share one size, weight and letter-spacing; the Feed screen is only as tall as what it shows; the strip behind the grab handle is the same glass, not a darker band.

## 3b. Movement pass (how everything moves)
Measured with the new `tools/motion_check.mjs` (the same scenario on the old code and this one, 20 simulation steps a second):
- **Octopus:** its turning now has weight: angular speed eases up and down and is capped (1.9 rad/s crawling or resting, 2.4 jetting, 2.9 for a squirt or pounce). Before, a turn could snap at **8–16 rad/s** in a frame; now **max 2.4–2.9**, 0 frames over 2.5 rad/s in 4 minutes (was 84–136). A jet pulse is a push that builds and fades over 0.45 s with the mantle squeeze, not a kick: peak acceleration **7.5** (was **44.6**). It eases into a crawl goal over the last body length instead of walking at full pace and stopping dead. Arms are posed 30 times a second (20 at rest), up from 20/15, so they keep up with the body.
- **Seahorses:** before a greeting dance each now swims to its own place by the plant facing the way it goes, and the circling waits until both are there (before, each slid sideways across the tank after a circle that was already turning: heading error **1.2–1.3 rad**, now **0.19–0.22**; the dance starts when both arrive, 5–6 s, instead of at once). Between stems a seahorse turns to face its way within half a second (mean heading error while swimming **0.10**, was **0.54–0.86**), turns side-on to its stem only in the last little glide, and is eased onto the grip at its own pace, not drawn in.
- **Fish and turtles:** turns have the same weight (fish capped at 3.2 rad/s, 7 when fleeing; turtles 1.3): fish max **3.19** (was 6.2, 46 frames over), turtle max **1.30** (was 6.7, 143 frames over). Two overlapping animals are eased apart at no more than 1.6 units/s, and whatever pushes an animal out of a rock or a clump of leaves moves it no more than a nudge per frame (worst one-frame acceleration for a fish **33**, was **148**; turtle **41**, was **96**).
- **Crabs:** turning capped at 3.6 rad/s with ease-in (max **3.59**, was **12.5**, 335 frames over); each burst of steps starts and stops over about a tenth of a second rather than between frames.
- **Not verified on screen:** all of this is from the simulation numbers and the drills (`octopus_den`, `habitat_check`, `motion_check` pass); the headless browser cannot show motion. The iPhone test is where it will be judged.

## 4. Unresolved
1. Pre-existing drill failures: `attach_check` seahorse favorite, `living_check` glass expectation, `care_sync`, `sell_check`. None is from this work; the first three need their expectations updated or a separate look at the behavior.
2. `cause_effect` "move" cases are too faint to pass reliably; moving a decoration gets little visible reaction.
3. A crab's body center can be inside a decoration for 1–2 frames in 9,600 when a plant grows over it.
4. The real octopus in the loading screen is the low-poly peek, not the logo octopus (the voxel copy looked wrong there).
5. Performance of the graphics passes on a real iPhone: the voxel shader now also samples one texture per pixel; the first Shop open builds every thumbnail from its 3D model (seconds in software GL here; unmeasured on a phone).
6. Drill drift to fix in the tests, not the game: `toys_check` Toy box check, `living_check` glass visit, `care_sync`/`sell_check` wording, `ux_check` recap/photo.
7. `crab_check` and `octopus_acts` need a quiet, unloaded re-run each; `bonds_check` and `dev_lifecycle` timed out under load and have not been re-run.

## 5. Readiness for the iPhone test
**Ready to put on a phone.** Use the checklist in `TAKO_TANK_IPHONE_PLAYTEST.md` (frame rate with `?fps`, tapping, loading, octopus recognition, fish resting, placing decorations, feeding, toys, two phones) and the 15-minute first-player script there. Watch the frame rate first: three graphics passes went in without a device measurement.
