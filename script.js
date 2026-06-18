// A small, hand-picked starting crate. Add or remove URLs freely; the day's
// destination is derived from the UTC date, so every visitor gets the same one.
const bands = [
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

function utcDateKey(date = new Date()) {
  return [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()].join("-");
}

function hashValue(value) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function bandOfTheDay(date = new Date()) {
  const utcDayNumber = Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86400000
  );
  const rotation = hashValue("Bandspotting") % bands.length;

  // Walk the shuffled crate from a stable offset. This keeps the pick global,
  // changes it exactly at UTC midnight, and prevents back-to-back repeats.
  return bands[(utcDayNumber + rotation) % bands.length];
}

document.querySelector("#lucky-button").addEventListener("click", () => {
  const button = document.querySelector("#lucky-button");
  const status = document.querySelector("#status");

  button.disabled = true;
  status.textContent = "Taking you somewhere good…";
  window.location.assign(bandOfTheDay());
});
