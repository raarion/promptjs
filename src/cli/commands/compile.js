// @ts-check

/**
 * PromptJS v1.0.0 — CLI: `compile` Command / Perintah `compile`
 * ============================================================================
 *
 * Compile file `.pjs` menjadi `.js`. Mendukung:
 * - Single file: `pjs compile file.pjs --stdout` atau `--output out.js`
 * - Batch: `pjs compile src/ --out-dir dist/`
 * - Watch mode: `pjs compile src/ --watch` (recompile on change)
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { PromptJSEngine } = require('../../engine/promptjs');
const {
  findPjsFiles,
  printDiagnostics,
  resolveOutputPath,
  ensureDirForFile,
  formatSize,
  formatElapsed,
  makeColors,
} = require('../utils');

/**
 * Jalankan command `pjs compile`.
 *
 * @param {Object} argv - Parsed args dari `parseArgs`
 * @returns {void | Object} Exit, atau objek watchers jika `--watch` mode
 */
function runCompile(argv) {
  const input = argv._[0]; // First positional arg after 'compile'
  const stdout = argv.stdout || false;
  const outDir = argv['out-dir'] || argv.outDir || null;
  const output = argv.output || argv.o || null;
  const watch = argv.watch || argv.w || false;
  const dev = argv.dev || false;
  const noData = argv['no-data'] || false;

  if (!input) {
    process.stderr.write('Error: No input file or directory specified.\n');
    process.stderr.write('Usage: pjs compile <file.pjs | directory> [options]\n');
    process.exit(1);
  }

  const inputPath = path.resolve(input);
  const rootDir = argv.root || inputPath;

  // Determine if input is a file or directory
  let files;
  try {
    const stat = fs.statSync(inputPath);
    if (stat.isDirectory()) {
      files = findPjsFiles(inputPath);
      if (files.length === 0) {
        process.stderr.write(`No .pjs files found in ${input}\n`);
        process.exit(1);
      }
    } else {
      files = [inputPath];
    }
  } catch (e) {
    process.stderr.write(`Error: Cannot access '${input}': ${e.message}\n`);
    process.exit(1);
  }

  // Compile all files
  const results = compileFiles(files, {
    stdout,
    outDir,
    output,
    dev,
    noData,
    rootDir,
  });

  // Print summary
  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  const totalJs = results.reduce((sum, r) => sum + (r.jsSize || 0), 0);
  const { green, red, gray, bold, reset } = makeColors({ enabled: !stdout });

  if (!stdout) {
    if (failed > 0) {
      process.stderr.write(
        `\n${red}${bold}${failed} failed${reset}, ${green}${succeeded} succeeded${reset} ${gray}(${formatSize(totalJs)} output)${reset}\n`
      );
    } else {
      process.stderr.write(
        `\n${green}${bold}${succeeded} compiled${reset} ${gray}(${formatSize(totalJs)} output)${reset}\n`
      );
    }
  }

  // Watch mode
  if (watch) {
    return startWatch(files, {
      stdout,
      outDir,
      output,
      dev,
      noData,
      rootDir,
    });
  }

  process.exit(failed > 0 ? 1 : 0);
}

/**
 * Compile a list of .pjs files.
 */
/**
 * Compile multiple file `.pjs` sekaligus.
 *
 * @param {string[]} files - Daftar path file `.pjs`
 * @param {Object} options - Opsi compile (output, outDir, rootDir, dll.)
 * @returns {Object[]} Daftar result compile per file
 */
function compileFiles(files, options) {
  const results = [];

  for (const filePath of files) {
    const result = compileOne(filePath, options);
    results.push(result);
  }

  return results;
}

/**
 * Compile a single .pjs file.
 */
/**
 * Compile satu file `.pjs` menjadi `.js`.
 *
 * @param {string} filePath - Path file `.pjs`
 * @param {Object} options - Opsi compile
 * @returns {Object} Result compile (`{ js, errors, warnings, ast, success }`)
 */
function compileOne(filePath, options) {
  const start = process.hrtime();
  const {
    enabled: useColor,
    cyan,
    green,
    red,
    gray,
    reset,
  } = makeColors({
    enabled: !options.stdout,
  });

  const engine = new PromptJSEngine();
  const compileResult = engine.compileFile(filePath, {
    dev: options.dev,
    loadDataFiles: !options.noData,
    dataDir: path.dirname(filePath),
    source: path.basename(filePath),
  });

  const elapsed = formatElapsed(start);

  // Print diagnostics
  printDiagnostics(compileResult.errors, 'error', useColor);
  printDiagnostics(compileResult.warnings, 'warning', useColor);

  if (!compileResult.success) {
    if (!options.stdout) {
      process.stderr.write(
        `  ${cyan}${path.relative(process.cwd(), filePath)}${reset} ${red}✗${reset} ${gray}(${elapsed})${reset}\n`
      );
    }
    return { filePath, success: false, errors: compileResult.errors, elapsed };
  }

  const js = compileResult.js;

  // Output
  if (options.stdout) {
    process.stdout.write(js + '\n');
  } else {
    const outPath = resolveOutputPath(filePath, {
      output: options.output,
      outDir: options.outDir,
      rootDir: options.rootDir,
    });
    ensureDirForFile(outPath);
    fs.writeFileSync(outPath, js, 'utf-8');
    process.stderr.write(
      `  ${cyan}${path.relative(process.cwd(), filePath)}${reset} ${green}→${reset} ${gray}${path.relative(process.cwd(), outPath)}${reset} ${gray}(${formatSize(js.length)} ${elapsed})${reset}\n`
    );
  }

  return {
    filePath,
    success: true,
    js,
    jsSize: js.length,
    elapsed,
  };
}

/**
 * Start watch mode — recompile files on change.
 */
/**
 * Mulai watch mode — recompile file saat berubah.
 *
 * @param {string[]} files - Daftar path file `.pjs` yang akan di-watch
 * @param {Object} options - Opsi compile
 * @returns {{ watchers: Map }} Map dari path → fs.FSWatcher
 */
function startWatch(files, options) {
  const { gray, cyan, reset } = makeColors({ stream: process.stdout });

  process.stderr.write(`\n${gray}Watching ${files.length} file(s) for changes...${reset}\n`);

  // Track watched directories for new .pjs files
  const watchers = new Map();
  const watchedDirs = new Set();

  // Collect directories to watch
  for (const filePath of files) {
    const dir = path.dirname(filePath);
    watchedDirs.add(dir);
  }

  // Also watch root input dir if it was a directory
  const inputDir =
    files.length > 1 ? /** @type {any} */ (path).commonDir(files) : path.dirname(files[0]);
  if (inputDir) watchedDirs.add(inputDir);

  // Debounce map
  const debounceTimers = new Map();

  function handleFileChange(changedFile) {
    if (!changedFile.endsWith('.pjs')) return;

    // Debounce
    const existing = debounceTimers.get(changedFile);
    if (existing) clearTimeout(existing);

    debounceTimers.set(
      changedFile,
      setTimeout(() => {
        debounceTimers.delete(changedFile);
        process.stderr.write(
          `\n${cyan}${path.relative(process.cwd(), changedFile)}${reset} changed\n`
        );
        compileOne(changedFile, options);
      }, 100)
    );
  }

  for (const dir of watchedDirs) {
    try {
      const watcher = fs.watch(dir, { recursive: true }, (eventType, filename) => {
        if (filename && filename.endsWith('.pjs')) {
          handleFileChange(path.join(dir, filename));
        }
      });
      watchers.set(dir, watcher);
    } catch (e) {
      process.stderr.write(`Warning: Cannot watch ${dir}: ${e.message}\n`);
    }
  }

  // Keep process alive
  process.on('SIGINT', () => {
    process.stderr.write(`\n${gray}Stopping watcher...${reset}\n`);
    for (const watcher of watchers.values()) {
      watcher.close();
    }
    process.exit(0);
  });

  // Don't exit — keep watching
  return { watchers };
}

module.exports = { runCompile, compileOne, compileFiles };
