/**
 * PromptJS v0.2 — CLI `compile` Command
 * ============================================================================
 * Compiles .pjs file(s) to vanilla JS.
 *
 * Usage:
 *   pjs compile <file.pjs>         — compile single file, output .js next to it
 *   pjs compile <file.pjs> -o out  — compile to out/file.js
 *   pjs compile <dir>              — compile all .pjs files in dir (recursive)
 *   pjs compile <file.pjs> --stdout — output to stdout instead of file
 *   pjs compile --watch            — watch for changes and recompile
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
} = require('../utils');

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
  const useColor = !stdout;
  const green = useColor ? '\x1b[32m' : '';
  const red = useColor ? '\x1b[31m' : '';
  const gray = useColor ? '\x1b[90m' : '';
  const bold = useColor ? '\x1b[1m' : '';
  const reset = useColor ? '\x1b[0m' : '';

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
function compileOne(filePath, options) {
  const start = process.hrtime();
  const useColor = !options.stdout;
  const cyan = useColor ? '\x1b[36m' : '';
  const green = useColor ? '\x1b[32m' : '';
  const red = useColor ? '\x1b[31m' : '';
  const gray = useColor ? '\x1b[90m' : '';
  const reset = useColor ? '\x1b[0m' : '';

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
function startWatch(files, options) {
  const gray = '\x1b[90m';
  const cyan = '\x1b[36m';
  const reset = '\x1b[0m';

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
  const inputDir = files.length > 1 ? path.commonDir(files) : path.dirname(files[0]);
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
