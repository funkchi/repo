import { resolveBand, plainText } from "./_lib.js";

// GET /api/band.txt -> plain-text Bandcamp URL for today (or ?date=YYYY-MM-DD).
// Returns "<coming-soon>" for future dates.
export async function onRequestGet({ request, env }) {
  const { url, error } = await resolveBand(request, env);

  if (error) {
    return plainText(error, 400);
  }

  return plainText(url);
}
