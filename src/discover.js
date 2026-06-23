// Server-side daily generation. Runs only inside the Cloudflare Pages Function
// (it uses `fetch` + the KV binding). Hits Bandcamp's undocumented discover API
// with the native random sort, picks one artist per UTC day, and freezes the
// pick in KV so every visitor that day sees the same band.

import {
  mulberry32,
  hashValue,
  utcDayNumber,
  dateKey,
  fallbackBand
} from "./band.js";

const SALT = "Newband4me";
const DISCOVER_URL = "https://bandcamp.com/api/discover/3/get_web?s=rand&p=1";
const UA =
  "Mozilla/5.0 (compatible; newband4me/1.0; +https://newband4me.com)";
const KV_TTL = 60 * 60 * 36; // 36h -- past UTC midnight so the pick is stable

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { "user-agent": UA, accept: "application/json" }
  });

  if (!res.ok) {
    throw new Error(`upstream ${res.status}`);
  }

  return res.json();
}

// Reduce any URL to its origin (https://host) so visitors land on the band's
// main page rather than a specific album -- matches the "band of the day" feel.
function toOrigin(url) {
  if (!url || typeof url !== "string") {
    return null;
  }

  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

// Resolve a discover item to its canonical bandcamp.com URL. The discover
// payload has no direct URL field -- it encodes the band's subdomain in
// `url_hints`. Falls back to defensive direct fields if the shape changes.
function resolveItemUrl(item) {
  const subdomain = item && item.url_hints && item.url_hints.subdomain;

  if (subdomain) {
    return `https://${subdomain}.bandcamp.com`;
  }

  return toOrigin(
    item && (item.band_url || item.url || item.link || item.page_url)
  );
}

// Generate the band for a date, using KV as the per-day cache. Throws on any
// upstream failure -- callers wrap it in generateBandOrFallback.
export async function generateBand(date, env) {
  const key = `band:${dateKey(date)}`;
  const kv = env && env.BANDS_KV;

  const cached = kv ? await kv.get(key) : null;
  if (cached) {
    return cached;
  }

  const data = await fetchJson(DISCOVER_URL);
  const items = Array.isArray(data.items) ? data.items : [];

  if (items.length === 0) {
    throw new Error("discover returned no items");
  }

  const rng = mulberry32((utcDayNumber(date) ^ hashValue(SALT)) >>> 0);
  const index = Math.floor(rng() * items.length);
  const item = items[index];

  const url = resolveItemUrl(item);

  if (!url) {
    throw new Error("could not resolve band url");
  }

  if (kv) {
    await kv.put(key, url, { expirationTtl: KV_TTL });
  }

  return url;
}

// Public entry point: never throws. Falls back to the curated list so the
// endpoint always answers, even if Bandcamp is down or blocks the Worker.
export async function generateBandOrFallback(date, env) {
  try {
    return await generateBand(date, env);
  } catch {
    return fallbackBand(date);
  }
}
