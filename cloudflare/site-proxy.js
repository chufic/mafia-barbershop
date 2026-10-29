/**
 * Optional free edge proxy for visitors whose ISP cannot reliably reach the
 * Netlify shared edge. Deploy as a Cloudflare Worker on a workers.dev hostname.
 * The app, Turso database, booking APIs and Telegram webhook remain on Netlify;
 * this Worker forwards the complete request/response path without storing data.
 */
const ORIGIN = "https://mafiabarber.netlify.app";

export default {
  async fetch(request) {
    const incoming = new URL(request.url);
    const upstreamUrl = new URL(incoming.pathname + incoming.search, ORIGIN);

    const upstreamRequest = new Request(upstreamUrl, request);
    const headers = new Headers(upstreamRequest.headers);
    headers.delete("host");
    const clientIp = request.headers.get("cf-connecting-ip");
    if (clientIp) headers.set("x-forwarded-for", clientIp);
    const forwardedRequest = new Request(upstreamRequest, { headers, redirect: "manual" });

    const upstream = await fetch(forwardedRequest);
    const responseHeaders = new Headers(upstream.headers);
    const location = responseHeaders.get("location");
    if (location?.startsWith(ORIGIN)) {
      responseHeaders.set("location", incoming.origin + location.slice(ORIGIN.length));
    }

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  },
};
