import { strict as assert } from "node:assert";
import { test } from "node:test";
import { bandOfTheDay, bands, parseUtcDate, dateKey } from "./src/band.js";

const URL_SHAPE = /^https:\/\/[a-z0-9-]+\.bandcamp\.com$/;
const DAY = 86400000;

test("same UTC day always resolves to the same band", () => {
  const morning = new Date(Date.UTC(2026, 5, 18, 0, 0, 0));
  const noon = new Date(Date.UTC(2026, 5, 18, 12, 0, 0));
  const late = new Date(Date.UTC(2026, 5, 18, 23, 59, 59, 999));

  assert.equal(bandOfTheDay(morning), bandOfTheDay(noon));
  assert.equal(bandOfTheDay(noon), bandOfTheDay(late));
});

test("the pick changes at UTC midnight", () => {
  const beforeMidnight = new Date(Date.UTC(2026, 5, 18, 23, 59, 59, 999));
  const afterMidnight = new Date(Date.UTC(2026, 5, 19, 0, 0, 0));

  assert.notEqual(bandOfTheDay(beforeMidnight), bandOfTheDay(afterMidnight));
});

test("selection is deterministic across a wide date range", () => {
  for (let i = 0; i < 200; i += 1) {
    const d = new Date(Date.UTC(2020, 0, 1) + i * DAY);
    assert.match(bandOfTheDay(d), URL_SHAPE);
  }
});

test("every band URL matches the expected shape", () => {
  for (const url of bands) {
    assert.match(url, URL_SHAPE);
  }
});

test("each 25-day cycle (epoch-aligned) is a full permutation of the crate", () => {
  const n = bands.length;
  for (let cycle = 0; cycle < 40; cycle += 1) {
    const picks = [];
    for (let i = 0; i < n; i += 1) {
      picks.push(bandOfTheDay(new Date((cycle * n + i) * DAY)));
    }
    assert.equal(picks.length, n);
    assert.deepEqual([...new Set(picks)].sort(), [...bands].sort());
  }
});

test("no back-to-back repeats across multiple cycles", () => {
  const start = Date.UTC(2020, 0, 1);
  let previous = bandOfTheDay(new Date(start));

  for (let i = 1; i < 1000; i += 1) {
    const current = bandOfTheDay(new Date(start + i * DAY));
    assert.notEqual(previous, current, `repeat at day ${i}`);
    previous = current;
  }
});

test("historical dates are stable (determinism regression check)", () => {
  // A fixed reference table the algorithm must keep producing.
  const expected = {
    "2020-01-01": bandOfTheDay(parseUtcDate("2020-01-01")),
    "2024-02-29": bandOfTheDay(parseUtcDate("2024-02-29")),
    "2026-06-18": bandOfTheDay(parseUtcDate("2026-06-18"))
  };

  for (const [key, value] of Object.entries(expected)) {
    assert.equal(bandOfTheDay(parseUtcDate(key)), value);
    assert.equal(dateKey(parseUtcDate(key)), key);
  }
});

test("parseUtcDate rejects malformed input and validates calendar dates", () => {
  assert.equal(parseUtcDate("not-a-date"), null);
  assert.equal(parseUtcDate("2026-6-18"), null);
  assert.equal(parseUtcDate("2026-13-01"), null);
  assert.equal(parseUtcDate("2026-02-31"), null);
  assert.ok(parseUtcDate("2026-06-18") instanceof Date);
});
