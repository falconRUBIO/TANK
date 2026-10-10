// Words for recovery keys: short, common, easy to spell and to say out loud. A key is four of them (about 33 bits; the server also limits guesses).
const RAW = `coral reef wave tide kelp shell pearl sand foam surf cove lagoon isle dune shore otter
seal whale squid crab clam eel ray shark tuna koi carp perch trout salmon moss fern
reed lily lotus tulip rose iris daisy poppy maple cedar pine oak birch willow apple lemon
lime mango peach plum pear cherry berry melon grape kiwi fig olive honey cocoa amber jade
ruby opal topaz ivory silver gold copper bronze moon star sun comet orbit rain snow mist
cloud storm frost dew ember spark flame glow river lake brook creek pond canyon cliff hill
peak ridge valley meadow field grove forest robin wren finch crow raven owl hawk eagle
swan duck goose heron crane gull puffin panda koala tiger lion bear wolf fox deer moose
bison zebra camel llama lemur sloth gecko frog toad newt turtle snail beetle moth bee
cricket piano drum flute harp banjo cello kite boat raft canoe sail anchor rope lamp lantern
bell candle cookie muffin bagel noodle waffle pickle pepper ginger basil mint sage thyme
teal cyan violet indigo orange yellow north south east west happy brave calm swift quiet
bright gentle lucky jolly merry cozy sunny button pocket ribbon velvet marble pebble crystal
feather pillow blanket teapot kettle castle tower bridge garden harbor island cabin igloo
tent rocket planet galaxy nova pixel robot wizard knight pirate captain sailor diver
artist baker farmer ranger poet violin guitar trumpet banana carrot potato tomato onion
garlic radish turnip pumpkin acorn walnut almond peanut cashew muffin pretzel donut
biscuit taco pizza pasta ramen sushi dumpling cereal toast jelly butter cheese yogurt
lizard parrot falcon magpie badger beaver rabbit hamster kitten puppy pony donkey goat
sheep piglet walrus penguin dolphin narwhal seahorse starfish jellyfish urchin shrimp
lobster oyster mussel scallop plankton clover thistle cactus bamboo orchid jasmine
saffron violet pine`;
export const WORDS = [...new Set(RAW.split(/\s+/).filter(Boolean))];
