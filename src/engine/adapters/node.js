// @ts-check

/**
 * PromptJS v1.0.0 — Adapter: Node Server
 * ============================================================================
 *
 * Generates a self-contained Node.js HTTP server (`server.js`) from
 * compiled output. The server serves static files, matches routes,
 * and optionally proxies API requests.
 *
 * Usage:
 *   pjs build --adapter node
 *   node dist/server.js          # Start on port 3000
 *   PORT=8080 node dist/server.js
 *
 * Zero-dependency — generated server.js only uses Node.js built-ins.
 */

'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Generate the server.js content for a Node.js adapter.
 *
 * @param {Object} [opts] - Adapter options
 * @param {string} [opts.outDir] - Output directory (where files were written)
 * @param {boolean} [opts.isSPA] - Whether this is an SPA build
 * @param {string[]} [opts.routes] - Route paths (for SPA route table)
 * @param {string} [opts.apiUrl] - Backend API URL for proxying
 * @returns {string} server.js content
 */
function generateServerJS(opts) {
  opts = opts || {};
  const isSPA = opts.isSPA;
  const apiUrl = opts.apiUrl || '';

  let serverCode = '';
  serverCode += '// PromptJS v1.0.0 — Node.js Server\n';
  serverCode += '// Auto-generated. Do not edit.\n';
  serverCode += '// Usage: node server.js [PORT]\n\n';
  serverCode += 'var http = require("http");\n';
  serverCode += 'var fs = require("fs");\n';
  serverCode += 'var path = require("path");\n';
  serverCode += 'var url = require("url");\n\n';

  serverCode += 'var PORT = parseInt(process.env.PORT || "3000", 10);\n';
  serverCode += 'var STATIC_DIR = path.join(__dirname);\n';
  serverCode += 'var MIME_TYPES = {\n';
  serverCode += '  ".html": "text/html; charset=utf-8",\n';
  serverCode += '  ".js": "application/javascript; charset=utf-8",\n';
  serverCode += '  ".css": "text/css; charset=utf-8",\n';
  serverCode += '  ".json": "application/json; charset=utf-8",\n';
  serverCode += '  ".png": "image/png",\n';
  serverCode += '  ".jpg": "image/jpeg",\n';
  serverCode += '  ".jpeg": "image/jpeg",\n';
  serverCode += '  ".gif": "image/gif",\n';
  serverCode += '  ".svg": "image/svg+xml",\n';
  serverCode += '  ".ico": "image/x-icon",\n';
  serverCode += '  ".woff": "font/woff",\n';
  serverCode += '  ".woff2": "font/woff2",\n';
  serverCode += '  ".txt": "text/plain; charset=utf-8",\n';
  serverCode += '  ".xml": "application/xml; charset=utf-8",\n';
  serverCode += '  ".webmanifest": "application/manifest+json"\n';
  serverCode += '};\n\n';

  if (isSPA) {
    // SPA: all routes serve index.html (client-side router handles it)
    serverCode += '// SPA mode: serve index.html for all non-static routes\n';
    serverCode += 'var INDEX_HTML = null;\n';
    serverCode +=
      'try { INDEX_HTML = fs.readFileSync(path.join(STATIC_DIR, "index.html"), "utf-8"); }\n';
    serverCode += 'catch(e) { INDEX_HTML = "<h1>Error: index.html not found</h1>"; }\n\n';

    serverCode += 'function serveSPA(req, res) {\n';
    serverCode += '  var parsed = url.parse(req.url);\n';
    serverCode += '  var pathname = parsed.pathname;\n\n';

    // Serve static files first (js, css, assets)
    serverCode += '  // Try static file first\n';
    serverCode += '  var filePath = path.join(STATIC_DIR, pathname);\n';
    serverCode +=
      '  if (pathname !== "/" && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {\n';
    serverCode += '    serveStaticFile(filePath, res);\n';
    serverCode += '    return;\n';
    serverCode += '  }\n\n';

    // Fallback to index.html for all routes
    serverCode += '  // SPA fallback: serve index.html\n';
    serverCode += '  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });\n';
    serverCode += '  res.end(INDEX_HTML);\n';
    serverCode += '}\n\n';
  } else {
    // MPA: serve per-page HTML files
    serverCode += '// MPA mode: serve HTML files per route\n\n';
    serverCode += 'function serveMPA(req, res) {\n';
    serverCode += '  var parsed = url.parse(req.url);\n';
    serverCode += '  var pathname = parsed.pathname;\n\n';

    serverCode += '  // Root → index.html\n';
    serverCode += '  if (pathname === "/") {\n';
    serverCode += '    pathname = "/index.html";\n';
    serverCode +=
      '  } else if (!pathname.endsWith(".html") && !pathname.endsWith(".js") && !pathname.endsWith(".css") && !path.extname(pathname)) {\n';
    serverCode += '    pathname = pathname + ".html";\n';
    serverCode += '  }\n\n';

    serverCode += '  var filePath = path.join(STATIC_DIR, pathname);\n';
    serverCode += '  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {\n';
    serverCode += '    serveStaticFile(filePath, res);\n';
    serverCode += '  } else {\n';
    serverCode += '    // Try 404.html\n';
    serverCode += '    var notFoundPath = path.join(STATIC_DIR, "404.html");\n';
    serverCode += '    if (fs.existsSync(notFoundPath)) {\n';
    serverCode += '      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });\n';
    serverCode += '      res.end(fs.readFileSync(notFoundPath, "utf-8"));\n';
    serverCode += '    } else {\n';
    serverCode += '      res.writeHead(404, { "Content-Type": "text/plain" });\n';
    serverCode += '      res.end("404 Not Found");\n';
    serverCode += '    }\n';
    serverCode += '  }\n';
    serverCode += '}\n\n';
  }

  // Static file server
  serverCode += 'function serveStaticFile(filePath, res) {\n';
  serverCode += '  var ext = path.extname(filePath).toLowerCase();\n';
  serverCode += '  var contentType = MIME_TYPES[ext] || "application/octet-stream";\n';
  serverCode += '  try {\n';
  serverCode += '    var content = fs.readFileSync(filePath);\n';
  serverCode += '    res.writeHead(200, {\n';
  serverCode += '      "Content-Type": contentType,\n';
  serverCode += '      "Cache-Control": "public, max-age=31536000, immutable"\n';
  serverCode += '    });\n';
  serverCode += '    res.end(content);\n';
  serverCode += '  } catch(e) {\n';
  serverCode += '    res.writeHead(500, { "Content-Type": "text/plain" });\n';
  serverCode += '    res.end("Internal Server Error");\n';
  serverCode += '  }\n';
  serverCode += '}\n\n';

  // API proxy (if configured)
  if (apiUrl) {
    serverCode += '// API proxy\n';
    serverCode += 'var API_URL = "' + apiUrl + '";\n\n';
    serverCode += 'function proxyApi(req, res) {\n';
    serverCode += '  var parsed = url.parse(req.url);\n';
    serverCode += '  var proxyUrl = API_URL + parsed.pathname + (parsed.search || "");\n\n';
    serverCode += '  var body = [];\n';
    serverCode += '  req.on("data", function(chunk) { body.push(chunk); });\n';
    serverCode += '  req.on("end", function() {\n';
    serverCode += '    var options = url.parse(proxyUrl);\n';
    serverCode += '    options.method = req.method;\n';
    serverCode += '    options.headers = Object.assign({}, req.headers, { host: options.host });\n';
    serverCode +=
      '    if (body.length > 0) options.headers["Content-Length"] = Buffer.concat(body).length;\n\n';
    serverCode += '    var proxyReq = http.request(options, function(proxyRes) {\n';
    serverCode += '      res.writeHead(proxyRes.statusCode, proxyRes.headers);\n';
    serverCode += '      proxyRes.pipe(res);\n';
    serverCode += '    });\n';
    serverCode += '    proxyReq.on("error", function(e) {\n';
    serverCode += '      res.writeHead(502, { "Content-Type": "application/json" });\n';
    serverCode += '      res.end(JSON.stringify({ error: "Bad Gateway: " + e.message }));\n';
    serverCode += '    });\n';
    serverCode += '    if (body.length > 0) proxyReq.write(Buffer.concat(body));\n';
    serverCode += '    proxyReq.end();\n';
    serverCode += '  });\n';
    serverCode += '}\n\n';
  }

  // Main server
  serverCode += 'var server = http.createServer(function(req, res) {\n';
  if (apiUrl) {
    serverCode += '  // API proxy\n';
    serverCode += '  if (req.url.startsWith("/api/")) {\n';
    serverCode += '    proxyApi(req, res);\n';
    serverCode += '    return;\n';
    serverCode += '  }\n\n';
  }
  serverCode += '  ' + (isSPA ? 'serveSPA' : 'serveMPA') + '(req, res);\n';
  serverCode += '});\n\n';

  serverCode += 'server.listen(PORT, function() {\n';
  serverCode += '  console.log("PromptJS server running at http://localhost:" + PORT);\n';
  serverCode += '});\n\n';

  return serverCode;
}

/**
 * Run the Node adapter: write server.js + Dockerfile.
 *
 * @param {Object} [opts] - Adapter options
 * @param {string} [opts.outDir] - Output directory
 * @param {boolean} [opts.isSPA] - SPA or MPA
 * @param {string[]} [opts.routes] - Route paths
 * @param {string} [opts.apiUrl] - Backend API URL
 * @returns {{ serverPath: string, dockerfilePath: string, errors: Object[] }}
 */
function runNodeAdapter(opts) {
  opts = opts || {};
  const errors = [];
  const outDir = path.resolve(opts.outDir || 'dist');

  const serverContent = generateServerJS(opts);
  const serverPath = path.join(outDir, 'server.js');
  fs.writeFileSync(serverPath, serverContent, 'utf-8');

  // Generate Dockerfile
  const dockerContent =
    'FROM node:20-slim\n' +
    'WORKDIR /app\n' +
    'COPY dist/ .\n' +
    'EXPOSE 3000\n' +
    'CMD ["node", "server.js"]\n';

  const dockerfilePath = path.join(outDir, 'Dockerfile');
  fs.writeFileSync(dockerfilePath, dockerContent, 'utf-8');

  return {
    serverPath: serverPath,
    dockerfilePath: dockerfilePath,
    errors: errors,
  };
}

module.exports = {
  generateServerJS,
  runNodeAdapter,
};
