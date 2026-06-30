import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  mulberry32,
  hashValue,
  fallbackBand,
  FALLBACK_BANDS,
  parseUtcDate,
  dateKey,
  isFutureDate,
  isTooFarPast,
  MAX_PAST_DAYS,
  COMING_SOON
} from "./src/band.js";
import { onRequestGet as rootGet } from "./functions/index.js";

const URL_SHAPE = /^https:\/\/[a-z0-9-]+\.bandcamp\.com$/;

test("every fallback URL matches the expected shape", () => {
  assert.ok(FALLBACK_BANDS.length >= 20);
  for (const url of FALLBACK_BANDS) {
    assert.match(url, URL_SHAPE);
  }
});

test("fallbackBand always returns a valid URL", () => {
  for (let i = 0; i < 60; i += 1) {
    assert.match(fallbackBand(new Date(Date.UTC(2026, 0, 1 + i))), URL_SHAPE);
  }
});

test("fallbackBand is deterministic for a given date", () => {
  const d = new Date(Date.UTC(2026, 5, 18));
  assert.equal(fallbackBand(d), fallbackBand(d));
});

test("hashValue is stable FNV-1a", () => {
  assert.equal(hashValue("Newband4me"), hashValue("Newband4me"));
  assert.equal(typeof hashValue("Newband4me"), "number");
  assert.ok(Number.isInteger(hashValue("Newband4me")));
});

test("mulberry32 is deterministic and bounded in [0, 1)", () => {
  const a = mulberry32(42);
  const b = mulberry32(42);
  const seq = [a(), a(), a()];
  assert.deepEqual(seq, [b(), b(), b()]);
  for (const v of seq) {
    assert.ok(v >= 0 && v < 1);
  }
});

test("dateKey zero-pads and is UTC-based", () => {
  assert.equal(
    dateKey(new Date(Date.UTC(2026, 5, 18))),
    "2026-06-18"
  );
  assert.equal(dateKey(new Date(Date.UTC(2026, 0, 1))), "2026-01-01");
});

test("parseUtcDate rejects malformed input and validates calendar dates", () => {
  assert.equal(parseUtcDate("not-a-date"), null);
  assert.equal(parseUtcDate("2026-6-18"), null);
  assert.equal(parseUtcDate("2026-13-01"), null);
  assert.equal(parseUtcDate("2026-02-31"), null);
  assert.ok(parseUtcDate("2026-06-18") instanceof Date);
});

test("isFutureDate flags only strictly-future UTC days", () => {
  const now = new Date(Date.UTC(2026, 5, 23, 12, 0, 0));

  assert.equal(isFutureDate(new Date(Date.UTC(2026, 5, 23)), now), false);
  assert.equal(isFutureDate(new Date(Date.UTC(2026, 5, 24)), now), true);
  assert.equal(isFutureDate(new Date(Date.UTC(2026, 5, 22)), now), false);
});

test("isTooFarPast enforces the MAX_PAST_DAYS window (inclusive boundary)", () => {
  const now = new Date(Date.UTC(2026, 5, 23, 12, 0, 0));
  const DAY = 86400000;

  // boundary: exactly MAX_PAST_DAYS ago is still allowed (not too far)
  const edge = new Date(now.getTime() - MAX_PAST_DAYS * DAY);
  assert.equal(isTooFarPast(edge, now), false);

  // one day older than the window is rejected
  const tooOld = new Date(now.getTime() - (MAX_PAST_DAYS + 1) * DAY);
  assert.equal(isTooFarPast(tooOld, now), true);

  // today and yesterday are allowed
  assert.equal(isTooFarPast(now, now), false);
  assert.equal(isTooFarPast(new Date(now.getTime() - DAY), now), false);
});

test("COMING_SOON sentinel is stable and distinct from fallback URLs", () => {
  assert.equal(COMING_SOON, "<coming-soon>");
  assert.ok(!FALLBACK_BANDS.includes(COMING_SOON));
});

test("root route returns the Cloudflare client IP for curl", async () => {
  const response = await rootGet({
    request: new Request("https://newband4me.com/", {
      headers: {
        accept: "*/*",
        "user-agent": "curl/8.7.1",
        "cf-connecting-ip": "203.0.113.42"
      }
    }),
    next() {
      throw new Error("curl requests should not fall through to static HTML");
    }
  });

  assert.equal(response.status, 200);
  assert.equal(await response.text(), "203.0.113.42\n");
  assert.match(response.headers.get("content-type"), /^text\/plain/);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("root route falls back to x-forwarded-for when Cloudflare IP header is unavailable", async () => {
  const response = await rootGet({
    request: new Request("https://newband4me.com/", {
      headers: {
        "user-agent": "curl/8.7.1",
        "x-forwarded-for": "198.51.100.9, 198.51.100.10"
      }
    }),
    next() {
      throw new Error("curl requests should not fall through to static HTML");
    }
  });

  assert.equal(await response.text(), "198.51.100.9\n");
});

test("root route lets normal browser navigation render the static site", async () => {
  let passedThrough = false;
  const response = await rootGet({
    request: new Request("https://newband4me.com/", {
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "Mozilla/5.0"
      }
    }),
    next() {
      passedThrough = true;
      return new Response("<!doctype html>");
    }
  });

  assert.equal(passedThrough, true);
  assert.equal(await response.text(), "<!doctype html>");
});
