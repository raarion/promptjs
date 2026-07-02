/**
 * Build script for PromptJS Standalone browser bundle.
 *
 * Produces: dist/promptjs.standalone.js       (unminified + sourcemap)
 *           dist/promptjs.standalone.min.js   (minified)
 *
 * Usage: node scripts/build-standalone.js [--watch]
 */

const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'dist');
const VERSION = require(path.join(ROOT, 'package.json')).version;

fs.mkdirSync(OUT_DIR, { recursive: true });

const banner = `/*! PromptJS Standalone v${VERSION} — browser compiler | github.com/raarion/promptjs */`;

const config = {
  entryPoints: [path.join(ROOT, 'src/standalone/promptjs-standalone.js')],
  bundle: true,
  sourcemap: true,
  platform: 'browser',
  format: 'iife',
  globalName: '__pjs_standalone',
  target: ['es2020'],
  banner: { js: banner },
  plugins: [
    {
      name: 'promptjs-standalone',
      setup(build) {
        build.onResolve({ filter: /^fs$/ }, () => ({
          path: path.join(ROOT, 'src/standalone/shim-fs.js'),
        }));
        build.onResolve({ filter: /^path$/ }, () => ({
          path: path.join(ROOT, 'src/standalone/shim-path.js'),
        }));
        build.onResolve({ filter: /^process$/ }, () => ({
          path: path.join(ROOT, 'src/standalone/shim-process.js'),
        }));
      },
    },
  ],
};

async function build() {
  const start = Date.now();

  await esbuild.build({
    ...config,
    minify: false,
    outfile: path.join(OUT_DIR, 'promptjs.standalone.js'),
  });
  await esbuild.build({
    ...config,
    minify: true,
    outfile: path.join(OUT_DIR, 'promptjs.standalone.min.js'),
  });

  const unmin = fs.statSync(path.join(OUT_DIR, 'promptjs.standalone.js'));
  const min = fs.statSync(path.join(OUT_DIR, 'promptjs.standalone.min.js'));
  const elapsed = Date.now() - start;

  console.log(`✅ promptjs.standalone.js     — ${(unmin.size / 1024).toFixed(1)} KB`);
  console.log(`✅ promptjs.standalone.min.js — ${(min.size / 1024).toFixed(1)} KB`);
  console.log(`   Done in ${elapsed}ms`);
}

async function watchMode() {
  const ctx = await esbuild.context({
    ...config,
    minify: true,
    outfile: path.join(OUT_DIR, 'promptjs.standalone.min.js'),
  });
  await ctx.watch();
  console.log('👀 Watching for changes...');
}

const watch = process.argv.includes('--watch');
if (watch) {
  watchMode().catch((err) => {
    console.error(err);
    process.exit(1);
  });
} else {
  build().catch((err) => {
    console.error('❌ Build failed:', err);
    process.exit(1);
  });
}
