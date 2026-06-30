function isCliRequest(request) {
  const userAgent = request.headers.get("user-agent") || "";

  return /\b(curl|wget|httpie|python-requests|go-http-client|libwww-perl|postmanruntime|insomnia)\b/i.test(
    userAgent
  );
}

function wantsBrowserHtml(request) {
  const accept = request.headers.get("accept") || "";

  return accept.includes("text/html") && !isCliRequest(request);
}

function clientIp(request) {
  const forwardedFor = request.headers.get("x-forwarded-for") || "";

  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    forwardedFor.split(",")[0].trim()
  );
}

function plainIp(ip) {
  return new Response(`${ip}\n`, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*"
    }
  });
}

// GET / -> client IP for curl/CLI clients, static index.html for browsers.
export async function onRequestGet(context) {
  if (wantsBrowserHtml(context.request)) {
    return context.next();
  }

  const ip = clientIp(context.request);

  if (!ip) {
    return new Response("Client IP unavailable\n", {
      status: 502,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store"
      }
    });
  }

  return plainIp(ip);
}
