// Real facts about each animal in the tank, one a day (the same for everyone, worked out from the date), with a tap for another.
// Sources: Wikipedia (Amphioctopus marginatus), Live Science / Scientific American on the coconut octopus' tool use, The Conversation and SEA LIFE on seahorses,
// Microcosm Aquarium Explorer and fish-keeping guides on the reef fish.
export const FACTS = {
  octopus: [
    'Coconut octopuses carry coconut shell halves around and hide inside them. It was the first tool use ever recorded in an octopus.',
    'To carry its shells, a coconut octopus stacks them, climbs on top and walks on stiffened arms, like stilts.',
    'The coconut octopus is one of only two octopuses known to walk on just two arms.',
    'When it wants to vanish, a coconut octopus buries itself in the sand until only its eyes show.',
    'A coconut octopus is small: about 8 cm in the body, around 15 cm with its arms out.',
    'Look for the dark, vein-like lines on its skin and its yellow siphon. They give it its other name: the veined octopus.',
    'A mother coconut octopus lays her eggs inside a shell and guards them for 15 to 17 days, cleaning them and puffing water over them.',
    'Coconut octopuses hunt shrimp, crabs and clams on sandy seabeds in the tropical Pacific and Indian Oceans.',
    'An octopus has three hearts and blue blood.',
    'Most of an octopus\'s neurons are in its arms: each arm can taste and feel what it touches on its own.',
    'An octopus changes color and texture in a fraction of a second, using thousands of tiny color cells in its skin.',
  ],
  loggerhead: [
    'A loggerhead has the biggest head of any hard-shelled turtle, with jaws strong enough to crush conch shells.',
    'Loggerheads swim right across oceans: some hatched in Japan feed off Mexico before swimming home to nest.',
    'A loggerhead shell often carries a whole little world of barnacles, crabs and algae along for the ride.',
    'Loggerheads find their way home using Earth\'s magnetic field, like a built-in compass.',
  ],
  kemps: [
    "Kemp's ridley is the smallest sea turtle and the most endangered; nearly all of them nest on one beach in Mexico.",
    "Kemp's ridleys nest by day, thousands at once, in mass arrivals called arribadas.",
    "A Kemp's ridley digs in the sandy bottom of shallow bays for crabs, its favorite food.",
    "Kemp's ridleys are known for being feisty: they snap and flap when picked up.",
  ],
  leatherback: [
    'The leatherback is the largest turtle alive: it can be over two meters long and weigh as much as a small car.',
    'A leatherback has no hard plates: its shell is thick, oily skin over a mosaic of tiny bones, with seven ridges.',
    'Leatherbacks eat jellyfish, and the inside of their throats is lined with backward-pointing spines to hold them.',
    'Leatherbacks dive deeper than any other turtle, over a kilometer down.',
  ],
  hawksbill: [
    'A hawksbill eats sponges, prying them out of the reef with its narrow, hooked beak. Few other animals can eat them.',
    'Hawksbill shells are the tortoiseshell people once made combs and glasses from; today the trade is banned to protect them.',
    'By eating sponges, hawksbills keep them from crowding out the corals on a reef.',
    'Some hawksbills glow: their shells fluoresce red and green under blue light, the first reptile seen to do it.',
  ],
  turtle: [
    'A sea turtle cannot pull its head into its shell the way a land tortoise can.',
    'Green turtles are named for the green color of their fat, not their shell: as adults they eat mostly sea grass and algae.',
    'A sea turtle can hold its breath for hours while it sleeps, wedged under a ledge, then rises to the surface to breathe.',
    'Sea turtles fly through the water with their long front flippers and steer with the small back ones.',
    'A female green turtle comes back to the very beach she hatched on to lay her own eggs, decades later.',
    'Whether a turtle egg hatches male or female depends on how warm the sand is: warm nests make mostly females.',
    'Young sea turtles drift for years in floating seaweed in the open ocean. Scientists call them the lost years.',
    'Sea turtles have lived in the oceans for over 100 million years, since the age of the dinosaurs.',
  ],
  seahorse: [
    'A seahorse\'s eyes move on their own: it can watch something in front and something behind at the same time.',
    'In seahorses the male gets pregnant: the female puts her eggs in his pouch and he carries them until they hatch.',
    'A male seahorse can give birth to anything from five to over a thousand tiny babies at once.',
    'A seahorse pair greets each other each morning with a little dance, circling and changing color together.',
    'Seahorses court by swimming side by side with their tails linked, turning brighter as they go.',
    'Seahorses are poor swimmers. They spend most of the day holding on to seagrass with their curled tails.',
    'A seahorse has no teeth and no stomach. It snaps up tiny shrimp with a flick of its snout, so it eats almost all day.',
    'Seahorses can change color to match the plants they cling to.',
    'Seahorses swim upright, pushed along by a little fin on their back that beats up to 50 times a second.',
  ],
  goldfish: ['Every clownfish is born male. The biggest in a group can become female.', 'Clownfish live among anemone tentacles, protected by a slimy coat that stops the stings.', 'Clownfish make little popping and clicking sounds to talk to each other.'],
  blue: ['A royal gramma swims belly to the nearest surface, so under a ledge it hangs upside down. It is not unwell; it is at home.', 'When an intruder comes too close, a royal gramma gapes its mouth wide as a warning.', 'Royal grammas sometimes pick tiny parasites off bigger fish, like little cleaners.'],
  neon: ['Blue chromis live in loose shoals and dart back into the coral together when something startles them.', 'A chromis shoal shimmers because each fish turns at almost the same moment.'],
  cory: ['A yellow watchman goby shares a burrow with a pistol shrimp: the shrimp digs, the goby keeps watch.', 'Gobies perch on the sand on their fins, like a little lookout.'],
  guppy: ['Damselfish farm their own patch of algae and chase off anything that comes to graze on it.', 'For their size, damselfish are some of the boldest fish on the reef.'],
  angelfish: ['A young emperor angelfish has blue and white rings; it changes completely into stripes as it grows up.', 'Angelfish can make a loud knocking sound to warn others off.'],
  platy: ['In cardinalfish the dad keeps the eggs safe in his mouth until they hatch, and does not eat until they do.', 'Cardinalfish rest in quiet groups by day and hunt at night.'],
  neongoby: ['Neon gobies run cleaning stations: big fish, even predators, hold still and let them pick parasites off their skin and gills.', 'Aquarium neon gobies are bred in captivity, so keeping one takes nothing from the reef.'],
  tang: ['A tang has a scalpel-sharp spine at the base of its tail, which is where the name surgeonfish comes from.', 'Blue tangs graze algae all day and help keep the reef from being overgrown.'],
  puffer: ['A puffer gulps water to blow itself up two or three times bigger, so a predator cannot swallow it.', 'The valentini puffer is poisonous to eat, and its saddle pattern warns predators off.'],
  danio: ['Anthias live in groups of many females and one male. If he goes, a female can turn into the new male.', 'Anthias hover above the reef, picking plankton out of the current.'],
  betta: ['Mandarin dragonets are among the few animals that make true blue color in their skin.', 'A mandarin dragonet picks tiny copepods off the rocks all day long, one by one.', 'Mandarins have no scales: a slimy coat protects them instead.'],
};
const dayN = () => Math.floor(Date.now() / 864e5);
export function factOfDay(species, extra = 0) { const L = FACTS[species] ?? []; if (!L.length) return null; return { text: L[(dayN() + extra) % L.length], n: ((dayN() + extra) % L.length) + 1, of: L.length }; }
// how a trait shows up in the real animal
export const TRAIT_FACTS = {
  octopus: { Curious: 'Curious octopuses solve puzzle jars faster: in the wild they poke into every shell and crack.', Shy: 'A shy octopus spends more time in its shell, like wild ones that only come out at dusk.', Brave: 'Bold octopuses come to the glass. Wild ones will even inspect divers.', Playful: 'Octopuses really do play: in studies they push floating bottles about again and again.', Calm: 'A calm octopus sits still and blends in, the way wild ones hide in plain sight.' },
  seahorse: { Shy: 'Shy seahorses keep to thick plants, where wild ones are hardest to spot.', Calm: 'Calm seahorses stay anchored for hours, just as wild ones hold one stem most of the day.', Curious: 'A curious seahorse turns one eye to anything new while the other keeps watch.', Social: 'Seahorses that are friendly link tails and drift together, as pairs do in the wild.', Brave: 'Bold seahorses swim out into open water more, which wild ones only do to find a mate.' },
};
