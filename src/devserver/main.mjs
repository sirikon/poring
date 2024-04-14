import http from "node:http";
import { join, extname } from "path";
import { readFile } from "fs";
import { lookup } from "mime-types";

const HOST = "127.0.0.1";
const PORT = 8000;

const STATIC_ROUTES = [
  ["/lib/", "src/lib"],
  ["/node_modules/mocha/", "node_modules/mocha"],
  ["/tests/specs/", "src/tests"],
  ["/tests/", "src/devserver/tests-static"],
  ["/", "src/example"],
];

async function main() {
  startHttpServer(async (req, res) => {
    const url = new URL("internal:" + req.url).pathname;
    for (const [prefix, dir] of STATIC_ROUTES) {
      if (url === prefix.substring(0, prefix.length - 1)) {
        res.writeHead(302, { Location: prefix });
        res.end();
        return;
      }
      if (url.startsWith(prefix)) {
        replyStatic(dir, url.substring(prefix.length), res);
        return;
      }
    }
    replyNotFound(res);
  });
}

function startHttpServer(handler) {
  http
    .createServer((req, res) => {
      try {
        handler(req, res);
      } catch {
        replyError(res);
      }
    })
    .listen(PORT, HOST);
}

function replyStatic(baseDir, _url, res) {
  const url = _url === "" ? "index.html" : _url;
  const filePath = join(baseDir, url);
  readFile(filePath, (err, content) => {
    if (err) {
      if (err.code == "ENOENT") {
        replyNotFound(res);
      } else {
        replyError(ers);
      }
      return;
    }
    res.writeHead(200, { "Content-Type": lookup(extname(filePath)) });
    res.end(content, "utf-8");
  });
}

function replyNotFound(res) {
  res.writeHead(404, { "Content-Type": "text/html" });
  res.end("<h1>404: Could not find the resource</h1>");
}

function replyError(res) {
  res.writeHead(500, { "Content-Type": "text/html" });
  res.end("<h1>500: Server Error</h1>");
}

await main();
