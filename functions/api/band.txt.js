import { bandOfTheDay } from "../../src/band.js";
import { resolveDate, corsHeaders } from "./_lib.js";

// GET /api/band.txt -> plain-text Bandcamp URL for today (or ?date=YYYY-MM-DD).
export function onRequestGet({ request }) {
  const { date, error } = resolveDate(request);

  if (error) {
    return new Response(error + "\n", {
      status: 400,
      headers: { "content-type": "text/plain; charset=utf-8", ...corsHeaders }
    });
  }

  return new Response(bandOfTheDay(date) + "\n", {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      ...corsHeaders,
      "cache-control": "public, max-age=300"
    }
  });
}
