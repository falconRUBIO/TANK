# Daily Discovery: drafting brief (for each category researcher)

You are drafting marine-life trivia questions for TAKO TANK's Daily Discovery: one shared question a day for adults, three choices, exactly one correct. Accuracy is the priority. Your drafts are NOT verified: a later step fetches each source page and checks it. Your job: well-made questions, each tied to a REAL source page you found.

## Hard rules
1. **Never type a URL from memory.** Every `source.url` must be a URL that appeared in a WebSearch result in this session. If you cannot find a reputable page for a claim, drop the question.
2. Use WebSearch with `allowed_domains` set to reputable sites. Preferred, in order: noaa.gov (fisheries.noaa.gov, oceanservice.noaa.gov, oceanexplorer.noaa.gov, noaa.gov), ocean.si.edu / si.edu, montereybayaquarium.org, whoi.edu, noc.ac.uk, mbari.org, nhm.ac.uk, australian.museum, aquariumofpacific.org, georgiaaquarium.org, neaq.org, sheddaquarium.org, seattleaquarium.org, nps.gov, fws.gov, usgs.gov, nasa.gov, floridamuseum.ufl.edu, university .edu / .ac.uk pages, ncbi.nlm.nih.gov (peer-reviewed). Do not use blogs, Medium, Quora, content farms, news aggregators or Wikipedia as the source.
3. One question tests one fact. Write a `fact` identifier: `<category>.<subject>.<claim>` in lowercase-kebab, e.g. `cephalopods.octopus.heart-count`. Two questions that test the same underlying fact (even worded differently, or about a closely related species) are duplicates: keep only one.
4. Avoid: changing records ("largest ever recorded", "fastest"), disputed classifications, uncertain estimates (population counts, "scientists think maybe"), trick questions, "all of the above", negatives ("Which is NOT…"), and absolute words (always, never, all species, only) unless the source says exactly that.
5. Species-specific facts must name the species or group precisely ("the giant Pacific octopus", not "octopuses").
6. Numbers: only when the source states the number; give distractors that are clearly different (not 8 vs 9 when the true range is 8 to 10).
7. The two wrong answers must be plausible to a layperson but unambiguously wrong according to the science. Check that neither could be argued correct (exceptions, other species, other definitions).
8. Plain language for adults. No jargon without a gloss. No childish tone, jokes or exaggeration.
9. Explanation: 1 to 2 sentences, at most 240 characters, conversational and interesting, saying only what the source supports.
10. Spread the correct answer position roughly evenly over 0, 1 and 2. Keep the three choices similar in length and style.
11. Difficulty: easy (most adults would guess right), medium, hard (surprising or specialist but still fair).

## Behavior links (optional field `behavior`)
Some facts connect to something the animals really do in the game. Tag a question with ONE of these ids only when the real-world fact is directly about that behavior. Aim for roughly 10 to 25% of your questions tagged if your category has these animals; untagged is fine.
- `escape`: octopuses squeezing through small openings / escaping enclosures (soft body, beak size).
- `puzzle`: octopus problem solving, learning, opening containers.
- `camo`: octopus (cephalopod) changing skin color and texture.
- `ink`: cephalopod ink.
- `den`: octopuses living in dens, gathering shells/stones around them, carrying shelters (e.g. veined octopus with coconut shells).
- `mimic`: the mimic octopus impersonating other animals (species-specific!).
- `shell`: hermit crabs needing and switching to bigger shells.
- `seabirth`: male seahorses carrying and giving birth to young.
- `hitch`: seahorses gripping things with their tails.
- `blend`: seahorses changing color to match surroundings.
- `eyes`: seahorses moving each eye independently.
- `dance`: seahorse courtship / morning greeting displays.
- `snick`: seahorses feeding by snapping prey with a quick head flick / suction through the snout.
- `clean`: cleaner fish and cleaning stations (including turtles visiting them).
- `friend`: fish that form lasting pairs or social bonds (name the species).
- `turtle-home`: sea turtles navigating long distances / returning to the beach where they hatched.

## Output
Write a JSON array to the file path given in your task, nothing else in it. Each entry:
```json
{
  "fact": "cephalopods.octopus.heart-count",
  "q": "How many hearts does an octopus have?",
  "choices": ["One", "Two", "Three"],
  "answer": 2,
  "explain": "Two hearts pump blood through the gills and a third sends it around the rest of the body.",
  "category": "cephalopods",
  "difficulty": "easy",
  "behavior": null,
  "source": { "url": "https://...", "publisher": "Smithsonian Ocean", "title": "page title from the search result" },
  "source2": null,
  "searchNote": "What the search result said that supports the answer, in your own words (this is not a quote).",
  "risk": "none"
}
```
`risk`: none | numeric | species-specific | surprising | disputed-check (use these to flag what the verifier must check carefully). `source2`: a second independent source (same shape) for numeric, surprising or unusual claims when you can find one; otherwise null.

Do not edit any other file. Do not commit. When finished, reply with: how many questions you wrote, how many you dropped and why (briefly), and any facts you found disputed.
