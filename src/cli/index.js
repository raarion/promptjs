#!/usr/bin/env node
// @ts-check

/**
 * PromptJS v0.2 — CLI Entry Point / Titik Masuk CLI
 * ============================================================================
 *
 * Entry point untuk `pjs` CLI. Parse argv, dispatch ke sub-command
 * (`compile` / `serve` / `build` / `init`), atau tampilkan help.
 */
'use strict';

const path = require('path');

// ── Version ────────────────────────────────────────────────────────────────

/**
 * Dapatkan versi PromptJS dari `package.json`.
 *
 * @returns {string} String versi (mis. `'0.2.0'`)
 */
function getVersion() {
  try {
    const pkg = require(path.resolve(__dirname, '../../../package.json'));
    return pkg.version || '0.2.0';
  } catch {
    return '0.2.0';
  }
}

// ── Help text ──────────────────────────────────────────────────────────────

const HELP = `
PromptJS v${getVersion()} — Mini-DSL Template Engine

Usage:
  pjs <command> [options]

Commands:
  compile <file|dir>   Compile .pjs files to vanilla JS
  serve [dir]          Start dev server with live reload
  build [dir]          Build for production (dist/)
  init [name]          Scaffold a new PromptJS project
  version              Print version
  help                 Print this help

Compile options:
  -o, --output <file>  Write output to single file
  --out-dir <dir>      Output directory
  --stdout             Print compiled JS to stdout
  -w, --watch          Watch for changes and recompile
  --dev                Dev mode (includes source maps)
  --no-data            Skip loading data files

Serve options:
  -p, --port <num>     Server port (default: 3000)
  --no-reload          Disable live reload

Build options:
  --out-dir <dir>      Output directory (default: dist)
  --adapter <name>     Build adapter (static|node|vercel)
  --csp                Enable CSP with nonce injection for inline scripts/styles
  --prerender          Pre-render HTML with jsdom
  --minify             Minify output JS

Init options:
  -t, --template       Project template (basic|counter|gallery)
  --force              Overwrite existing files

Examples:
  pjs compile index.pjs               Compile to index.js
  pjs compile src/ --out-dir dist/    Compile directory
  pjs compile index.pjs --stdout      Print to stdout
  pjs serve                            Dev server on port 3000
  pjs serve --port 8080               Dev server on port 8080
  pjs build                            Build to dist/
  pjs init my-app                      Create new project
  pjs init --template counter          Create counter project
`;

// ── Minimal argument parser ───────────────────────────────────────────────

/**
 * Parse argv CLI menjadi objek options.
 *
 * Mendukung flag pendek (`-o`) dan panjang (`--output`), serta
 * positional arguments (mis. `pjs compile file.pjs`).
 *
 * @param {string[]} argv - Array argv (biasanya `process.argv.slice(2)`)
 * @returns {Object} Objek parsed args dengan field `_` (positional), flag-flag, dan `command`
 */
function parseArgs(argv) {
  const args = {
    _: [], // Positional arguments
    command: null,
  };

  let i = 2; // Skip 'node' and script path
  while (i < argv.length) {
    const arg = argv[i];

    if (arg === '--') {
      // Everything after -- is positional
      args._.push(...argv.slice(i + 1));
      break;
    }

    if (arg.startsWith('--')) {
      // Long option
      const key = arg.slice(2);
      if (key.includes('=')) {
        const [k, v] = key.split('=');
        args[k] = v;
      } else if (i + 1 < argv.length && !argv[i + 1].startsWith('-')) {
        args[key] = argv[i + 1];
        i++;
      } else {
        args[key] = true;
      }
    } else if (arg.startsWith('-') && arg.length > 1) {
      // Short option(s)
      const flags = arg.slice(1);
      for (let j = 0; j < flags.length; j++) {
        const flag = flags[j];
        // Known value flags: -o, -p, -t, -w
        if (['o', 'p', 't'].includes(flag)) {
          if (j === flags.length - 1 && i + 1 < argv.length) {
            // Value is next arg
            args[shortToLong(flag)] = argv[i + 1];
            i++;
          } else {
            args[shortToLong(flag)] = true;
          }
        } else {
          args[shortToLong(flag)] = true;
        }
      }
    } else {
      // Positional argument
      if (args._.length === 0 && !args.command) {
        // First positional might be a command
        if (isCommand(arg)) {
          args.command = arg;
        } else {
          args._.push(arg);
        }
      } else {
        args._.push(arg);
      }
    }

    i++;
  }

  // If command is in positional args, extract it
  if (!args.command && args._.length > 0 && isCommand(args._[0])) {
    args.command = args._.shift();
  }

  return args;
}

/**
 * Konversi flag pendek ke bentuk panjang (mis. `-o` → `--output`).
 *
 * @param {string} flag - Flag pendek (mis. `'-o'`)
 * @returns {string} Flag panjang (mis. `'--output'`), atau input apa adanya jika tidak dikenal
 */
function shortToLong(flag) {
  const map = {
    o: 'output',
    p: 'port',
    t: 'template',
    w: 'watch',
    v: 'version',
    h: 'help',
    f: 'force',
  };
  return map[flag] || flag;
}

/**
 * Cek apakah string adalah nama command yang valid (`compile`/`serve`/`build`/`init`).
 *
 * @param {string} str - String yang akan dicek
 * @returns {boolean} `true` jika string adalah command valid
 */
function isCommand(str) {
  return ['compile', 'serve', 'build', 'init', 'version', 'help'].includes(str);
}

// ── Main ──────────────────────────────────────────────────────────────────

/**
 * Entry point CLI — parse argv, dispatch ke command yang sesuai.
 *
 * @returns {void}
 */
function main() {
  const args = parseArgs(process.argv);

  // Handle help/version flags
  if (args.help || args.command === 'help') {
    process.stdout.write(HELP);
    process.exit(0);
  }

  if (args.version || args.command === 'version') {
    process.stdout.write(`PromptJS v${getVersion()}\n`);
    process.exit(0);
  }

  // Route to command
  const command = args.command;

  switch (command) {
    case 'compile': {
      const { runCompile } = require('./commands/compile');
      runCompile(args);
      break;
    }

    case 'serve': {
      const { runServe } = require('./commands/serve');
      runServe(args);
      break;
    }

    case 'build': {
      const { runBuild } = require('./commands/build');
      runBuild(args);
      break;
    }

    case 'init': {
      const { runInit } = require('./commands/init');
      runInit(args);
      break;
    }

    default:
      if (args._.length > 0) {
        // Try to compile the file directly
        args.command = 'compile';
        const compileModule = require('./commands/compile');
        compileModule.runCompile(args);
      } else {
        process.stdout.write(HELP);
        process.exit(0);
      }
  }
}

// Run
main();
