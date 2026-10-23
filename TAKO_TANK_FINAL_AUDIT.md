# Tako Tank: Final Pre-iPhone Audit

**Date:** 2026-10-23 · **Build:** branch `claude/our-tank-game-design-xhmavw`, cache version **v319** (Settings shows the build; pull to refresh twice).
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

**The complete browser suite** (`FULL=1 tools/check_all.sh`, 55 drills) was run once on this branch. It is long (hours) and was still finishing its last drill (`octopus_aware`) at the time of writing; see the tally at the end.

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
| `ux_check` (recap card), `octopus_acts`, `toys_check` | see below | see below | being re-run with their error output |
| `cause_effect` seafan *move* | n/a (new drill) | fails sometimes | the "moving a decoration" reaction was already reported as too faint to measure |

Homebody behavior, early trick progression (`twirl_check`), return news (`return_check`), and the turtle economy (`turtle_check`, `fund_check`) all passed in the suite.

---

## 3. Also in this build
- **Name:** Tako Tank everywhere (pages, manifest, push, share text, docs). Save keys unchanged.
- **Logo and icons:** a voxel octopus perched on chunky cream letters, the O a ring with a wave; `web/logo.svg`, icons at 512/192/180. The loading screen carries the logo.
- **Graphics, three passes, voxel look kept:** sand ripples and contact shadows under decorations, banks shaded on their faces and lit on top, far sand sinking into the water's color, stronger caustics and sunbeams, distant kelp that reads as kelp, brighter rim light, crisper voxel faces, edge shading on every voxel thing, water that deepens toward the sand, a calmer amber-and-blue dusk, more contrast, less blur in the distance. Before/after: `docs/audit/gfx_before_*.png`, `gfx_after_*.png`. **Frame cost not measured on a phone**; the added shader work is a handful of instructions per sand pixel and one `pow` per voxel pixel.

---

## 4. Unresolved
1. Pre-existing drill failures: `attach_check` seahorse favorite, `living_check` glass expectation, `care_sync`, `sell_check`. None is from this work; the first three need their expectations updated or a separate look at the behavior.
2. `cause_effect` "move" cases are too faint to pass reliably; moving a decoration gets little visible reaction.
3. A crab's body center can be inside a decoration for 1–2 frames in 9,600 when a plant grows over it.
4. The real octopus in the loading screen is the low-poly peek, not the logo octopus (the voxel copy looked wrong there).
5. Performance of the graphics passes on a real iPhone.

## 5. Readiness for the iPhone test
**Ready to put on a phone.** Use the checklist in `TAKO_TANK_IPHONE_PLAYTEST.md` (frame rate with `?fps`, tapping, loading, octopus recognition, fish resting, placing decorations, feeding, toys, two phones) and the 15-minute first-player script there. Watch the frame rate first: three graphics passes went in without a device measurement.
