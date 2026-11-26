import http from "node:http";
import { readFile } from "node:fs/promises";
import { handle } from "./game/api.mjs";
const assets = new Map([
  ["/", ["index.html", "text/html"]],
  ["/duel/game.js", ["public/duel/game.js", "text/javascript"]],
  ["/duel/game.css", ["public/duel/game.css", "text/css"]],
  ["/duel/cover.webp", ["public/duel/cover.webp", "image/webp"]],
]);
const port = Number(process.env.PORT || 4173);
http
  .createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://" + req.headers.host);
      if (/^\/api\/puzzles(?:\/|$)/.test(url.pathname)) {
        const chunks = [];
        let length = 0;
        for await (const chunk of req) {
          length += chunk.length;
          if (length > 1024) {
            res.writeHead(413).end();
            return;
          }
          chunks.push(chunk);
        }
        const r = await handle(
          new Request(url, {
            method: req.method,
            headers: req.headers,
            ...(req.method === "POST" ? { body: Buffer.concat(chunks) } : {}),
          }),
        );
        res.writeHead(r.status, Object.fromEntries(r.headers));
        res.end(Buffer.from(await r.arrayBuffer()));
        return;
      }
      const asset = assets.get(url.pathname);
      if (!asset) {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, { "Content-Type": asset[1] });
      res.end(await readFile(new URL(asset[0], import.meta.url)));
    } catch (e) {
      console.error(e.message);
      if (!res.headersSent) res.writeHead(500);
      res.end();
    }
  })
  .listen(port, "127.0.0.1", () =>
    console.log("One More Tile: http://localhost:" + port),
  );
