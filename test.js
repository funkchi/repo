const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const source = fs.readFileSync("script.js", "utf8");
const scriptOnly = source.slice(0, source.indexOf("document.querySelector"));
const context = {};

vm.createContext(context);
vm.runInContext(`${scriptOnly}\nthis.getBand = bandOfTheDay;`, context);

function getDateKey(date) {
  return [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()].join("-");
}

const sameUtcDay = [
  new Date("2026-06-18T00:00:00.000Z"),
  new Date("2026-06-18T12:00:00.000Z"),
  new Date("2026-06-18T23:59:59.999Z")
];

assert.deepEqual(
  sameUtcDay.map(getDateKey),
  ["2026-6-18", "2026-6-18", "2026-6-18"]
);
assert.equal(new Set(sameUtcDay.map(context.getBand)).size, 1);
assert.match(context.getBand(sameUtcDay[0]), /^https:\/\/[a-z0-9-]+\.bandcamp\.com$/);

const eitherSideOfMidnight = [
  new Date("2026-06-18T23:59:59.999Z"),
  new Date("2026-06-19T00:00:00.000Z")
];

assert.notEqual(
  getDateKey(eitherSideOfMidnight[0]),
  getDateKey(eitherSideOfMidnight[1])
);
assert.notEqual(
  context.getBand(eitherSideOfMidnight[0]),
  context.getBand(eitherSideOfMidnight[1])
);

console.log("UTC daily selection tests passed.");
