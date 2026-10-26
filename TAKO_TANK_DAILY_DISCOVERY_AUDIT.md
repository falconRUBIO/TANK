# Tako Tank: Daily Discovery and the Living Field Guide

Audit, build report and status. Date: October 26, 2026. Builds on v330 (client cache `ourtank-v380`).

## Summary

- **Built and tested:**
  - Daily Discovery: server-chosen and private until you answer, with an instant reveal, live results across phones and a 2-shell reward paid once per caretaker.
  - The Field Guide, brought back: learned, seen live, and happened while you were away.
  - The question-bank pipeline: drafts, a validator, a source verifier and an export.
- **Live question bank: 0 questions.** 608 questions are drafted and **none is verified**. This cloud environment refuses connections to the source sites (NOAA, Smithsonian, Monterey Bay Aquarium, WHOI, NCBI and the rest). With no source page readable, no question can pass verification. The game shows "New discoveries are being prepared" until verified questions exist. See `TAKO_TANK_TRIVIA_VERIFICATION.md`.
- **Release requirement met:** only verified questions can enter the daily rotation. The server enforces this on its own when it loads the bank, not just the release script.

## Phase A: what was already there

| System | State in v330 | Reused for |
|---|---|---|
| Trivia | None. `web/src/facts.js` has one "Did you know?" fact a day per animal, picked by date on the phone. It has no answers, and its sources include Wikipedia and fish-keeping guides. | Nothing. Those facts don't meet the new standard (see Decisions). |
| Field Guide | `FIELD` (24 pages) and `fieldHtml()` still exist. `witness()` returns false, so nothing has been written since it was retired. Old pages are kept in saves (`t.field`). | The same catalog and the same `t.field` record shape. |
| Per-animal behaviors | `DISCOVERIES` and `f.disc`, recorded once per animal: hitch, blend, eyes, dance, snick, camo, den, mimic, escape1, collector, puzzle and others. | Filling in what already happened in older tanks. |
| What a watching phone reports | The `observe`, `moment`, `octoMoment` and `crabShell` actions are sent only by the phone running the animals, and only while it is visible (`!document.hidden`). | Behaviors seen live. |
| Octopus adventures | `adventures.js` is deterministic and runs on the server for shared tanks. Its "go" events carry `jat`, the time it really happened. A trip outside the tank writes a journal line. Returns, keepsakes and "While you were away" all exist. | The escape behavior, with no change to how or when an octopus goes. |
| Journals | The tank journal plus each animal's own story (`story` events, `about` ids). | Field Guide links to an animal's story. |
| Multiplayer | WebSocket rooms, per-socket presence (`hidden`, `beat`), `online(tankId)`, the server's 30-second tick, and idempotent actions (the `transactions` table). | Shared results, "who was watching", and the one-time reward. |
| Daily boundary | The tank's day count runs from `createdAt`. The phone sends its own clock zone (`tzMin`). | The tank's zone, recorded once and then fixed. |
| Daily opening | A quiet start (`__quietUntil`), `modalFree()` queuing one pop-up at a time, and the tips (`tut`). | The card waits its turn, and never shows during the first-day tips. |

## Phase B: Daily Discovery (added)

**Data model** (`server/db.mjs`, created on startup without touching existing data):

| Table | Columns | Guarantees |
|---|---|---|
| `dd_tank` | tank_id, tz_min, since | The tank's day boundary, fixed the first time the tank is asked. A phone in another zone, or a changed clock, cannot move it. |
| `dd_day` | tank_id, day, qid, q, at | One question per tank-day, chosen under the write lock so phones opening at the same moment get the same one. `q` is a copy of the question as it was asked, so later edits to the bank can't change past results. **A unique index on (tank_id, qid) makes it impossible to ask a tank the same question twice.** |
| `dd_answer` | tank_id, day, user_id, qid, choice, correct, ts | The primary key is (tank, day, user), so answers are final. A second submit, whether from a reconnect, a reinstall or two phones at once, is ignored. |
| `transactions` (existing) | idem `dd:<day>` | The 2-shell reward. It is written in the same transaction as the answer and can only be paid once. |
| `dd_seen` | tank_id, user_id, beh, ts, fish, page | The Field Guide behaviors each caretaker saw happen live (the first time only). |

**What a phone receives (`server/discovery.mjs`, `view`):**
- **Before you answer:** the question id, the text, three choices, the category and difficulty. Never the answer, the explanation, the source or anyone's guess. A test scans every raw message for the explanation and evidence text.
- **After you answer:** your choice, whether it was right, the answer, the explanation and the source. Then every caretaker: their guess and whether it was right, or "Hasn't answered".
- **When another caretaker answers:** everyone who has already answered gets the new result straight away, without reopening the app.

**Choosing the question:**
- Only published questions are eligible: verified, passing every validator check, and not waiting on a look-alike review.
- A question already used by the tank is never eligible.
- The scorer keeps the category from repeating within 3 days, varies the difficulty, avoids the same animal or subject within 10 days, and spaces out behavior-linked questions.
- Ties are broken by an order specific to each tank.
- When the bank runs out, the phone is told "New discoveries are being prepared". Nothing is recycled.

**Expandable without an app update:**
- The bank is `server/discovery/bank.json`, or the file named in the `DISCOVERY_BANK` environment variable. The server re-reads it within a minute of it changing.
- Question ids are permanent. `tools/discovery_build.mjs` keeps every id and adds new ones at the end.

**On the phone (`web/src/ui.js`, `main.js`, `game.js`):**
- **Automatic opening:** on the first opening of the day, after the tank has loaded and the screen is free (never during the first-day tips), the Daily Discovery card comes up. "Not now" closes it for the day, and the question then waits as a row on Today. A test confirms that reopening the app the same day does not show it again.
- **The card:** the category, the question and three choices. After answering:
  - the right answer is marked green and your wrong guess red;
  - the explanation and a link to its source;
  - **In your tank**, a separate box, appears only when the question is linked to a behavior. It describes what the game does, worded as the game, not as science, and one line about your own tank: you saw it, it happened while you weren't watching, or which of your animals could show you.
  - everyone's guesses.
- **Solo tanks:** no Daily Discovery, because there is no server to keep the answer. The Field Guide still shows what happened.

## Phase C: the Field Guide (restored)

**Smallest safe restore:**
- `witness()` works again with the same `t.field[page] = { at, fish, name, text }` shape. It writes no journal line and no toast of its own, because the moment's own line already exists, so nothing is announced twice.
- It also emits a `{ beh, fish, jat }` event that only the server reads.
- New pages are tagged `v: 2` and **don't count toward the level score**, so levels go at exactly the pace they did before.
- Older tanks are filled in once from each animal's own record (`f.disc`, crab shell history), without a line of their own.

**Three states, kept apart:**
- **Learned** (per caretaker): you answered a question linked to that behavior. Stored server-side in `dd_answer` joined to `dd_day`.
- **Seen** (per caretaker): the behavior happened while your phone had the tank open in front of you. The server records it for the caretakers counted as "in the tank" at that moment (`online()`: visible, checked in within 50 seconds), and only when the event's own time is within 2 minutes of the present. An event worked out on catch-up, such as an escape overnight, is never "seen".
- **Happened** (the tank, shared): the first time it happened at all, from `t.field`. If you didn't see it, it reads "You weren't watching at the time".

The UI shows these as small chips on one list (Learned · Seen, or Learned · Happened), not as three progress bars.

**Behavior-to-fact mapping (`GUIDE` in `rules.js`):**

| Behavior | Animal | Pages (real game events) | Game's version is | What fires it |
|---|---|---|---|---|
| escape | octopus | escape | inspired (real octopuses escape tanks; the adventures and keepsakes are fiction) | the adventure engine's trip outside the tank |
| puzzle | octopus | puzzle | real (simplified) | an octopus works out the puzzle jar |
| camo | octopus | camo, kelp | real | the watching phone sees the color and texture match |
| ink | octopus | ink | real | the ink moment |
| den | octopus | den | real | the watching phone sees it tuck into its den |
| mimic | octopus | lion, jelly, snake, flat | inspired (the mimic octopus specifically) | impression moments |
| shell | hermit crab | shell | real | `crabShell`, moving into a bigger shell |
| seabirth | seahorse | seabirth | real | a seahorse father gives birth |
| hitch, blend, eyes, dance, snick | seahorse | same names | real | the watching phone reports each behavior |
| clean | sea turtle | clean | real | the cleaning-station moment |
| friend | fish | friend | inspired | two compatible fish become best friends |
| turtle-home | sea turtle | turtlehome | inspired (real turtles home to natal beaches; a released pet visiting is fiction) | a released turtle comes back to visit |

**Rule kept: trivia never drives the tank.** Nothing in the answer path touches animals or schedules (`server/discovery.mjs` only reads the world to pay the wallet). Tests prove an escape happens with no question asked or answered, and that answering marks only "learned".

## The octopus escape, using the real events

1. **Day 1:** the tank's question is about octopuses squeezing through gaps (tagged `escape`). Ana answers and learns it. Ben hasn't answered, so it isn't learned for him. Nothing changes in the tank.
2. **Days later:** Inky meets the adventure engine's existing conditions. Those are personality, the time since the last adventure, the weekly budget, not being hungry and the rest, all untouched. Inky turns restless and goes over the top (`adventures.js`, phase "go"). The journal gets "Inky squeezed through the gap by the lid and was gone." `witness('escape')` records that it happened.
3. **If Ana had the tank open in front of her at that moment,** the server stores "seen" for her alone. If it happened overnight, nobody saw it.
4. **Next morning:** "While you were away" reports the return and any keepsake, as it already did. Inky's story has the line. In the Field Guide, "The escape artist" shows "Learned Oct 26 · Happened Nov 2". The page reads "On November 2, Inky climbed out of the tank and went exploring. You weren't watching at the time.", with "Open Inky's story ›".

The trivia never chooses an escape date, and an escape never waits for the trivia.

## Tests (all run in this environment)

| Suite | Result |
|---|---|
| `server/discovery.test.mjs` (new): same question for the whole tank; a valid question for another tank; nothing revealed before answering (raw-message scan); a friend's guess hidden until you answer; reveal on answering; a later answer appears live; the wallet pays 2 per caretaker, once; answers final across phones and reconnects; two phones answering at once; a new caretaker joins on today's question; never a repeat (the database refuses one); a graceful message when the bank runs out; category rotation; a fixed day boundary across time zones; history kept in the database; learned per caretaker; seen live vs. happened afterwards; an escape with no trivia; older tanks filled in without changing the score; validator rejections; bank checks for duplicate ids, facts and texts and look-alike flags | 19 of 19 pass |
| `tools/discovery_check.mjs` (new, two phones in headless Chromium): the card opens by itself, "Not now", the Today row, no second interruption the same day, the same question on both phones, privacy, reveal, guesses, the In your tank box, the shells, live update, Field Guide learned and happened, the guide page | 17 of 17 pass |
| Existing suites (`npm test`): rules, adventures, life, history, biscuit, server | all pass |

Not done: anything on a real iPhone. No WebKit is available here, so the card has only been seen in headless Chromium at 390 px.

## Remaining issues

1. **No verified questions yet:** network access is the blocker (see the verification report).
2. **The search budget:** drafting is capped at 200 web searches per turn across all researchers. 6 categories came out short (kelp and plankton 11, sharks and rays 25, seabirds 27, crustaceans 29, marine mammals 37, mollusks 44). Finishing them takes another drafting round.
3. **"Seen" means the tank was on screen,** not that the person was looking at that corner of it. It is the best evidence the app has; a sheet covering the tank still counts.
4. **A phone left open across midnight** shows yesterday's question until it reconnects. Answering it gets "A new day has started" and the new question loads.

## Decisions needed before launch

1. **Network access** for the source domains, so questions can be verified (see the verification report for the list).
2. **Human sign-off:** should a person sign off each question's review (`review.by`), or is "the quote is on the page, plus a second reviewer agreeing it settles the answer" enough?
3. **`web/src/facts.js`** (the daily "Did you know?" in animal profiles) doesn't meet this standard: some facts cite Wikipedia and fish-keeping guides. Retire it, or put those facts through the same verifier?
4. **Reward:** 2 shells per caretaker a day is a new, small, steady income, which I built because you asked for it. With four caretakers that is up to 8 shells a day for the tank, and it lands in the economy you asked me not to change without approval. Please confirm.
