# Tako Tank: when neglect kills

Before this change, an animal left without care became very unwell and stayed that way for good. It never died, so long neglect cost nothing. Now neglect can kill, but only slowly, with warnings, and with guard rails so that a holiday or a quiet friend in a shared tank is never punished.

## The timeline

Time only counts while the animal is really neglected. It has to be hungry with nobody feeding it for 30 hours, or sitting in dirty water. Any care wins the time back twice as fast as neglect costs it.

| Neglected for | What happens | What the player sees |
|---|---|---|
| 2 days | Tired: paler, slower, stops growing | Journal line and toast: "looks tired" |
| 3 days | Very unwell: slow, keeps to itself, eats less | Warning, sent as a push notification: "is very unwell" |
| 6 days | **Last chance** | Push notification: "will not last another day without care". The status line says what to bring today: a crab, mysis shrimp, or food, plus fresh water. **Anyone in the crew may now feed it**, not just its own caretaker. |
| 7 days | **It dies** | Push notification: "has died". Goodbye card: "went too long without food and clean water… Its body is still in the tank", with **Remove from the tank** and **Later** buttons |

Notifications never go out between 10pm and 8am, so a warning sent once could be lost. The two that matter most are therefore sent from the tank's state and repeated until they get through:
- "‹name› will not last another day without care" goes to everyone away, again 12 hours later if the animal is still fading.
- "‹name› has died. Its body is still in the tank…" goes out once, six hours after the death, while the body is still there.

Both are high priority, so lighter news never uses up the day's notification allowance before them. Coming back to the game, a death or a last-day warning is the first line under "While you were away", and the Care row "Sea life health" says "‹name› will not last another day without care".

Because of the 30-hour wait, a player who feeds the tank and leaves loses nobody in a week. A death needs roughly eight days with no care at all.

## The body stays until someone removes it

- **Fish and turtles** float belly-up at the surface.
- **Octopuses** sink limp and pale to the sand.
- **Seahorses** sink to the sand and lie on their side.
- **Crabs** stay drawn into their shell on the sand.

While it is there, the body makes the water dirty faster, so the other animals are at risk too. That is the reason to act.

There are three ways to remove it:
1. **Care, Needs you:** a row reading "**Remove ‹name› from the tank**" with a **Remove** button. It stays until someone removes the body.
2. Tap the body in the tank. Its card has a **Remove from the tank** button.
3. The goodbye card's **Remove from the tank** button.

Anyone in the crew may remove it, and only one removal counts. The status line says "‹name› has died. Remove them from the tank in Care."

Every death is kept under **Remembered** in the Journal, with the animal's milestones, best friend, family and favorite place. The memorial records how it died: "a full life, to old age" or "it went too long without care", and who removed it.

## Who never dies of neglect

These animals hold on and stay very unwell until someone cares for them:

- **An expecting seahorse father.** His young would die with him.
- **An octopus mother guarding eggs in her den.**
- **A nursery baby.** Its father looks after it until you choose which one stays.
- **An animal out on an adventure.** Time does not touch it while it is away.
- **The last animal in the tank.** A tank is never left empty.

## Guard rails

- No deaths in a tank's first three days.
- At most one death a day, so a chain reaction through the dirty water stays slow and visible.
- In a shared tank, an octopus or seahorse is normally fed only by its own caretaker. On its last day anyone may feed it, so nobody has to watch a friend's animal die. Fish share the tank's food, so anyone could always feed them.
- A tank can turn deaths off entirely (`flags.mortality = false`). The rules tests use this for tanks that sit unfed for weeks while testing something else.

## By kind of sea life

| Sea life | What counts as neglect | When it dies | Its body |
|---|---|---|---|
| Fish | No tank food for 30 hours, or dirty water | Week 1 | Floats belly-up |
| Octopus | No crab from its caretaker for 30 hours (or its arrival), or dirty water | Week 1, unless she is guarding eggs in her den | Sinks to the sand |
| Seahorse | No mysis shrimp for 30 hours, or dirty water | Week 1, unless he is expecting | Sinks to the sand, on its side |
| Crab | Like fish (tank food, water) | Week 1 | Stays in its shell |
| Turtle | Like fish | Week 1 | Floats |
| Nursery baby | Like fish | Never; it holds on | n/a |
| Visitors | n/a | n/a | They are not yours |

## Where it lives in the code

**Rules** (`web/src/game/rules.js`):
- `AIL_LAST` (6 days) and `AIL_DEATH` (7 days).
- `holdsOn(t, f)`: who never dies of neglect.
- The death in `tendFish`: memorial with `neglect: true`, and a floater carrying its look and its crab shell.
- `canFeedOwn`: anyone may feed on the last day.

**Screens** (`web/src/ui.js`):
- The Care row.
- The last-chance status line.
- The goodbye card.
- The memorial wording.

**The tank** (`web/src/w3/fish3d.js` `deadUpdate`; `web/src/w3/fishmgr.js` builds a crab's body as a crab):
- How each kind lies.

**Tests:**
- `rules.test.mjs`:
  - week-long timeline;
  - one death a day;
  - the last animal survives;
  - who holds on;
  - a new tank loses nobody;
  - turning deaths off;
  - the octopus;
  - anyone feeds on the last day.
- `server/test.mjs`: on the server, and a week away loses nobody.
- `tools/neglect_death_check.mjs` (nightly):
  - the real game, end to end;
  - the Care row;
  - Remove;
  - how each kind lies.
