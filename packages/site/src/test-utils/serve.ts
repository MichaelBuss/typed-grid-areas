import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { extname, join, normalize } from "node:path";
import { basePath as base } from "../site.ts";
import { siteDir } from "./tsc.ts";

/** The built site's folder. */
export const dist = join(siteDir, "dist");

const types: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".svg": "image/svg+xml",
};

/**
 * Serves the built site under its base path, as GitHub Pages would, on a
 * free local port. Resolves to the site's root URL and a function that stops
 * the server.
 */
export async function serveDist(): Promise<{ url: string; close: () => void }> {
  const server = createServer((request, response) => {
    const path = normalize(decodeURIComponent(new URL(request.url!, "http://site").pathname));
    const relative = path.startsWith(base) ? path.slice(base.length) : "\0";
    const file = join(
      dist,
      relative,
      relative === "" || relative.endsWith("/") ? "index.html" : "",
    );
    if (!file.startsWith(dist) || !existsSync(file)) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" });
    response.end(readFileSync(file));
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return { url: `http://127.0.0.1:${port}${base}`, close: () => server.close() };
}
