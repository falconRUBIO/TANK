# Tako Tank: Daily Discovery question bank verification report

Date: October 26, 2026. Bank: `server/discovery/bank.json`. Reviewable export: `TAKO_TANK_DISCOVERY_QUESTIONS.md` and `.csv`.

## The numbers

| | Count |
|---|---|
| Target | 700 |
| Drafted with a real source URL | **608** |
| **Independently verified (live)** | **0** |
| Requiring further review (held, with a reason) | 28 |
| Unverified, waiting for the source check | 569 |
| Rejected | 11 |
| Duplicates found and removed | 8 (2 more look-alike pairs were reviewed and kept as different facts) |
| Corrected by review (old wording kept in each question's `corrections`) | 88 |
| Linked to a Field Guide behavior | 58 of the 597 not rejected |

**None of the 700 questions is ready, and none is verified. The live daily rotation has 0 questions.** The game says "New discoveries are being prepared" until some pass. Two separate limits caused this:

1. **The source pages can't be opened from this environment.**
   - The cloud environment's network policy refuses connections to fisheries.noaa.gov, oceanservice.noaa.gov, ocean.si.edu, montereybayaquarium.org, whoi.edu, nhm.ac.uk, aquariumofpacific.org and the rest, with "CONNECT tunnel failed, response 403". WebFetch can't resolve them either.
   - So no question's evidence can be checked against its page. The verifier was run, and every page was refused.
   - **No question was marked verified on the strength of a search summary or a model's knowledge.**
2. **The shared web-search budget, 200 searches per turn across every researcher, ran out partway through drafting.**
   - 8 categories reached 50 to 55 questions. 6 came up short: kelp and plankton 11, sharks and rays 25, seabirds 27, crustaceans 29, marine mammals 37, mollusks 44.
   - Their missing topics are listed below.
   - Nothing was invented to fill the gap.

## How a question becomes verified (and why nothing has yet)

A question is **verified** only when **all** of these are true. The validator enforces them, and the server won't publish a question unless it passes the same validator:

1. **Its source is reputable and on a secure link.** The source is an https page from a reputable institution, and the URL came from a real search result, never typed from memory.
2. **The page really contains the quote.** `tools/discovery_verify.mjs --check` fetches the page and finds the stored `evidence` quote on it, word for word after normalizing spaces and punctuation. This is a mechanical check: the words are there or they aren't. The page fetch date becomes `verifiedAt`.
3. **A reviewer has signed off.** The reviewer recorded (`review.ok`) that the quote settles the answer and that the other two choices are wrong.

The workflow once the network allows it:
1. `--candidates` fetches each page and lists the sentences most likely to settle the question.
2. A reviewer copies the exact supporting sentence into `evidence` and records `review`.
3. `--check` confirms the words are on the page and marks the question verified.
4. A page that can't be read on a later check stops the question being verified. It doesn't stay verified on old evidence.

**To unblock it:** in the cloud environment settings (the environment menu in the session title bar, then **Edit**, then **Network access**), allow at least these domains:
- noaa.gov
- si.edu
- montereybayaquarium.org
- whoi.edu
- mbari.org
- nhm.ac.uk
- australian.museum
- aquariumofpacific.org
- ncbi.nlm.nih.gov
- nps.gov
- fws.gov
- floridamuseum.ufl.edu
- tepapa.govt.nz
- seattleaquarium.org
- georgiaaquarium.org
- neaq.org
- sheddaquarium.org

Or choose a broader access level.

## What was done to the 608 drafts

1. **Research (14 researchers, one per category).**
   - Each worked to `server/discovery/DRAFTING_BRIEF.md`: one fact per question, a fact id, no records or changing statistics, no "always/never" without support, species named, plausible but clearly wrong choices, and a `risk` flag for what the checker must look at.
   - Every source URL came from a search result in this session.
   - Every researcher saw only search summaries, never the pages, and each said so. Each question carries a `searchNote` (what the search showed, not a quote), and 278 have a second independent source.
2. **Automated checks (`tools/discovery_validate.mjs`).**
   - **Structure:** ids, fact ids, exactly three choices, no repeated choices, a valid answer index, an explanation, category, difficulty and status.
   - **Sources:** https only.
   - **Duplicates:** repeated ids, facts and question text.
   - **Look-alikes:** question-and-answer and explanation word overlap across the whole bank, and the same subject with the same answer.
   - **Wording:** absolute words and negative questions.
   - **Result:** 0 bank errors and 0 unreviewed look-alike pairs. The 2 flagged pairs were reviewed as different facts (`reviewed.json`).
   - 30 wording warnings are recorded for the source check.
3. **Independent scientific review (4 reviewers who didn't write the questions, working to `REVIEW_BRIEF.md`).**
   - Every question got a verdict: ok, fix, review or reject.
   - This review was from knowledge only, **so it is not verification**. It only decided what to correct, hold or throw out before the source check.
   - Results: 483 ok, 88 fixed, 26 held for review, 11 rejected (8 of them duplicates).
   - 2 more questions are held because their source is an http address.

## Corrections made (examples; all 88 are logged in the bank with the old wording)

- **dd-0013, giant Pacific octopus suckers:** the explanation contradicted itself (8 × ~240 is not "more than 2,000"), and per-arm counts vary by source. The answer is now a range ("a couple hundred per arm, roughly 2,000 in all").
- **dd-0262, nurse sharks "breathing through spiracles":** nurse sharks mostly pump water through the mouth. Breathing through the spiracle is a habit of angel sharks, skates and rays. The question was rewritten to ask what a spiracle is for.
- **dd-0251, hammerhead heads:** the claim of "more electric-sensing pores than other sharks" isn't what the research found. The pores are spread over a wider area. The answer was corrected.
- **dd-0549, colossal squid:** two errors in the explanation. The glass squid family has about 60 species, not 20, and another member (*Galiteuthis*) also has hooks. It now says "the only member of that family with hooks on its arms".
- **dd-0334, sea fans:** the original said gorgonin supports "soft corals" in general. It supports only sea fans and sea whips; other soft corals use mineral spicules. The question was narrowed.
- **dd-0243, sea krait nests:** "on or just under the sand" became "on land, out of the water". The few nests found were in rock crevices.
- **dd-0152, the false cleanerfish:** the wrong answer "Hide from predatory fish" could be argued correct, so it was replaced.
- **dd-0012, octopus mothers:** the original implied she declines right after laying. She guards the eggs for months and dies around when they hatch.
- **dd-0462, sea star "blood":** the premise was shaky, so the question was rewritten around the water vascular system.
- **Others:**
  - Outdated names: *Lophelia pertusa* → *Desmophyllum pertusum*.
  - Wrong terms: urchin "roe" → gonads; the flower urchin is "venomous", not "toxic"; anemone fighting "tentacles" → acrorhagi.
  - Records and recent-date wording softened, and explanations trimmed of extra claims the question didn't need.

## Rejected (11)

| Id | Question (short) | Why |
|---|---|---|
| dd-0188 | Ocean sunfish diet from one DNA study | A trick built on a single study that runs against the established view. "Jellyfish" is a defensible answer, and it contradicted dd-0187. |
| dd-0393 | By-the-wind sailor "handedness" by hemisphere | Disputed and depends on definitions. Sources contradict each other, and both forms occur in both hemispheres. |
| dd-0512 | Schayer's brittle star's nickname | Too obscure, and guessable for the wrong reason ("snake star" is a general nickname). |
| dd-0083, 0220, 0230, 0252, 0394, 0413, 0492, 0566 | Duplicates of dd-0079, 0219, 0228, 0249, 0392, 0412, 0483, 0567 | Each tests the same underlying fact as the question kept. Two of them also gave away the other question's answer. |

## Held for further review (28): examples

- **dd-0031:** where the blue-ringed octopus's toxin comes from is not settled (bacteria vs. its own tissues).
- **dd-0274:** whether the narwhal tusk is a canine or an incisor; references disagree.
- **dd-0293:** whether whale lice mainly eat algae or sloughed whale skin.
- **dd-0351:** where the giant green anemone's color comes from is disputed.
- **dd-0542:** possibly two defensible answers (two different 2012 giant squid filmings).
- **dd-0009:** "lemon-sized hole" for a giant Pacific octopus; sources give very different sizes.
- Recent single studies the reviewer couldn't confirm: dd-0030, 0044, 0085, 0088, 0477, 0525, 0597.
- Species not named: dd-0480 ("deep-sea sunstar"), dd-0513 ("spiny brittle star").
- dd-0383 and dd-0595: the source is http only.

## Source coverage (597 not rejected; primary source)

| Source group | Questions |
|---|---|
| NOAA (Fisheries, Ocean Service, Sanctuaries, Ocean Exploration, library) | 141 |
| Peer-reviewed journals (PubMed Central, PubMed, PLOS and others) | 114 |
| Natural history museums (NHM London, Australian Museum, Florida Museum, Te Papa, AMNH, National Zoo) | 86 |
| Smithsonian Ocean | 71 |
| Other aquariums (Aquarium of the Pacific, Seattle, Georgia, New England, Shedd) | 48 |
| Other government agencies (NPS, FWS, state and Australian governments) | 39 |
| Monterey Bay Aquarium | 36 |
| Universities | 23 |
| Other (Audubon, Cornell All About Birds, Nobel Prize, conservancies) | 22 |
| MBARI | 9 |
| WHOI | 8 |

278 questions have a second, independent source. Risk flags set for the checker: 75 numeric, 81 surprising, 132 species-specific, 25 disputed-check.

## Category distribution (not rejected)

| Category | Questions | Short of 50 because the search budget ran out (topics still to cover) |
|---|---|---|
| Cephalopods | 50 | |
| Seahorses | 54 | |
| Fish | 54 | |
| Sea turtles and marine reptiles | 53 | |
| Coral reefs | 55 | |
| Jellies | 52 | |
| Echinoderms | 53 | |
| Deep sea | 54 | |
| Mollusks | 44 | mussels, scallop swimming, pearls, sea butterflies |
| Marine mammals | 37 | seals, sea lions, walruses, manatees, dugongs, sea otters, polar bears |
| Crustaceans | 29 | true crabs, lobsters, krill, copepods |
| Seabirds | 27 | shearwaters, petrels, terns, cormorants |
| Sharks and rays | 24 | mantas, stingrays, skates, electric rays, chimaeras |
| Kelp and plankton | 11 | seagrass, mangroves, phytoplankton, zooplankton, bioluminescence |

**Difficulty (not rejected):** 133 easy, 307 medium, 157 hard. The correct answer sits in position A, B and C about equally often (203, 203, 202 across the drafts).

**Behavior links (58):**

| Behavior | Questions |
|---|---|
| clean | 14 |
| ink | 5 |
| shell | 5 |
| camo | 4 |
| seabirth | 4 |
| snick | 4 |
| dance | 4 |
| turtle-home | 4 |
| mimic | 3 |
| den | 3 |
| hitch | 3 |
| escape | 2 |
| eyes | 1 |
| blend | 1 |
| friend | 1 |
| puzzle | 0 (its search was refused) |

That is short of the 100 to 150 target. The missing octopus puzzle questions and more escape questions are the first thing to add.

## Automated test results

| Test | Result |
|---|---|
| `tools/discovery_validate.mjs` on the bank | 608 entries; 0 bank errors; 0 unreviewed look-alikes; 0 published |
| `server/discovery.test.mjs` | 19 of 19 pass. Covers validator rejections (bad id, two or four choices, repeated choices, a bad answer index, an empty explanation, a bad URL, an unknown category or difficulty, verified without evidence, verification or review, a future date, an unknown behavior, a missing fact id), repeated ids, facts and texts, a look-alike held until reviewed, daily selection, concurrent submissions, answer privacy, the reveal, permanent no-repeat, exhaustion, reconnection, new caretakers, time zones, learned, seen and happened, and an escape with no trivia |
| `tools/discovery_check.mjs` (two phones, headless Chromium, test-fixture question) | 17 of 17 pass |
| `tools/discovery_verify.mjs --candidates` (3 sample questions) | 0 pages read; all 3 refused by the network policy (403) |
| Existing `npm test` suites | all pass |

## What happens next (once the network allows it)

1. Run `node tools/discovery_verify.mjs --candidates` to fetch every page and list the likely supporting sentences.
2. Review each question: copy the exact sentence into `evidence`, record `review` (ok, plus who), and fix or reject anything the page doesn't support. Check the `risk` flags and the 28 held items first.
3. Run `node tools/discovery_verify.mjs --check`, then `node tools/discovery_validate.mjs`. Only what passes goes live; the server picks up the bank file without a restart.
4. Draft the missing topics above (about 100 questions) with fresh search budget, and put them through the same steps.
5. Report the real verified count. If it is under 700, that number is the launch number.
