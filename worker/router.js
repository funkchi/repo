const PAGES_ORIGIN = "https://newband4me.pages.dev";
const CLI_USER_AGENT =
  /\b(curl|wget|httpie|python-requests|go-http-client|libwww-perl|postmanruntime|insomnia)\b/i;

function isCliRequest(request) {
  return CLI_USER_AGENT.test(request.headers.get("user-agent") || "");
}

function pagesRequest(request, pathname = null) {
  const url = new URL(request.url);
  const targetPathname = pathname || url.pathname;
  const target = new URL(`${targetPathname}${url.search}`, PAGES_ORIGIN);

  return new Request(target, request);
}

export async function handleRequest(request) {
  const url = new URL(request.url);

  if (url.pathname === "/" && isCliRequest(request)) {
    return fetch(pagesRequest(request, "/api/band.txt"));
  }

  return fetch(pagesRequest(request));
}

export default {
  fetch: handleRequest
};
