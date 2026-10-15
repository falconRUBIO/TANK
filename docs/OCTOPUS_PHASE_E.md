# Octopus Phase E: curiosity, play and discovery (evaluation only)

**Status: not implemented.** To be weighed after Phases A–D. This report covers only what exists today and what the smallest real step would be.

Roadmap order: **A** memory and awareness (done, visibility work in progress) → **B** drives replace the dice roll → **C** learning → **D** life history → **E** experimentation.

## 1. Interactions that already exist

| Interaction | Where | What really happens |
|---|---|---|
| Inspect a decoration | `fish3d.js` inspect errand, `fishmgr.aware` | Walks to it, wraps its arms round it (`onTouch`), and familiarity grows on the server |
| Move things | `fishmgr.planMove` + `beginTask` | `home` (carry its shell), `turn` (shove and rotate its shell), `push` (shove a rock), `build` (gather rocks into a shelter) |
| Carry and hold | `updateHold` | `carry`, `jar`, `twine` (arms with a partner) |
| Puzzle jar | rules `puzzle`, `jarAt` | Works a lid open over time |
| Crab hunt | `f.hunt` | Stalks, pounces, eats leg by leg |
| Toys | `toys.js`, rules `play`, `toyKind`, `favToy` | Bats the ball, chases bubbles, turns toward the light spot; a favorite is learned after 5 plays |
| Fish | `buddy`/`rival` memos, smack, follow | Follows a liked fish, swats an annoying one |
| Caretaker | glass greet, finger on the glass, trust/bond | Comes to the glass for people it knows |
| Camouflage and mimicry | camo, mimic states | Matches the ground; lion/snake/jelly impressions |

## 2. Object properties it can actually read

- **Every decoration:** `id`, `type`, `label`, `x`, `z`, `ry`, `at` (placed), `movedAt`, and the category (`PLANTS`, rocks, ornaments) from `DECOR_DEF`.
- **Derived on the phone:**
  - `reach` and `GRIP_R` (how far its arms go round it);
  - `roomFor` (whether it fits somewhere);
  - `COLLECTIBLE` (small enough to carry);
  - whether it is a den (`coconut`, `pot`);
  - whether it is movable (`rock`, `skull`, its own shell);
  - `sandH` and `slopeAt` (the ground it sits on).
- **From its memory:** familiarity `k`, visit count `n`, the last known place, `mv`, `gone`, and favorites.
- **Not available today:**
  - weight;
  - hollow or solid, beyond the den types;
  - texture;
  - whether a thing rolls or stacks;
  - what sits on top of what.

  Anything along these lines would need a small per-type table. There's no physics engine.

## 3. Behaviors that combine without rewriting movement

All of these reuse the existing errands (inspect, `beginTask`, `updateHold`, the den chain). None needs new locomotion.

- **Inspect, then try a push:** "does it move?" The existing `push` task, aimed at the thing it just inspected.
- **Carry a collectible to its den:** `carry` + `goDen`. That's the Phase C "things it carries home".
- **Ball near its den, then push it away or bring it in:** ball + push, or carry.
- **Hide in a new hollow thing:** inspect + the den chain, with a `pot` treated as a den candidate.
- **Use a rock as a lookout:** inspect + rest at that spot, with `watchPt` on the glass.

## 4. New persistent data needed (smallest set)

On `fish.mem`, bounded like the rest:

```
tries: { [decorId]: { push: 0|1, ok: 0|1, at } }   // what it has tried on a thing and whether it worked; at most 8
```

- Server-side duplicate protection, as `octoTouch` has.
- Nothing per frame, and nothing new on the decoration itself.

## 5. How experimentation could give visible individual differences

- The **same** experiment ("does it move?"), with personality deciding three things:
  - whether it tries at all (explorer and trickster often, homebody rarely);
  - what it does with the answer:
    - a collector carries a movable thing home;
    - a trickster shoves it at a fish;
    - a homebody walls its den with it.
  - whether it ever tries again.
- The result is remembered, so a caretaker sees one octopus that "always rearranges the rocks" and another that "never touches them". The difference comes from what happened, not from a hard-coded flag.

## 6. Performance and multiplayer risks

- **Performance:** low, if it runs inside the once-a-second `aware` loop like Phase A. Moving decorations already exists and is measured.
- **Multiplayer:** the real risk.
  - Experiments move decorations, and the director's move is broadcast already. Two directors must never both decide; the director model already ensures that.
  - A handoff mid-experiment must not double-move a thing. Use the existing `selfMoved` marker plus a server duplicate window.
- **Caretaker annoyance:** an octopus rearranging someone's careful layout. Limit it to movable types and a daily cap, and journal it so it's understood.

## 7. Smallest implementation with one genuinely new emergent behavior

**"Does it move?"**

1. After an octopus first handles a movable thing (`rock` or `skull`), its nature gives a chance to try one small shove, using the existing `push` task with a short distance.
2. The server records `tries[id] = { push: 1, ok }`.
3. Next time it decides something to do near that thing:
   - **it moved:** a collector or homebody is more likely to use it (a den wall or carry), a trickster more likely to shove it again;
   - **it didn't:** it never tries again.
4. Journal, once: *"Inky found out the rock can be pushed."*

That's about one new field, one branch in `aware`, and one server action, with all movement reused. What's emergent: the tank's layout slowly reflects **which octopus learned what**, and that differs between two octopuses in the same tank.
