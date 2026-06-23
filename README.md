# Newband4me

A tiny daily portal to a Bandcamp band page. Every visitor gets the same band
for a given UTC date.

Live domain: [newband4me.com](https://newband4me.com)

## Deploy to Cloudflare Pages

Connect the repository in Cloudflare Pages and use:

- Framework preset: `None`
- Build command: leave blank
- Build output directory: `.`

There are no dependencies and no build step. The `functions/api/*` routes are
served by [Pages Functions](https://developers.cloudflare.com/pages/functions/)
automatically — no separate Worker to configure.

Run `node test.js` to verify the daily-selection invariants.

After the first deployment, add `newband4me.com` under **Custom domains** in
the Cloudflare Pages project. For the apex domain to resolve, Cloudflare Pages
needs the DNS record that points `newband4me.com` at `newband4me.pages.dev`.

## API

All routes return today's band (UTC) and accept `?date=YYYY-MM-DD` to look up
any other day. Responses are CORS-enabled (`Access-Control-Allow-Origin: *`).

| Route | Response | Example |
| --- | --- | --- |
| `GET /api/band` | JSON `{ date, url }` | `curl newband4me.com/api/band` |
| `GET /api/band.txt` | plain-text URL | `curl newband4me.com/api/band.txt` |
| `GET /api/redirect` | `302` to the Bandcamp page | `curl -sL newband4me.com/api/redirect` |

### CLI usage

```sh
# today's band, URL only
curl -s newband4me.com/api/band.txt

# any date
curl -s 'newband4me.com/api/band.txt?date=2026-07-04'

# JSON with date + url
curl -s newband4me.com/api/band | jq

# open today's band directly
curl -sL -o /dev/null -w '%{redirect_url}\n' newband4me.com/api/redirect
```
