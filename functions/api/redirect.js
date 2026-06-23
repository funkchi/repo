import { bandOfTheDay } from "../../src/band.js";
import { resolveDate } from "./_lib.js";

// GET /api/redirect -> 302 straight to today's Bandcamp page (or ?date=YYYY-MM-DD).
export function onRequestGet({ request }) {
  const { date, error } = resolveDate(request);

  if (error) {
    return new Response(error, { status: 400 });
  }

  return Response.redirect(bandOfTheDay(date), 302);
}
