// src/lib/games/order-of-magnitude/data.ts
import type { RawComparisonPair } from './types';

export const COMPARISON_PAIRS: RawComparisonPair[] = [
  {
    id: 'stars-vs-trees',
    title: 'Milky Way Stars vs. Earth Trees',
    category: 'Earth & Nature',
    item1: {
      label: 'Stars in the Milky Way Galaxy',
      value: 2e11,
      unit: 'stars',
      formattedValue: '~200 Billion',
      detail: 'Estimates range from 100 to 400 billion stars.',
    },
    item2: {
      label: 'Trees on Planet Earth',
      value: 3.04e12,
      unit: 'trees',
      formattedValue: '~3.04 Trillion',
      detail: 'A comprehensive 2015 study in Nature mapped ~3.04 trillion trees globally.',
    },
    explanation:
      'Earth’s trees outnumber the stars in our home galaxy by about 15 to 1! There are roughly 400 trees for every human on the planet.',
    funFact: 'About 46% of Earth’s trees are in tropical and subtropical forests.',
  },
  {
    id: 'seconds-million-vs-billion',
    title: 'One Million Seconds vs. One Billion Seconds',
    category: 'Time & History',
    item1: {
      label: 'Duration of 1 Million Seconds',
      value: 11.57,
      unit: 'days',
      formattedValue: '~11.6 Days',
      detail: '1,000,000 / 86,400 seconds in a day.',
    },
    item2: {
      label: 'Duration of 1 Billion Seconds',
      value: 11574.07,
      unit: 'days (~31.7 years)',
      formattedValue: '~31.7 Years',
      detail: '1,000,000,000 / 86,400 seconds in a day.',
    },
    explanation:
      'The human brain struggles with the scale difference: 1 million seconds is under 12 days, while 1 billion seconds is nearly 32 years—a full 3 orders of magnitude larger.',
    funFact: '1 trillion seconds would take you back ~31,700 years to the Upper Paleolithic ice age.',
  },
  {
    id: 'brain-neurons-vs-milky-way-stars',
    title: 'Human Brain Neurons vs. Stars in the Milky Way',
    category: 'Biology & Anatomy',
    item1: {
      label: 'Neurons in an Adult Human Brain',
      value: 8.6e10,
      unit: 'neurons',
      formattedValue: '~86 Billion',
      detail: 'Discovered by neuroscientist Suzana Herculano-Houzel using isotropic fractionator counts.',
    },
    item2: {
      label: 'Stars in the Milky Way Galaxy',
      value: 2e11,
      unit: 'stars',
      formattedValue: '~200 Billion',
      detail: 'Standard astrophysical median estimate.',
    },
    explanation:
      'The Milky Way has about 2.3 times as many stars as your brain has neurons, but with ~100 trillion synaptic connections, the neural network is far more interconnected.',
    funFact: 'The cerebellum contains about 80% of all the brain’s neurons despite its compact size.',
  },
  {
    id: 'sand-grains-vs-stars-universe',
    title: 'Grains of Sand on Earth vs. Stars in Observable Universe',
    category: 'Space & Astronomy',
    item1: {
      label: 'Grains of Sand on all Earth Beaches',
      value: 7.5e18,
      unit: 'grains',
      formattedValue: '~7.5 × 10¹⁸',
      detail: 'Calculation based on global beach coastlines, avg depth and grain volume.',
    },
    item2: {
      label: 'Stars in the Observable Universe',
      value: 2e23,
      unit: 'stars',
      formattedValue: '~2 × 10²³',
      detail: 'Roughly 2 trillion galaxies each with ~100 billion stars.',
    },
    explanation:
      'Astronomer Carl Sagan famously noted that there are more stars in the universe than grains of sand on all the beaches on Earth—exceeding them by over 4 orders of magnitude (26,000x)!',
    funFact: 'However, a single cup of water contains more water molecules than there are stars in the observable universe.',
  },
  {
    id: 'human-cells-vs-body-bacteria',
    title: 'Human Cells vs. Bacterial Cells in the Body',
    category: 'Biology & Anatomy',
    item1: {
      label: 'Human Cells in an Adult Body',
      value: 3e13,
      unit: 'cells',
      formattedValue: '~30 Trillion',
      detail: 'About 84% of your human cells are red blood cells.',
    },
    item2: {
      label: 'Bacterial Cells in/on the Human Body',
      value: 3.8e13,
      unit: 'bacteria',
      formattedValue: '~38 Trillion',
      detail: 'A 2016 Weizmann Institute census updated the older 10:1 myth to ~1.3:1.',
    },
    explanation:
      'Bacterial cells slightly outnumber human cells (~38T vs ~30T), but because bacterial cells are microscopic, they account for only about 200 grams of total body mass.',
    funFact: 'The vast majority of your microbiome resides in your colon.',
  },
  {
    id: 'ants-earth-vs-humans-earth',
    title: 'Total Ants on Earth vs. Humans on Earth',
    category: 'Earth & Nature',
    item1: {
      label: 'Total Ants Alive on Earth',
      value: 2e16,
      unit: 'ants',
      formattedValue: '~20 Quadrillion',
      detail: 'A 2022 PNAS study compiled 489 ant studies to estimate 20 × 10¹⁵ ants.',
    },
    item2: {
      label: 'Humans Alive on Earth',
      value: 8.2e9,
      unit: 'humans',
      formattedValue: '~8.2 Billion',
      detail: 'Current global human population estimate.',
    },
    explanation:
      'There are roughly 2.5 million ants for every single human on Earth—a staggering 6 orders of magnitude difference!',
    funFact: 'The dry carbon biomass of all ants (~12 million metric tons) rivals the combined biomass of all wild birds and mammals.',
  },
  {
    id: 'lego-bricks-vs-humans',
    title: 'LEGO Bricks Produced vs. Humans on Earth',
    category: 'Technology & Computing',
    item1: {
      label: 'Total LEGO Bricks Produced in History',
      value: 1.1e12,
      unit: 'bricks',
      formattedValue: '~1.1 Trillion',
      detail: 'Over 60 billion LEGO elements are molded each year.',
    },
    item2: {
      label: 'Humans Alive on Earth',
      value: 8.2e9,
      unit: 'humans',
      formattedValue: '~8.2 Billion',
      detail: 'Current global population.',
    },
    explanation:
      'There are about 134 LEGO bricks for every man, woman, and child on Earth today.',
    funFact: 'Six 2x4 LEGO bricks can be combined in 915,103,765 different ways.',
  },
  {
    id: 'google-searches-vs-lifetime-heartbeats',
    title: 'Daily Google Searches vs. Lifetime Human Heartbeats',
    category: 'Humanity & Society',
    item1: {
      label: 'Google Searches Worldwide per Day',
      value: 8.5e9,
      unit: 'searches / day',
      formattedValue: '~8.5 Billion',
      detail: 'Roughly 99,000 searches processed every single second.',
    },
    item2: {
      label: 'Heartbeats in an 80-Year Human Lifetime',
      value: 3e9,
      unit: 'heartbeats',
      formattedValue: '~3 Billion',
      detail: 'At an average resting rate of 72 beats per minute over 80 years.',
    },
    explanation:
      'Google answers nearly 3 times as many queries every 24 hours as your heart beats over an entire 80-year lifetime.',
    funFact: 'About 15% of the searches Google sees every day have never been searched before.',
  },
  {
    id: 'dna-length-vs-sun-distance',
    title: 'Total DNA in One Human Body vs. Distance to the Sun',
    category: 'Biology & Anatomy',
    item1: {
      label: 'Total Uncoiled DNA in One Human Body',
      value: 2e11,
      unit: 'meters',
      formattedValue: '~200 Billion Meters',
      detail: 'Each cell contains ~2m of DNA; with ~30T cells (excluding RBCs), it stretches ~2e11m.',
    },
    item2: {
      label: 'Distance from Earth to the Sun (1 AU)',
      value: 1.496e11,
      unit: 'meters',
      formattedValue: '~150 Billion Meters',
      detail: '1 Astronomical Unit is 149,597,870,700 meters.',
    },
    explanation:
      'If you unraveled and linked all the DNA strands in your body end-to-end, it would stretch about 200 billion meters—far enough to reach past the Sun and back!',
    funFact: 'All that DNA is packaged into nuclei smaller than a grain of dust.',
  },
  {
    id: 'card-deck-shuffles-vs-earth-atoms',
    title: 'Unique 52-Card Shuffles vs. Total Atoms Making Up Earth',
    category: 'Physics & Measurement',
    item1: {
      label: 'Possible Permutations of a 52-Card Deck (52!)',
      value: 8.06e67,
      unit: 'combinations',
      formattedValue: '~8 × 10⁶⁷',
      detail: '52 factorial = 80,658,175,170,943,878,571,660,636,856,403,766,975,289,505,440,883,277,824,000,000,000,000.',
    },
    item2: {
      label: 'Total Atoms Making Up Planet Earth',
      value: 1.33e50,
      unit: 'atoms',
      formattedValue: '~1.3 × 10⁵⁰',
      detail: 'Based on Earth’s mass of 5.97e24 kg composed primarily of iron, oxygen, and silicon.',
    },
    explanation:
      'Every time you shuffle a standard deck of cards thoroughly, you almost certainly create an arrangement that has never existed in the history of the universe. 52! exceeds Earth’s atomic count by 17 orders of magnitude!',
    funFact: 'Even if every human shuffled cards once per second since the Big Bang, we would not have scratched 0.0000000001% of the deck combinations.',
  },
  {
    id: 'wikipedia-vs-library-alexandria',
    title: 'English Wikipedia Articles vs. Library of Alexandria Scrolls',
    category: 'Humanity & Society',
    item1: {
      label: 'Articles on English Wikipedia',
      value: 7e6,
      unit: 'articles',
      formattedValue: '~7 Million',
      detail: 'Active peer-curated encyclopedia articles.',
    },
    item2: {
      label: 'Estimated Papyrus Scrolls in Ancient Library of Alexandria',
      value: 4e5,
      unit: 'scrolls',
      formattedValue: '~400,000',
      detail: 'Scholarly consensus on the peak collection size under Ptolemy II.',
    },
    explanation:
      'English Wikipedia has over 17 times more articles than the fabled Library of Alexandria had scrolls at its height.',
    funFact: 'Printed out, English Wikipedia would fill more than 3,000 physical encyclopedia volumes.',
  },
  {
    id: 'speed-light-vs-speed-sound',
    title: 'Speed of Light in Vacuum vs. Speed of Sound in Air',
    category: 'Physics & Measurement',
    item1: {
      label: 'Speed of Light in Vacuum',
      value: 299792,
      unit: 'km / second',
      formattedValue: '~300,000 km/s',
      detail: 'Exact universal constant c = 299,792.458 km/s.',
    },
    item2: {
      label: 'Speed of Sound in Sea-Level Air (20°C)',
      value: 0.343,
      unit: 'km / second',
      formattedValue: '~0.34 km/s (1,235 km/h)',
      detail: 'Mach 1 under standard atmospheric pressure.',
    },
    explanation:
      'Light travels approximately 874,000 times faster than sound in air (~6 orders of magnitude)! That is why you see lightning flash long before you hear thunder.',
    funFact: 'At light speed, you could circumnavigate Earth 7.5 times in one second.',
  },
  {
    id: 'sun-diameter-vs-earth-moon-distance',
    title: 'Diameter of the Sun vs. Earth-to-Moon Distance',
    category: 'Space & Astronomy',
    item1: {
      label: 'Diameter of the Sun',
      value: 1392700,
      unit: 'kilometers',
      formattedValue: '~1,392,700 km',
      detail: 'Approximately 109 times the diameter of Earth.',
    },
    item2: {
      label: 'Average Distance from Earth to the Moon',
      value: 384400,
      unit: 'kilometers',
      formattedValue: '~384,400 km',
      detail: 'The average lunar orbital semimajor axis.',
    },
    explanation:
      'The Sun is so colossal that its diameter is 3.6 times wider than the entire distance from Earth to the Moon. All solar system planets could fit inside the Moon’s orbit with room to spare!',
    funFact: 'About 1.3 million Earths could fit inside the volume of the Sun.',
  },
  {
    id: 'tweets-per-day-vs-tokyo-population',
    title: 'Daily Tweets / Posts vs. Tokyo Metropolitan Population',
    category: 'Humanity & Society',
    item1: {
      label: 'Posts (Tweets) Published on X per Day',
      value: 5e8,
      unit: 'posts / day',
      formattedValue: '~500 Million',
      detail: 'Roughly 6,000 posts published per second.',
    },
    item2: {
      label: 'Population of Tokyo Greater Metropolitan Area',
      value: 3.74e7,
      unit: 'people',
      formattedValue: '~37.4 Million',
      detail: 'The world’s most populous metropolitan area.',
    },
    explanation:
      'Every single day, humans publish more than 13 times as many tweets as the entire population of the world’s largest metropolis.',
    funFact: 'Tokyo’s metro area generates an annual GDP comparable to that of South Korea or Canada.',
  },
  {
    id: 'lightning-strikes-vs-flights',
    title: 'Lightning Strikes per Day vs. Commercial Flights per Day',
    category: 'Earth & Nature',
    item1: {
      label: 'Lightning Strikes on Earth per Day',
      value: 8.64e6,
      unit: 'strikes / day',
      formattedValue: '~8.6 Million',
      detail: 'Global average of ~100 lightning flashes per second.',
    },
    item2: {
      label: 'Commercial Airline Flights per Day Worldwide',
      value: 1e5,
      unit: 'flights / day',
      formattedValue: '~100,000',
      detail: 'Tracked commercial passenger and cargo flights.',
    },
    explanation:
      'Earth experiences about 86 lightning strikes for every commercial flight that takes off around the globe (~2 orders of magnitude).',
    funFact: 'Lake Maracaibo in Venezuela is the lightning capital of Earth, struck by lightning on up to 300 nights a year.',
  },
  {
    id: 'deepest-ocean-vs-tallest-mountain',
    title: 'Mariana Trench Depth vs. Mount Everest Height',
    category: 'Earth & Nature',
    item1: {
      label: 'Depth of Mariana Trench (Challenger Deep)',
      value: 10994,
      unit: 'meters',
      formattedValue: '~10,994 m',
      detail: 'The deepest known point in the Earth’s seabed.',
    },
    item2: {
      label: 'Height of Mount Everest above Sea Level',
      value: 8849,
      unit: 'meters',
      formattedValue: '~8,849 m',
      detail: 'Official 2020 joint measurement by Nepal and China.',
    },
    explanation:
      'If you placed Mount Everest into the Challenger Deep, its peak would still be submerged under more than 2 kilometers (6,500 feet) of ocean water.',
    funFact: 'Water pressure at the bottom of the Mariana Trench exceeds 1,000 atmospheres (15,000 psi).',
  },
  {
    id: 'modern-cpu-transistors-vs-world-population',
    title: 'Transistors on an Apple M2 Ultra vs. World Population',
    category: 'Technology & Computing',
    item1: {
      label: 'Transistors on an Apple M2 Ultra Chip',
      value: 1.34e11,
      unit: 'transistors',
      formattedValue: '~134 Billion',
      detail: 'Manufactured using TSMC 5-nanometer process technology.',
    },
    item2: {
      label: 'Human Beings on Planet Earth',
      value: 8.2e9,
      unit: 'people',
      formattedValue: '~8.2 Billion',
      detail: 'Global human population.',
    },
    explanation:
      'A single computer silicon die smaller than a postage stamp contains over 16 times more microscopic transistors than all living humans combined.',
    funFact: 'A modern semiconductor transistor gate can be just a few dozen silicon atoms wide.',
  },
  {
    id: 'marathon-steps-vs-everest-climb-steps',
    title: 'Steps to Run a Marathon vs. Steps from Base Camp to Everest Summit',
    category: 'Everyday Life',
    item1: {
      label: 'Steps Taken to Run a 42.195 km Marathon',
      value: 45000,
      unit: 'steps',
      formattedValue: '~45,000',
      detail: 'Based on average stride length of ~0.9 to 1.0 meters during endurance running.',
    },
    item2: {
      label: 'Steps to Hike from Everest Base Camp to Summit',
      value: 30000,
      unit: 'steps',
      formattedValue: '~30,000',
      detail: 'Vertical climb of ~3,500m over ~20 km of snow and ice ridges.',
    },
    explanation:
      'A runner actually takes about 1.5 times more physical strides running a standard road marathon than a mountaineer takes summiting Everest from Base Camp—though the Everest climb is far more perilous!',
    funFact: 'Above 8,000 meters in the "Death Zone", climbers take up to 5 breaths for every single step.',
  },
  {
    id: 'english-words-vs-war-and-peace',
    title: 'Total English Words vs. Words in War and Peace',
    category: 'Humanity & Society',
    item1: {
      label: 'Estimated Words in the English Language Vocabulary',
      value: 1e6,
      unit: 'words',
      formattedValue: '~1 Million',
      detail: 'Including technical and specialized terms.',
    },
    item2: {
      label: 'Total Words in Leo Tolstoy’s "War and Peace"',
      value: 587287,
      unit: 'words',
      formattedValue: '~587,000',
      detail: 'One of the longest famous novels in Western literature.',
    },
    explanation:
      'Reading all of War and Peace means absorbing more than half as many total words as exist in the entire English dictionary.',
    funFact: 'Tolstoy handwrote and revised drafts of War and Peace seven times.',
  },
  {
    id: 'earthquakes-per-year-vs-active-volcanoes',
    title: 'Earthquakes Detected per Year vs. Active Volcanoes on Land',
    category: 'Earth & Nature',
    item1: {
      label: 'Earthquakes Detected Globally per Year',
      value: 500000,
      unit: 'earthquakes / year',
      formattedValue: '~500,000',
      detail: 'About 100,000 of these can be felt by humans.',
    },
    item2: {
      label: 'Potentially Active Volcanoes on Land Worldwide',
      value: 1350,
      unit: 'volcanoes',
      formattedValue: '~1,350',
      detail: 'Volcanoes with historical eruptions in the Holocene era.',
    },
    explanation:
      'Earth shakes constantly: there are roughly 370 earthquakes registered for every potentially active volcano above sea level (~2.5 orders of magnitude).',
    funFact: 'About 50 to 70 volcanoes erupt each year around the globe.',
  },
  {
    id: 'dna-thickness-vs-atom-diameter',
    title: 'Width of DNA Double Helix vs. Diameter of a Hydrogen Atom',
    category: 'Physics & Measurement',
    item1: {
      label: 'Width of a DNA Double Helix',
      value: 2e-9,
      unit: 'meters (2 nm)',
      formattedValue: '~2 Nanometers',
      detail: 'The structural diameter of standard B-form DNA.',
    },
    item2: {
      label: 'Diameter of a Neutral Hydrogen Atom',
      value: 1.06e-10,
      unit: 'meters (~0.1 nm)',
      formattedValue: '~0.1 Nanometers (1 Å)',
      detail: 'Bohr radius × 2.',
    },
    explanation:
      'A DNA strand is about 20 times wider than a hydrogen atom—one order of magnitude difference at the molecular boundary.',
    funFact: 'A human hair is roughly 40,000 times wider than a DNA helix.',
  },
  {
    id: 'age-universe-vs-age-earth',
    title: 'Age of the Universe vs. Age of Planet Earth',
    category: 'Space & Astronomy',
    item1: {
      label: 'Age of the Universe since the Big Bang',
      value: 1.38e10,
      unit: 'years',
      formattedValue: '~13.8 Billion Years',
      detail: 'Measured via cosmic microwave background fluctuations by Planck satellite.',
    },
    item2: {
      label: 'Age of Planet Earth',
      value: 4.54e9,
      unit: 'years',
      formattedValue: '~4.54 Billion Years',
      detail: 'Determined via radiometric dating of meteorite fragments.',
    },
    explanation:
      'Earth has existed for almost a third of the entire history of the universe (ratio ~3.04x). Our planet formed well after the first generations of giant stars had enriched the galaxy with heavy elements.',
    funFact: 'On a 24-hour cosmic calendar, human recorded history occupies only the final 14 seconds.',
  },
  {
    id: 'distance-voyager-1-vs-pluto',
    title: 'Distance to Voyager 1 vs. Distance to Pluto',
    category: 'Space & Astronomy',
    item1: {
      label: 'Distance to Voyager 1 Spacecraft from Earth',
      value: 2.45e10,
      unit: 'kilometers',
      formattedValue: '~24.5 Billion km (~163 AU)',
      detail: 'The farthest human-made object from Earth, launched in 1977.',
    },
    item2: {
      label: 'Max Distance to Pluto from Earth',
      value: 7.5e9,
      unit: 'kilometers',
      formattedValue: '~7.5 Billion km (~50 AU)',
      detail: 'Pluto at aphelion across opposite sides of the Sun.',
    },
    explanation:
      'Voyager 1 is over 3 times further away from Earth than Pluto’s maximum orbital distance. A radio signal sent to Voyager 1 takes over 22 hours traveling at the speed of light just to arrive.',
    funFact: 'Voyager 1 carries the Golden Record, carrying sounds and images selected by Carl Sagan.',
  },
  {
    id: 'blood-vessels-vs-earth-equator',
    title: 'Blood Vessels in One Human Body vs. Earth’s Circumference',
    category: 'Biology & Anatomy',
    item1: {
      label: 'Total Length of Blood Vessels in an Adult Body',
      value: 100000,
      unit: 'kilometers',
      formattedValue: '~100,000 km',
      detail: 'If all arteries, veins, and capillaries were laid end-to-end.',
    },
    item2: {
      label: 'Circumference of Earth at the Equator',
      value: 40075,
      unit: 'kilometers',
      formattedValue: '~40,075 km',
      detail: 'Earth’s equatorial circumference.',
    },
    explanation:
      'Your circulatory system is so densely networked that your capillaries and blood vessels would wrap around the Earth 2.5 times!',
    funFact: 'Capillaries are so narrow that red blood cells must travel through them in single file.',
  },
  {
    id: 'bananas-vs-smartphones',
    title: 'Bananas Eaten per Year vs. Smartphones Sold per Year',
    category: 'Humanity & Society',
    item1: {
      label: 'Bananas Consumed Globally per Year',
      value: 1e11,
      unit: 'bananas / year',
      formattedValue: '~100 Billion',
      detail: 'The world’s most exported fresh fruit crop.',
    },
    item2: {
      label: 'Smartphones Shipped Worldwide per Year',
      value: 1.2e9,
      unit: 'smartphones / year',
      formattedValue: '~1.2 Billion',
      detail: 'Total annual global smartphone shipments.',
    },
    explanation:
      'Humans consume roughly 83 bananas for every new smartphone manufactured and sold each year (~2 orders of magnitude).',
    funFact: 'Bananas are naturally slightly radioactive because they contain potassium-40.',
  },
  {
    id: 'blue-whale-vs-t-rex',
    title: 'Mass of an Adult Blue Whale vs. Mass of a T. Rex',
    category: 'Earth & Nature',
    item1: {
      label: 'Mass of an Adult Blue Whale',
      value: 150000,
      unit: 'kilograms (~150 tons)',
      formattedValue: '~150,000 kg',
      detail: 'The largest known animal ever to have existed on Earth.',
    },
    item2: {
      label: 'Estimated Mass of an Adult Tyrannosaurus Rex',
      value: 8000,
      unit: 'kilograms (~8 tons)',
      formattedValue: '~8,000 kg',
      detail: 'Calculated from skeletal volume reconstructions like "Sue".',
    },
    explanation:
      'A blue whale is nearly 19 times heavier than a full-grown T. Rex! The blue whale’s tongue alone weighs as much as an entire adult elephant.',
    funFact: 'A blue whale’s heartbeat can be detected from up to 3 kilometers (2 miles) away underwater.',
  },
  {
    id: 'olympic-pool-drops-vs-century-seconds',
    title: 'Drops of Water in an Olympic Pool vs. Seconds in a Century',
    category: 'Physics & Measurement',
    item1: {
      label: 'Drops of Water in an Olympic Swimming Pool',
      value: 5e7,
      unit: 'drops',
      formattedValue: '~50 Million Drops',
      detail: 'An Olympic pool holds 2.5 million liters; 1 liter is ~20,000 drops.',
    },
    item2: {
      label: 'Seconds in a 100-Year Century',
      value: 3.156e9,
      unit: 'seconds',
      formattedValue: '~3.16 Billion Seconds',
      detail: '100 years × 365.25 days × 86,400 seconds.',
    },
    explanation:
      'Seconds in a century outnumber the drops of water in an Olympic pool by a factor of 63 (~2 orders of magnitude)!',
    funFact: 'An Olympic pool holds enough water for over 10,000 standard home baths.',
  },
  {
    id: 'hours-youtube-vs-hours-farming-history',
    title: 'Annual YouTube Upload Hours vs. Hours since Agriculture Began',
    category: 'Technology & Computing',
    item1: {
      label: 'Hours of Video Uploaded to YouTube in a Single Year',
      value: 2.63e8,
      unit: 'hours / year',
      formattedValue: '~263 Million Hours',
      detail: 'Over 500 hours of video are uploaded to YouTube every minute.',
    },
    item2: {
      label: 'Hours Elapsed since Agriculture Began (~10,000 BCE)',
      value: 1.05e8,
      unit: 'hours',
      formattedValue: '~105 Million Hours',
      detail: 'Roughly 12,026 years × 8,766 hours/year.',
    },
    explanation:
      'In just one single calendar year, humans upload 2.5 times more video to YouTube than the total hours that have ticked away since humanity first invented farming in the Fertile Crescent!',
    funFact: 'It would take a person roughly 30,000 years of continuous viewing to watch one year of YouTube uploads.',
  },
  {
    id: 'ocean-liters-vs-amazon-discharge',
    title: 'World Oceans Water Volume vs. Annual Amazon River Discharge',
    category: 'Earth & Nature',
    item1: {
      label: 'Total Volume of Earth’s Oceans',
      value: 1.335e21,
      unit: 'liters',
      formattedValue: '~1.3 × 10²¹ Liters',
      detail: 'Approximately 1.335 billion cubic kilometers of seawater.',
    },
    item2: {
      label: 'Annual Freshwater Discharge of the Amazon River',
      value: 6.6e15,
      unit: 'liters / year',
      formattedValue: '~6.6 × 10¹⁵ Liters',
      detail: 'Average discharge of 209,000 m³/s into the Atlantic Ocean.',
    },
    explanation:
      'Even though the Amazon River discharges roughly 20% of all global river flow to the oceans, it would take the Amazon over 200,000 years of continuous pouring to fill the world’s ocean basins (~5 orders of magnitude).',
    funFact: 'The Amazon River has no bridges crossing it along its entire 6,400 km length.',
  },
  {
    id: 'commercial-planes-vs-satellites',
    title: 'Active Satellites in Orbit vs. Passenger Planes in the Air',
    category: 'Technology & Computing',
    item1: {
      label: 'Active Artificial Satellites Orbiting Earth',
      value: 9500,
      unit: 'satellites',
      formattedValue: '~9,500 Satellites',
      detail: 'Heavily driven by Starlink and commercial constellations.',
    },
    item2: {
      label: 'Commercial Passenger Planes in the Air at Peak Rush Hour',
      value: 15000,
      unit: 'aircraft',
      formattedValue: '~15,000 Aircraft',
      detail: 'Simultaneously airborne commercial flights during peak global hours.',
    },
    explanation:
      'At any given peak moment, there are roughly 1.5 times more passenger planes aloft in our troposphere than active satellites orbiting above the atmosphere.',
    funFact: 'More than half of all active satellites in orbit today were launched in just the last 4 years.',
  },
  {
    id: 'human-population-vs-domestic-chickens',
    title: 'Domestic Chickens on Earth vs. Human Population',
    category: 'Earth & Nature',
    item1: {
      label: 'Domestic Chickens Alive on Earth at any Moment',
      value: 3.3e10,
      unit: 'chickens',
      formattedValue: '~33 Billion',
      detail: 'FAO livestock census figures.',
    },
    item2: {
      label: 'Humans on Planet Earth',
      value: 8.2e9,
      unit: 'humans',
      formattedValue: '~8.2 Billion',
      detail: 'Current human population.',
    },
    explanation:
      'Chickens outnumber humans 4 to 1 worldwide! They are by far the most numerous bird species on planet Earth.',
    funFact: 'Chickens are the closest living relatives of Tyrannosaurus Rex.',
  },
  {
    id: 'mass-sun-vs-mass-earth',
    title: 'Mass of the Sun vs. Mass of Planet Earth',
    category: 'Space & Astronomy',
    item1: {
      label: 'Mass of the Sun',
      value: 1.989e30,
      unit: 'kilograms',
      formattedValue: '~1.99 × 10³⁰ kg',
      detail: 'Accounts for 99.86% of the total mass of the solar system.',
    },
    item2: {
      label: 'Mass of Planet Earth',
      value: 5.972e24,
      unit: 'kilograms',
      formattedValue: '~5.97 × 10²⁴ kg',
      detail: 'Calculated using Cavendish’s gravitational constant.',
    },
    explanation:
      'The Sun is approximately 333,000 times more massive than planet Earth—a difference of over 5 orders of magnitude.',
    funFact: 'Jupiter accounts for most of the remaining 0.14% mass in the solar system.',
  },
];

/**
 * Returns a prompt pair by its ID.
 */
export function getComparisonById(id: string): RawComparisonPair | undefined {
  return COMPARISON_PAIRS.find((p) => p.id === id);
}

/**
 * Selects 10 random distinct comparison pairs for a session.
 */
export function getRandomSessionPairs(
  count = 10,
  rng: () => number = Math.random
): RawComparisonPair[] {
  const pool = [...COMPARISON_PAIRS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}
