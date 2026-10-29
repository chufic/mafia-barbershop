/**
 * Deno Deploy edge proxy for the Mafia barbershop site.
 *
 * Same job as cloudflare/site-proxy.js: visitors whose ISP cannot reach the
 * Netlify shared edge get the identical site through a *.deno.dev hostname.
 * The app, Turso database, booking APIs and the Telegram webhook stay on
 * Netlify; this proxy forwards the whole request/response path and stores
 * nothing.
 *
 * Deploy: Deno Deploy project -> entry point deno/proxy.ts
 */
const ORIGIN = "https://mafiabarber.netlify.app";

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
]);

async function handler(request: Request): Promise<Response> {
  const incoming = new URL(request.url);
  const target = new URL(incoming.pathname + incoming.search, ORIGIN);

  const headers = new Headers(request.headers);
  for (const name of HOP_BY_HOP) headers.delete(name);

  const hasBody = request.method !== "GET" && request.method !== "HEAD";

  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: hasBody ? request.body : undefined,
    redirect: "manual",
  });

  // Pass the upstream response through unchanged so Content-Length and
  // Content-Encoding keep matching the compressed Next.js bundles.
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: upstream.headers,
  });
}

Deno.serve(handler);
