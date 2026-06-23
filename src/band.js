// Shared, environment-agnostic selection logic. Imported by the browser
// (script.js) and by the Cloudflare Pages Functions. No DOM, no Node globals.

export const bands = [
  "https://alvvays.bandcamp.com",
  "https://blackcountrynewroad.bandcamp.com",
  "https://blackmidi.bandcamp.com",
  "https://carseatheadrest.bandcamp.com",
  "https://crumbtheband.bandcamp.com",
  "https://drycleaning.bandcamp.com",
  "https://explosionsinthesky.bandcamp.com",
  "https://fleetfoxes.bandcamp.com",
  "https://fontainesdc.bandcamp.com",
  "https://glassbeams.bandcamp.com",
  "https://godspeedyoublackemperor.bandcamp.com",
  "https://illuminatihotties.bandcamp.com",
  "https://jockstrapmusic.bandcamp.com",
  "https://kinggizzard.bandcamp.com",
  "https://khruangbin.bandcamp.com",
  "https://menitrust.bandcamp.com",
  "https://mountkimbie.bandcamp.com",
  "https://parannoul.bandcamp.com",
  "https://squiduk.bandcamp.com",
  "https://thecometiscoming.bandcamp.com",
  "https://thelazyeyes.bandcamp.com",
  "https://turnstilehardcore.bandcamp.com",
  "https://wednesdayband.bandcamp.com",
  "https://wetleg.bandcamp.com",
  "https://yves-tumor.bandcamp.com"
];

const SALT = "Newband4me";

// FNV-1a 32-bit hash.
function hashValue(value) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

// mulberry32 seeded PRNG -> [0, 1).
function mulberry32(seed) {
  let a = seed >>> 0;

  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Deterministic Fisher-Yates shuffle of a copy.
function seededShuffle(input, seed) {
  const out = input.slice();
  const rng = mulberry32(seed);

  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }

  return out;
}

function utcDayNumber(date) {
  return Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86400000
  );
}

// Shuffle order for a given cycle index. If the cycle's first pick would
// repeat the previous cycle's last band, swap the first two picks. The swap
// never touches the cycle's final slot, so each cycle's last band is the raw
// shuffle's last band -- that keeps the guard O(1) (no recursion).
function effectiveOrder(cycle) {
  const order = seededShuffle(bands, hashValue(`${SALT}/${cycle}`));

  if (cycle > 0 && bands.length > 1) {
    const previousCycleLast = seededShuffle(
      bands,
      hashValue(`${SALT}/${cycle - 1}`)
    )[bands.length - 1];

    if (order[0] === previousCycleLast) {
      const tmp = order[0];
      order[0] = order[1];
      order[1] = tmp;
    }
  }

  return order;
}

export function bandOfTheDay(date = new Date()) {
  const day = utcDayNumber(date);
  const n = bands.length;
  const cycle = Math.floor(day / n);
  const position = ((day % n) + n) % n;

  return effectiveOrder(cycle)[position];
}

// Parse a YYYY-MM-DD string as a UTC-midnight Date. Returns null if invalid.
export function parseUtcDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

export function dateKey(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
