# Newband4me

A tiny daily portal to a Bandcamp band page. Every visitor gets the same band
for a given UTC date. The pick is **generated live** from Bandcamp's random
discover feed and frozen per day — not a fixed list.

Live domain: [newband4me.com](https://newband4me.com)

## How it works

Each UTC day, the Worker asks Bandcamp's discover API for a random batch of
releases (`s=rand`), picks one by a date-seeded index, and stores the band URL
in **KV** under `band:YYYY-MM-DD`. Every request that day reads from KV, so all
visitors agree and the upstream is hit only ~once per day. If the live fetch
ever fails (Bandcamp down, blocked, or shape change), it falls back to a small
curated list in `src/band.js` so the button always works.

## Deploy to Cloudflare Pages

Connect the repository in Cloudflare Pages and use:

- Framework preset: `None`
- Build command: leave blank
- Build output directory: `.`

There are no dependencies and no build step. The `functions/api/*` routes are
served by [Pages Functions](https://developers.cloudflare.com/pages/functions/)
automatically — no separate Worker to configure.

### KV binding (required)

The generator needs a KV namespace for the per-day cache:

1. **Workers & Pages → KV →** create a namespace, e.g. `BANDS`.
2. **Pages project → Settings → Functions → KV namespace bindings →** add:
   - Variable name: `BANDS_KV`
   - KV namespace: `BANDS`

Without the binding the site still works (curated fallback) but loses the
"every visitor, same band" guarantee — KV is what freezes the day's pick.

Run `node test.js` to verify the pure-logic invariants (the live fetch + KV
path runs only in the Worker).

After the first deployment, add `newband4me.com` under **Custom domains** in
the Cloudflare Pages project. For the apex domain to resolve, Cloudflare Pages
needs the DNS record that points `newband4me.com` at `newband4me.pages.dev`.

## API

All routes return today's band (UTC) and accept `?date=YYYY-MM-DD` to look up
another day. Responses are CORS-enabled (`Access-Control-Allow-Origin: *`).
Future dates return the sentinel `<coming-soon>`; dates older than the last
14 days return `400 Date out of range` (bounds per-date upstream cost).

> **Always include the `https://` scheme with curl.** Cloudflare redirects
> plain `http://` (or a bare `newband4me.com/...`) to HTTPS with a `301`, so a
> plain `curl newband4me.com/...` prints the redirect instead of the response.
> Use `https://` (or pass `-L` to follow redirects).

| Route | Response | Example |
| --- | --- | --- |
| `GET /api/band` | JSON `{ date, url }` | `curl https://newband4me.com/api/band` |
| `GET /api/band.txt` | plain-text URL | `curl https://newband4me.com/api/band.txt` |
| `GET /api/redirect` | `302` to the Bandcamp page | `curl -sL https://newband4me.com/api/redirect` |

### CLI usage

```sh
# today's band, URL only
curl -s https://newband4me.com/api/band.txt

# any date (future dates return "<coming-soon>")
curl -s 'https://newband4me.com/api/band.txt?date=2026-07-04'

# JSON with date + url
curl -s https://newband4me.com/api/band | jq

# open today's band directly
curl -sL -o /dev/null -w '%{redirect_url}\n' https://newband4me.com/api/redirect
```

## Abuse limits

Two layers keep a `curl`-loop from exhausting the daily KV-write quota or
getting the site blocked by Bandcamp:

1. **Date window (code).** `?date=` is accepted only for today and the previous
   `MAX_PAST_DAYS` (14) days; anything older returns `400`. This caps the
   per-date cache-miss blast radius at 15 upstream fetches total, regardless of
   how many distinct dates a client requests.
2. **Rate limiting (Cloudflare).** In the dashboard, **Security → WAF → Rate
   limiting rules → Create rule**, e.g.:
   - **If:** `URI Path starts with /api/`
   - **Counting characteristics:** IP address
   - **Period:** 10 seconds · **Requests:** 30
   - **Then:** Block for 60 seconds

   Tune the threshold to taste. Free tier includes rate-limiting rules.
