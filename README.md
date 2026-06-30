# Newband4me

One button. One band a day, picked at random from across Bandcamp, the same
for everyone on a given day. The band is **generated live** from Bandcamp's own
random discovery feed and frozen in a cache at UTC midnight — no curated
playlist, no database to maintain.

> This README is written as a build-along guide. You can read it to understand
> how the site works, or follow the steps to rebuild your own version end to end.
> The live reference is at [newband4me.com](https://newband4me.com).

## What this project demonstrates

- A dependency-free static page that delegates its one dynamic thing to the edge.
- [Cloudflare Pages Functions](https://developers.cloudflare.com/pages/functions/) running server-side logic with no separate Worker.
- [KV](https://developers.cloudflare.com/kv/) used as a per-day cache that keeps every visitor in sync.
- Wrapping an **undocumented public API** (Bandcamp's discover feed) defensively, with a graceful fallback.
- Cheap anti-abuse patterns (a bounded date window + a rate-limit rule).

## Architecture

```
Browser                 Edge (Pages Functions)            Upstream
───────                 ───────────────────────           ────────
curl / ───────────────────────────────>  client IP
index.html ─┐
styles.css  │  static assets              /api/...  ─┐ fetch
script.js ──┤  (served directly)       →  resolve   │ Bandcamp
            │                              date      │ discover
            │                              ↓         │ (s=rand)
            │                           KV (cache)   │
button click ────> /api/redirect ──> resolve ──> 302  │
```

- The page is static; the button just navigates to `/api/redirect`.
- The Function resolves the day's band (from KV cache, or by querying Bandcamp)
  and redirects/returns it.
- KV is the source of truth for "today's band": the first request after UTC
  midnight generates the pick and writes it; every later request reads it.

### File map

```
index.html              # static page: a button + the repeat-mark logo
styles.css              # the look (black/white, centered lucky button)
script.js               # click → /api/redirect (4 lines)
assets/
  repeat-mark.svg       # hand-authored repeat-sign logo (crisp at any DPR)
  favicon.png
  social-media-banner.jpg
src/
  band.js               # PURE helpers: hashing, dates, fallback list. Testable.
  discover.js           # SERVER-ONLY: fetch Bandcamp, pick, cache in KV.
functions/api/
  _lib.js               # shared: resolve date + band, CORS, response helpers
  band.js               # GET /api/band      → JSON { date, url }
  band.txt.js           # GET /api/band.txt  → plain text
  redirect.js           # GET /api/redirect  → 302 to the band page
functions/index.js      # GET / from curl    → client IP, browsers → index.html
test.js                 # node:test unit tests for the pure logic
_headers                # security headers + long cache for /assets/*
package.json            # { "type": "module" } so tests can use ESM
```

## The daily-pick algorithm (the interesting part)

You can't *invent* a Bandcamp URL — `https://random-letters.bandcamp.com`
won't resolve. So a "random band" has to come from Bandcamp's catalog. The trick:

1. **Bandcamp exposes a random sort.** `GET https://bandcamp.com/api/discover/3/get_web?s=rand&p=1`
   returns ~48 random releases as JSON. (Undocumented, but stable enough; see
   *Limitations*.)
2. **Pick one by a date-seeded index.** A small PRNG (`mulberry32`) seeded by the
   UTC day number chooses index `i` in `[0, items.length)`. The band is
   `items[i]`.
3. **Resolve its URL.** The item has no direct URL field — the artist's
   subdomain lives in `items[i].url_hints.subdomain`, so the band page is
   `https://<subdomain>.bandcamp.com`.
4. **Freeze it in KV** under `band:YYYY-MM-DD` (36h TTL). This is what makes
   "every visitor, same band" true: Bandcamp's random feed reshuffles every call,
   so the cache — not the seed — is what keeps the day consistent.
5. **Fall back if anything breaks.** If Bandcamp is down, blocks the request, or
   changes its response shape, `src/discover.js` throws and `generateBandOrFallback`
   returns a deterministic pick from `FALLBACK_BANDS` in `src/band.js`. The
   button never breaks.

## Build it yourself

### Prerequisites

- A [Cloudflare](https://www.cloudflare.com/) account (free tier is enough).
- [Node.js](https://nodejs.org/) installed (only for running the unit tests).
- Git, and a GitHub/GitLab repo Cloudflare Pages can watch.

### 1 — Scaffold the static site

`index.html` is a tiny page: a logo, one button, and a status line. The button
does nothing clever — on click, `script.js` just navigates:

```js
document.querySelector("#lucky-button").addEventListener("click", () => {
  document.querySelector("#lucky-button").disabled = true;
  document.querySelector("#status").textContent = "Taking you somewhere good…";
  window.location.assign("/api/redirect");
});
```

All the magic lives behind `/api/redirect`, which the next steps build.

### 2 — The pure helpers (`src/band.js`)

Keep this module **pure**: no `fetch`, no `window`, no Node globals. That makes
it unit-testable and lets the same code run in the browser and the Function.
It holds:

- `mulberry32(seed)` and `hashValue(str)` — deterministic PRNG + FNV-1a hash.
- `utcDayNumber(date)`, `parseUtcDate("YYYY-MM-DD")`, `dateKey(date)`.
- `isFutureDate` / `isTooFarPast` — the date window (see step 6).
- `COMING_SOON` — the `"<coming-soon>"` sentinel returned for future dates.
- `FALLBACK_BANDS` + `fallbackBand(date)` — the curated safety net.

### 3 — The generator (`src/discover.js`, server-only)

`generateBand(date, env)` does the five algorithm steps above. It reads/writes
KV via `env.BANDS_KV`. `generateBandOrFallback(date, env)` wraps it in a
`try/catch` so it never throws — on any failure it returns `fallbackBand(date)`.

### 4 — The API (`functions/api/`)

Pages Functions map files to routes. `_lib.js` exports a shared `resolveBand`
asynchronous resolver that does, in order: parse `?date=` → reject malformed →
future dates become `COMING_SOON` → too-old dates error → otherwise ask the
generator. The root Function special-cases command-line clients so
`curl newband4me.com` behaves like a tiny `ifconfig.me`, while normal browser
navigation falls through to `index.html`.

| Route | Returns |
| --- | --- |
| `functions/index.js`        | `GET /` from curl   → `200` client IP |
| `functions/api/band.js`     | `GET /api/band`     → `200` JSON `{ date, url }` |
| `functions/api/band.txt.js` | `GET /api/band.txt` → `200` text/plain |
| `functions/api/redirect.js` | `GET /api/redirect` → `302` to the band page |

The band routes send `Access-Control-Allow-Origin: *` and honor
`?date=YYYY-MM-DD`. The root IP response is `text/plain` with `Cache-Control:
no-store`.

### 5 — Test the pure logic

```sh
node test.js
```

`test.js` covers the helpers and invariants (date parsing, the 14-day window
boundaries, PRNG determinism, fallback shape). The live `fetch` + KV path
isn't unit-testable in Node — it runs only in the Function — so keep that logic
thin and defensive.

### 6 — Deploy to Cloudflare Pages

Connect the repo in **Workers & Pages → Create → Pages → Connect to git** and use:

- **Framework preset:** `None`
- **Build command:** leave blank
- **Build output directory:** `.`

There are no dependencies and no build step. The `functions/api/*` routes are
picked up automatically as Pages Functions.

### 7 — Bind KV (required for the "same band for everyone" guarantee)

The generator caches the day's pick in KV. Without it, the site still works
(via the fallback), but each visitor could see a different band.

1. **Workers & Pages → KV →** create a namespace, e.g. `BANDS`.
2. **Pages project → Settings → Functions → KV namespace bindings →** add:
   - **Variable name:** `BANDS_KV`
   - **KV namespace:** `BANDS`

The code reads `env.BANDS_KV`, so the variable name must match exactly.

### 8 — (Optional) Custom domain

**Pages project → Custom domains →** add yours. For an apex domain to resolve,
Cloudflare needs the DNS record pointing it at `<project>.pages.dev`.

## API reference

The root route returns the requester IP for CLI clients and the static app for
normal browsers. The `/api/*` routes return today's band (UTC) and accept
`?date=YYYY-MM-DD` to look up another day. Future dates return the sentinel
`<coming-soon>`; dates older than the last 14 days return `400 Date out of
range` (this bounds upstream cost — see *Limitations*).

| Route | Response | Example |
| --- | --- | --- |
| `GET /` | client IP for curl; static site for browsers | `curl -L newband4me.com` |
| `GET /api/band` | JSON `{ date, url }` | `curl https://newband4me.com/api/band` |
| `GET /api/band.txt` | plain-text URL | `curl https://newband4me.com/api/band.txt` |
| `GET /api/redirect` | `302` to the Bandcamp page | `curl -sL https://newband4me.com/api/redirect` |

```sh
curl -sL newband4me.com                                          # your IP
curl -s https://newband4me.com/api/band.txt                      # today's band
curl -s 'https://newband4me.com/api/band.txt?date=2026-06-29'    # a specific day
curl -s https://newband4me.com/api/band | jq                     # JSON
```

> If Cloudflare's **Always Use HTTPS** redirect is enabled, a bare
> `curl newband4me.com` still prints Cloudflare's `301` before this Function can
> run. Use `curl -L newband4me.com`, include `https://`, or disable that redirect
> if you want plain HTTP requests to return the IP directly.

## Customization

- **Rebrand:** edit `index.html`, `styles.css`, and `assets/repeat-mark.svg`.
  Swap the wordmark, colors, and logo — no logic to touch.
- **Your own fallback list:** edit `FALLBACK_BANDS` in `src/band.js`. These are
  the bands used *only* when the live fetch fails, so pick ones you trust.
- **Window size:** change `MAX_PAST_DAYS` in `src/band.js` to widen or narrow
  how far back `?date=` lookups are accepted.
- **Land on a release instead of the artist page:** in `src/discover.js`, use
  `item.url_hints.slug` and `item.url_hints.item_type` to build
  `https://<subdomain>.bandcamp.com/<type>/<slug>`.

## Limitations & notes

- **Undocumented upstream.** Bandcamp's discover endpoint isn't an official API.
  It's stable today but could change; the curated fallback absorbs any breakage
  (the site keeps working, just from the fallback list until you fix it).
- **KV consistency window.** KV is eventually consistent, so in the first minute
  after UTC midnight two edges could briefly generate different picks before the
  write propagates. Acceptable for a daily-pick site.
- **Free-tier ceilings.** Cloudflare Pages caps Function invocations and KV
  reads/writes per day. The per-day caching keeps upstream load to ~1 fetch/day;
  the 14-day date window caps the per-date cache-miss blast radius at 15 entries.
- **Anti-abuse.** Beyond the date window, add a dashboard rate-limit rule:
  **Security → WAF → Rate limiting rules** → `URI Path starts with "/api/"`,
  count by IP, e.g. 30 requests / 10s → block. Tune to taste.

## License

Source code is released under the MIT License. Band names, artwork, and audio
belong to their respective artists — visit and support them on Bandcamp.
