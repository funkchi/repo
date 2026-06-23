import { bandOfTheDay, dateKey } from "../../src/band.js";
import { resolveDate, json } from "./_lib.js";

// GET /api/band -> { date: "YYYY-MM-DD", url: "https://...bandcamp.com" }
// Optional ?date=YYYY-MM-DD overrides "today".
export function onRequestGet({ request }) {
  const { date, error } = resolveDate(request);

  if (error) {
    return json({ error }, 400);
  }

  return json({ date: dateKey(date), url: bandOfTheDay(date) });
}
