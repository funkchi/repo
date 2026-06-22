# Newband4me

A tiny daily portal to a Bandcamp band page. Every visitor gets the same band
for a given UTC date.

Live domain: [newband4me.com](https://newband4me.com)

## Deploy to Cloudflare Pages

Connect the repository in Cloudflare Pages and use:

- Framework preset: `None`
- Build command: leave blank
- Build output directory: `.`

There are no dependencies and no build step.

Run `node test.js` to verify the UTC daily-selection invariant.

After the first deployment, add `newband4me.com` under **Custom domains** in
the Cloudflare Pages project. For the apex domain to resolve, Cloudflare Pages
needs the DNS record that points `newband4me.com` at `newband4me.pages.dev`.
