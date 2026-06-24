// Pure, environment-agnostic helpers shared by the Cloudflare Pages Function
// (src/discover.js) and the tests. No DOM, no Node globals, no fetch -- this
// module stays synchronous so it is trivially testable. The live daily pick
// is generated server-side; the list below is the failure-only fallback.

const SALT = "Newband4me";

// Sentinel returned for date lookups that fall after today (UTC).
export const COMING_SOON = "<coming-soon>";

// How far back a ?date= lookup may go. Bounds the per-date cache-miss blast
// radius (each distinct past date = one upstream fetch + one KV write) so an
// attacker iterating dates can't exhaust the daily KV-write quota or hammer
// Bandcamp. Today + this many past days are accepted.
export const MAX_PAST_DAYS = 14;

// Used only when the live discover fetch fails (Bandcamp down, blocked, or
// changes shape). Keeps the button working no matter what.
export const FALLBACK_BANDS = [
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

// FNV-1a 32-bit hash.
export function hashValue(value) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

// mulberry32 seeded PRNG -> [0, 1).
export function mulberry32(seed) {
  let a = seed >>> 0;

  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function utcDayNumber(date) {
  return Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86400000
  );
}

// Deterministic fallback pick from the curated list.
export function fallbackBand(date = new Date()) {
  const day = utcDayNumber(date);
  const rotation = hashValue(SALT) % FALLBACK_BANDS.length;

  return FALLBACK_BANDS[(day + rotation) % FALLBACK_BANDS.length];
}

// A date is "future" when its UTC day-number is strictly greater than now's.
export function isFutureDate(date, now = new Date()) {
  return utcDayNumber(date) > utcDayNumber(now);
}

// A date is "too far past" when it's older than MAX_PAST_DAYS before today.
export function isTooFarPast(date, now = new Date()) {
  return utcDayNumber(date) < utcDayNumber(now) - MAX_PAST_DAYS;
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
