import { parseUtcDate } from "../../src/band.js";

// Resolve the requested date from the `?date=YYYY-MM-DD` query parameter.
// Falls back to "now" (UTC) when omitted. Returns { date } or { error }.
export function resolveDate(request) {
  const url = new URL(request.url);

  if (!url.searchParams.has("date")) {
    return { date: new Date() };
  }

  const parsed = parseUtcDate(url.searchParams.get("date"));

  if (!parsed) {
    return { error: "Invalid date. Use YYYY-MM-DD." };
  }

  return { date: parsed };
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
