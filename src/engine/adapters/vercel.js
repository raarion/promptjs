// @ts-check

/**
 * PromptJS v1.0.0 — Adapter: Vercel
 * ============================================================================
 *
 * Generates Vercel Build Output API v3 compatible output.
 *
 * Structure:
 *   dist/
 *   ├── .vercel/
 *   │   └── output/
 *   │       ├── config.json
 *   │       ├── static/        ← HTML, JS, CSS, assets
 *   │       └── functions/     ← (optional API proxy)
 *   └── vercel.json
 *
 * Reference: https://vercel.com/docs/build-output-api/v3
 *
 * Zero-dependency.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { isInsideRoot } = require('../../utils/path-guard');

/**
 * Generate vercel.json configuration.
 *
 * @param {Object} [opts] - Options
 * @param {boolean} [opts.isSPA] - SPA mode
 * @returns {string} vercel.json content
 */
function generateVercelJson(opts) {
  opts = opts || {};

  const config = {
    version: 2,
  };

  if (opts.isSPA) {
    // SPA: rewrite all routes to index.html
    config.rewrites = [{ source: '/(.*)', destination: '/index.html' }];
    config.headers = [
      {
        source: '/assets/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/(.*)\\.(js|css)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  }

  return JSON.stringify(config, null, 2) + '\n';
}

/**
 * Generate Vercel Build Output config.json.
 *
 * @param {Object} opts - Options
 * @returns {string} config.json content
 */
function generateOutputConfig(opts) {
  opts = opts || {};

  const config = {
    version: 3,
    routes: [],
  };

  if (opts.isSPA) {
    // Handle all routes via SPA fallback
    config.routes.push({
      src: '/(.*)',
      dest: '/index.html',
      status: 200,
    });
  } else {
    // MPA: serve .html files for routes
    config.routes.push({
      src: '/',
      dest: '/index.html',
      status: 200,
    });
    if (opts.routes) {
      for (let i = 0; i < opts.routes.length; i++) {
        const route = opts.routes[i];
        if (route === '/') continue;
        const htmlFile = route === '/' ? '/index.html' : route + '.html';
        config.routes.push({
          src: route + '/?',
          dest: htmlFile,
          status: 200,
        });
      }
    }
  }

  // Cache headers for static assets
  config.routes.push({
    src: '/assets/(.*)',
    headers: {
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
    status: 200,
    continue: true,
  });

  return JSON.stringify(config, null, 2) + '\n';
}

/**
 * Run the Vercel adapter: restructure output for Vercel Build Output API.
 *
 * @param {Object} [opts] - Adapter options
 * @param {string} [opts.outDir] - Output directory (dist/)
 * @param {boolean} [opts.isSPA] - SPA mode
 * @param {string[]} [opts.routes] - Route paths
 * @returns {{ vercelJsonPath: string, outputConfigPath: string, errors: Object[] }}
 */
function runVercelAdapter(opts) {
  opts = opts || {};
  const errors = [];
  const outDir = path.resolve(opts.outDir || 'dist');

  const vercelDir = path.join(outDir, '.vercel', 'output');
  const staticDir = path.join(vercelDir, 'static');
  const functionsDir = path.join(vercelDir, 'functions');

  // Create output structure
  fs.mkdirSync(staticDir, { recursive: true });
  fs.mkdirSync(functionsDir, { recursive: true });

  // Move existing files (HTML, JS, CSS, assets) into static/
  // Files are MOVED (not copied) to avoid duplication in dist/ (BUG-10 fix).
  // Only vercel.json and .vercel/ remain at dist/ root after this.
  const entries = fs.readdirSync(outDir, { withFileTypes: true });
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (entry.name === '.vercel' || entry.name === 'vercel.json') continue;

    const srcPath = path.join(outDir, entry.name);
    const destPath = path.join(staticDir, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
      fs.rmSync(srcPath, { recursive: true, force: true });
    } else {
      // Ensure parent exists
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copyFileSync(srcPath, destPath);
      fs.unlinkSync(srcPath);
    }
  }

  // Write output config
  const outputConfig = generateOutputConfig(opts);
  const configPath = path.join(vercelDir, 'config.json');
  fs.writeFileSync(configPath, outputConfig, 'utf-8');

  // Write vercel.json at root
  const vercelJson = generateVercelJson(opts);
  const vercelJsonPath = path.join(outDir, 'vercel.json');
  fs.writeFileSync(vercelJsonPath, vercelJson, 'utf-8');

  return {
    vercelJsonPath: vercelJsonPath,
    outputConfigPath: configPath,
    errors: errors,
  };
}

/**
 * Copy directory recursively.
 *
 * @param {string} src - Source
 * @param {string} dest - Destination
 */
function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    // S-21 (v1.0.1): defense-in-depth — never copy an entry whose joined
    // destination would escape `dest` (e.g. a crafted ".." entry name). Uses
    // the same centralized guard as the dev server (src/utils/path-guard.js).
    if (!isInsideRoot(dest, destPath) || !isInsideRoot(src, srcPath)) {
      continue;
    }
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

module.exports = {
  generateVercelJson,
  generateOutputConfig,
  runVercelAdapter,
};
