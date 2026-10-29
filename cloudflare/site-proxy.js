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
    const clientIp = request.headers.get("cf-connecting-ip");
    if (clientIp) upstreamRequest.headers.set("x-forwarded-for", clientIp);

    // Return the upstream Response directly. Rebuilding it can leave a stale
    // Content-Length/Content-Encoding pair on compressed Next.js bundles,
    // which some mobile browsers keep waiting for instead of finishing load.
    return fetch(upstreamRequest);
  },
};
