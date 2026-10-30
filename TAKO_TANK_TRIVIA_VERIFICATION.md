# Tako Tank: Daily Discovery and fact verification report

Updated October 26, 2026. Question bank: `server/discovery/bank.json`. Profile facts: `server/discovery/facts.json`. Reviewable export: `TAKO_TANK_DISCOVERY_QUESTIONS.md` and `.csv`. Sample for a human quality check: `TAKO_TANK_DISCOVERY_QC_SAMPLE.md`.

## Status in one line

**Scientific verification has not started: no source page could be checked.** This environment's network policy still refuses every science site (the connection is refused with a 403; checked again today). The live daily rotation therefore has **0 questions**, and the game says "New discoveries are being prepared". Everything that can be done offline has been done.

## The question bank

| | Count |
|---|---|
| Target | 700 |
| Drafted, each tied to a real search-result URL | 608 |
| **Verified (live)** | **0** |
| Held for further review, with the reason recorded | 27 |
| Unverified, waiting for the source check | 556 |
| Rejected | 25 (3 wrong or unfair, 22 duplicates or give-aways) |
| Corrected by review, with the old wording kept in `corrections` | 88 |
| Linked to a Field Guide behavior | 58 |
| Will need a person's approval after the source check (flagged) | 191 |
| Questions whose wording reveals another's answer (the scheduler asks the other one first; reword them during the source check) | 44 |

**What was done offline since the last report:**
- **A bank-wide duplicate check.** Earlier reviews compared questions only within each category. This pass compared all 597 remaining questions and retired 14 more.
  - Cross-category duplicates: parrotfish making sand (fish and corals), tetrodotoxin (octopus and pufferfish, twice), and sea otters keeping urchins down (echinoderms and kelp).
  - Give-aways: a sperm whale question that mentions "battles with giant squid", and the crown-of-thorns question that answers the sea-star stomach question.
- **Schema, format, missing-source and consistency checks** all run on every entry (see Automated checks).
- **The two-stage review rules** are now built into the validator, so the server can't publish a question that skipped either stage.

## How a question (or profile fact) becomes verified

The validator enforces every step, and the server publishes nothing that fails it:

1. **The page is checked by a machine.** `tools/discovery_verify.mjs --check` fetches the source page and confirms the stored evidence quote is on it, word for word. If the page can't be read, or the words aren't there, the question isn't verified, including one that was verified before.
2. **First review (`review1`).** The answer matches the source, and the explanation says only what the source supports. Both must be recorded as true.
3. **Second review (`review2`), by a different reviewer.** This reviewer reads the question, all three choices, the explanation and the evidence. They confirm the quote actually settles the answer, that both wrong choices are wrong, and that nothing can be read two ways. Finding the quote on the page is not enough on its own.
4. **A person, for flagged questions (`humanReview`).** Disputed science, surprising claims, precise numbers, conflicting sources, or anything either reviewer flags needs a person's approval. A reviewer recorded as a model (`ai:…`) can never count as this person. The validator refuses it, and a test proves that.

**How the reviews are recorded:**
- Reviews done by AI are recorded as AI (for example `ai:first`, `ai:second`). The reports will never describe two AI passes as independent human verification.
- The **191** flagged questions are the human workload. If that is too many, they can be left out instead, and the rest go live without them.

## The profile facts ("Did you know?") audit

The animal profiles drew from **three separate lists**. Some facts were duplicated across them and a few contradicted each other:
- `FACTS` in `web/src/facts.js`
- `SPECIES_FACTS` in `web/src/main.js`
- `TRAIT_FACTS` in `facts.js`

There were also the egg-care lines in `rules.js` `EGG_CARE`. All 130 entries were audited.

| Verdict | Count | Examples |
|---|---|---|
| Kept | 29 | octopus three hearts, seahorse eyes, mandarin dragonet blue color |
| Corrected | 60 | see below |
| Merged (the same fact said twice) | 33 | most of `main.js` `SPECIES_FACTS` repeated `facts.js` |
| Removed | 8 | see below |

**Corrections, for example:**
- "One of only two octopuses that walk on two arms" was out of date; it was reported in the common octopus in 2021.
- "Every clownfish is born male; the biggest can become female" was garbled. The biggest already is the female, and the largest male changes sex if she dies.
- "Kemp's ridleys: nearly all nest on one beach" is out of date. It is about 95% across several beaches in Tamaulipas.
- "Biggest head of any hard-shelled turtle" was a superlative no source states. It now says the loggerhead is named for its big head.
- Smaller fixes:
  - an unsupported "yellow siphon" was dropped;
  - sizes the sources disagreed on were dropped;
  - "the very beach she hatched on" became "the region";
  - cardinalfish fathers "do not eat" became "can hardly eat";
  - each personality-trait line now separates what the game does from the real-animal fact.

**Removed**, as wrong or unsupportable:
- a coral-perching fact attached to the wrong goby species;
- a blue chromis "blue to green" color mix-up;
- unsupported claims about royal gramma gaping, chromis shimmer, tang "never stops swimming" and puffer "helicopter" swimming;
- "Kemp's ridleys are feisty when picked up" (anecdote);
- "captive-bred neon gobies take nothing from the reef" (not biology).

**Held (3):**
- Two blue tang facts were sourced from the Atlantic blue tang, but the game's tang is the Indo-Pacific blue tang.
- One hawksbill fact disagrees with Daily Discovery question dd-0202 (see below).

**One store:**
- **All facts live in `server/discovery/facts.json`,** under the same schema, statuses and two-stage review rules as the questions. `web/src/facts.js` is now **generated** from it (`tools/facts_build.mjs`), and the animal card's 💡 line, the profile's fact of the day, the trait notes and the egg cards all read from it. `SPECIES_FACTS` is gone.
- **Profile facts and questions share one fact-id namespace.** `tools/facts_link.mjs` ties each profile fact to any question that tests the same thing, so the two can't drift apart. 12 profile facts are linked.
- **The links already caught a contradiction.** The hawksbill profile fact said sponge-eating protects corals; question dd-0202 says it protects rarer reef species. The profile fact is held until a source settles it.

**What the profiles show right now (decision for you):**
- Until source pages can be fetched, the profiles show the **86 audited facts that were already in the game** (kept or corrected, each with a candidate source). This is `meta.transition: true` in the store, so the profiles don't go empty.
- Rejected and held facts are never shown, and a test enforces it.
- Verified facts will always show. Setting `transition: false` shows verified facts only, which today would mean no facts in profiles.

## Automated checks (`tools/discovery_validate.mjs`, `server/discovery/validate.mjs`)

**Rejected outright (errors):**
- Structure: duplicate ids, missing fields, an empty explanation, fewer or more than three choices, an invalid answer index, or duplicate choices.
- Sources: a missing or malformed source URL, or http instead of https.
- Status: an unknown status, category or difficulty, or a Field Guide behavior that doesn't exist.
- Duplicates: exact duplicate questions, and duplicate fact identifiers.
- Verification: a verified question without fetched evidence, both reviews, or (when flagged) a person's approval; the same reviewer doing both reviews; or a model recorded as the "human" reviewer.

**Flagged:**
- Look-alike questions (word overlap of question with answer, and of explanations), held until a person marks the pair distinct or duplicate.
- Absolute wording such as "always", "never" and "only".
- Negative questions.
- Consistency: an explanation that matches a wrong choice better than the answer, or a numeric answer whose number doesn't appear in the explanation.

**Current result:** 608 questions, 0 errors, 0 unreviewed look-alikes, 0 published. Fact store: 97 records, 0 errors.

## Sources (the 583 questions not rejected; primary source)

| Source | Questions |
|---|---|
| NOAA | 141 |
| Peer-reviewed journals | 114 |
| Natural history museums | 86 |
| Smithsonian Ocean | 71 |
| Other aquariums | 48 |
| Other government agencies | 39 |
| Monterey Bay Aquarium | 36 |
| Universities | 23 |
| Other | 22 |
| MBARI | 9 |
| WHOI | 8 |

278 questions also have a second source.

The approved domains to allow are listed in the "Once network access is available" section below.

## Distribution (583 not rejected)

**By category:**

| Category | Questions | Topics still to draft |
|---|---|---|
| Seahorses | 54 | |
| Sea turtles | 53 | |
| Echinoderms | 53 | |
| Fish | 52 | |
| Coral reefs | 51 | |
| Jellies | 51 | |
| Deep sea | 51 | |
| Cephalopods | 50 | |
| Mollusks | 43 | mussels, scallop swimming, pearls, sea butterflies |
| Marine mammals | 37 | seals, sea lions, walruses, manatees, dugongs, sea otters, polar bears |
| Crustaceans | 28 | true crabs, lobsters, krill, copepods |
| Seabirds | 27 | shearwaters, petrels, terns, cormorants |
| Sharks and rays | 24 | mantas, stingrays, skates, electric rays, chimaeras |
| Kelp and plankton | 9 | seagrass, mangroves, phytoplankton, zooplankton, bioluminescence |

**By difficulty:** 131 easy, 297 medium, 155 hard.

**Behavior links:** 58 in total. The largest group is cleaning stations with 14. There are 0 octopus puzzle questions, which are first on the list to draft.

## Automated test results (this round)

| Suite | Result |
|---|---|
| `server/discovery.test.mjs` | 22 of 22 pass. New this round: the reward (one 2-shell payment per tank per day, including three caretakers answering at once, with exactly one ledger line); the two-stage review rules (a missing review, the same reviewer twice, a flagged question without a person, a model posing as the person); give-away ordering; and the fact store (nothing rejected or held is ever shown) |
| `tools/discovery_check.mjs` (two phones, headless Chromium, test-fixture question) | 18 of 18 pass, including "Ben answered first: the tank gets 2 shells" and "Ana's answer earns nothing more, and her card says Ben earned them" |
| `npm test`: rules, adventures, life, history, biscuit, server | all pass |
| `tools/discovery_verify.mjs` | not run: no source page reachable |

## Once network access is available

1. **Allow the source domains** in the environment's network settings:
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
   - plos.org
2. **Gather the candidate sentences.** `node tools/discovery_verify.mjs --candidates`, and the same with `--facts`, fetches every page and lists the sentences most likely to settle each item.
3. **First review.** Copy the exact supporting sentence into `evidence` and record `review1`. Fix or reject anything the page doesn't support. Start with the 27 held items and the `risk` flags.
4. **Second review.** A different reviewer records `review2`.
5. **A person** approves the flagged items in `TAKO_TANK_DISCOVERY_QC_SAMPLE.md` Part 2, or they are excluded.
6. **Confirm and publish.** Run `--check`, then `tools/discovery_validate.mjs` and `tools/facts_build.mjs`. The server picks up the bank file within a minute.
7. **Draft the remaining topics above,** about 100 questions, and put them through the same steps.
8. **Report the exact verified, rejected and held counts.** If fewer than 700 pass, that number is the launch number.

### Network allowlist for the verifier

The verifier (`tools/discovery_verify.mjs`) must fetch each question's source page. From a cloud session, these hosts have to be allowed in the environment's network settings (Allowed domains under the Limited level, with package managers left on); on a Mac with normal internet nothing is needed. The 84 hosts below cover all 583 questions not rejected, most-used first; the first fifteen cover 437 of them.

```
fisheries.noaa.gov
ncbi.nlm.nih.gov
ocean.si.edu
pmc.ncbi.nlm.nih.gov
australian.museum
montereybayaquarium.org
nhm.ac.uk
aquariumofpacific.org
oceanservice.noaa.gov
nps.gov
floridamuseum.ufl.edu
fws.gov
mbari.org
sanctuaries.noaa.gov
georgiaaquarium.org
oceanexplorer.noaa.gov
repository.library.noaa.gov
seattleaquarium.org
whoi.edu
audubon.org
pubmed.ncbi.nlm.nih.gov
allaboutbirds.org
archive.oceanexplorer.noaa.gov
journals.plos.org
nobelprize.org
scripps.ucsd.edu
sheddaquarium.org
cdhc.noaa.gov
cdn.oceanservice.noaa.gov
dcceew.gov.au
floridakeys.noaa.gov
flowergarden.noaa.gov
myfwc.com
nationalzoo.si.edu
science.org
tepapa.govt.nz
galapagos.org
home.nps.gov
lifg.australian.museum
noaa.gov
oceantoday.noaa.gov
qrius.si.edu
researchprofiles.ku.dk
si.edu
academy.allaboutbirds.org
americansamoa.noaa.gov
annualreport.mbari.org
antarctica.gov.au
authors.library.caltech.edu
bas.ac.uk
biodesign.berkeley.edu
blog.seattleaquarium.org
blog.tepapa.govt.nz
coastalscience.noaa.gov
dpird.nsw.gov.au
endeavors.unc.edu
galleries.neaq.org
grosberglab.faculty.ucdavis.edu
insider.si.edu
lohmannlab.web.unc.edu
museum.wa.gov.au
napier.ac.uk
naturalhistory.si.edu
news.mit.edu
news.uq.edu.au
newsarchive.berkeley.edu
nora.nerc.ac.uk
oceanacidification.noaa.gov
pateklab.biology.duke.edu
pmel.noaa.gov
pnas.org
projectpuffin.audubon.org
pugetsound.edu
research.noaa.gov
response.restoration.noaa.gov
schmidtocean.org
seagrant.oregonstate.edu
ssec.si.edu
tuftsjournal.tufts.edu
ucdavis.edu
ucf.edu
ui.adsabs.harvard.edu
usgs.gov
website.whoi.edu
```

With counts: fisheries.noaa.gov (67), ncbi.nlm.nih.gov (59), ocean.si.edu (59), pmc.ncbi.nlm.nih.gov (39), australian.museum (36), montereybayaquarium.org (35), nhm.ac.uk (29), aquariumofpacific.org (28), oceanservice.noaa.gov (22), nps.gov (19), floridamuseum.ufl.edu (13), fws.gov (8), mbari.org (8), sanctuaries.noaa.gov (8), georgiaaquarium.org (7), oceanexplorer.noaa.gov (7), repository.library.noaa.gov (7), seattleaquarium.org (7), whoi.edu (7), audubon.org (6), pubmed.ncbi.nlm.nih.gov (5), allaboutbirds.org (4), archive.oceanexplorer.noaa.gov (4), journals.plos.org (4), nobelprize.org (4), scripps.ucsd.edu (4), sheddaquarium.org (4), cdhc.noaa.gov (3), cdn.oceanservice.noaa.gov (3), dcceew.gov.au (3), floridakeys.noaa.gov (3), flowergarden.noaa.gov (3), myfwc.com (3), nationalzoo.si.edu (3), science.org (3), tepapa.govt.nz (3), galapagos.org (2), home.nps.gov (2), lifg.australian.museum (2), noaa.gov (2), oceantoday.noaa.gov (2), qrius.si.edu (2), researchprofiles.ku.dk (2), si.edu (2), academy.allaboutbirds.org (1), americansamoa.noaa.gov (1), annualreport.mbari.org (1), antarctica.gov.au (1), authors.library.caltech.edu (1), bas.ac.uk (1), biodesign.berkeley.edu (1), blog.seattleaquarium.org (1), blog.tepapa.govt.nz (1), coastalscience.noaa.gov (1), dpird.nsw.gov.au (1), endeavors.unc.edu (1), galleries.neaq.org (1), grosberglab.faculty.ucdavis.edu (1), insider.si.edu (1), lohmannlab.web.unc.edu (1), museum.wa.gov.au (1), napier.ac.uk (1), naturalhistory.si.edu (1), news.mit.edu (1), news.uq.edu.au (1), newsarchive.berkeley.edu (1), nora.nerc.ac.uk (1), oceanacidification.noaa.gov (1), pateklab.biology.duke.edu (1), pmel.noaa.gov (1), pnas.org (1), projectpuffin.audubon.org (1), pugetsound.edu (1), research.noaa.gov (1), response.restoration.noaa.gov (1), schmidtocean.org (1), seagrant.oregonstate.edu (1), ssec.si.edu (1), tuftsjournal.tufts.edu (1), ucdavis.edu (1), ucf.edu (1), ui.adsabs.harvard.edu (1), usgs.gov (1), website.whoi.edu (1).
