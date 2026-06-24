import {
  parseUtcDate,
  isFutureDate,
  isTooFarPast,
  COMING_SOON
} from "../../src/band.js";
import { generateBandOrFallback } from "../../src/discover.js";

// Resolve the requested date and the band URL for it.
// - Honors `?date=YYYY-MM-DD` (defaults to now, UTC).
// - Returns { error } on a malformed or out-of-range date.
// - Future dates -> COMING_SOON. Dates older than MAX_PAST_DAYS -> error.
// - Otherwise { date, url } with the URL generated live and frozen in KV.
export async function resolveBand(request, env) {
  const requestUrl = new URL(request.url);
  let date = new Date();

  if (requestUrl.searchParams.has("date")) {
    const parsed = parseUtcDate(requestUrl.searchParams.get("date"));

    if (!parsed) {
      return { error: "Invalid date. Use YYYY-MM-DD." };
    }

    date = parsed;
  }

  if (isFutureDate(date)) {
    return { date, url: COMING_SOON };
  }

  if (isTooFarPast(date)) {
    return { error: "Date out of range. Only the last 14 days are available." };
  }

  const url = await generateBandOrFallback(date, env);

  return { date, url };
}

export const corsHeaders = {
  "access-control-allow-origin": "*"
};

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders,
      "cache-control": "public, max-age=300"
    }
  });
}
