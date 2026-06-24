// @ts-check

/**
 * PromptJS v0.8 — Config Loader
 * ============================================================================
 *
 * Loads project configuration from `pjs.config.js` (or `promptjs.config.js`)
 * in the project root. Merges with CLI flags (CLI takes precedence).
 *
 * Config schema:
 * {
 *   adapter: "static" | "node" | "vercel" | null,
 *   plugins: Function[],
 *   outDir: string,
 *   rootDir: string,
 *   pagesDir: string,
 *   assetsDir: string,
 *   baseUrl: string,
 *   meta: { title, description, ogImage, ... },
 *   siteUrl: string,          // for sitemap generation
 *   apiUrl: string,           // for Node adapter API proxy
 * }
 *
 * Zero-dependency. Only reads .js config files (no .json/.yaml/.toml).
 */

'use strict';

const fs = require('fs');
const path = require('path');

/** @type {Set<string>} Config file names to search (in order) */
const CONFIG_FILENAMES = new Set(['pjs.config.js', 'promptjs.config.js']);

/** @type {Set<string>} Known adapter names */
const KNOWN_ADAPTERS = new Set(['static', 'node', 'vercel']);

/**
 * Search for a config file starting from `startDir` upward to filesystem root.
 *
 * @param {string} startDir - Directory to start searching from
 * @returns {{ configPath: string|null, rootDir: string }} Found config path + project root
 */
function findConfigFile(startDir) {
  let dir = path.resolve(startDir);
  let prevDir = '';

  while (dir !== prevDir) {
    for (const name of CONFIG_FILENAMES) {
      const candidate = path.join(dir, name);
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return { configPath: candidate, rootDir: dir };
      }
    }
    prevDir = dir;
    dir = path.dirname(dir);
  }

  return { configPath: null, rootDir: dir };
}

/**
 * Load and validate a config file.
 *
 * @param {string} configPath - Absolute path to config file
 * @returns {{ config: Object, errors: Object[] }} Loaded config + any validation errors
 */
function loadConfigFile(configPath) {
  const errors = [];

  let raw;
  try {
    raw = require(configPath);
  } catch (e) {
    errors.push({
      code: 'E0000',
      severity: 'error',
      message: 'Failed to load config: ' + e.message,
      suggestion: 'Check syntax in ' + path.basename(configPath),
    });
    return { config: {}, errors: errors };
  }

  // Support both `module.exports = { ... }` and `export default` (commonjs only)
  const config = raw && raw.default ? raw.default : raw;

  if (typeof config !== 'object' || config === null || Array.isArray(config)) {
    errors.push({
      code: 'E0000',
      severity: 'error',
      message: 'Config must export a plain object',
      suggestion: 'Use module.exports = { adapter: "static" }',
    });
    return { config: {}, errors: errors };
  }

  // Validate adapter
  if (config.adapter !== undefined && config.adapter !== null) {
    if (!KNOWN_ADAPTERS.has(String(config.adapter))) {
      errors.push({
        code: 'W0000',
        severity: 'warning',
        message: 'Unknown adapter: "' + config.adapter + '". Known: static, node, vercel',
        suggestion: 'Use "static" for CDN deploy, "node" for server, "vercel" for Vercel',
      });
    }
  }

  // Validate plugins
  if (config.plugins !== undefined) {
    if (!Array.isArray(config.plugins)) {
      errors.push({
        code: 'E0000',
        severity: 'error',
        message: 'config.plugins must be an array',
        suggestion: 'Use plugins: [require("./my-plugin")]',
      });
      config.plugins = [];
    } else {
      // Validate each plugin has required shape
      const validated = [];
      for (let i = 0; i < config.plugins.length; i++) {
        const plugin = config.plugins[i];
        if (typeof plugin === 'function') {
          validated.push(plugin());
        } else if (plugin && typeof plugin === 'object' && typeof plugin.name === 'string') {
          validated.push(plugin);
        } else {
          errors.push({
            code: 'W0000',
            severity: 'warning',
            message: 'plugins[' + i + '] has invalid shape — must be a function or { name, ... }',
            suggestion: 'See Plugin Authoring Guide',
          });
        }
      }
      config.plugins = validated;
    }
  } else {
    config.plugins = [];
  }

  return { config: config, errors: errors };
}

/**
 * Merge project config with CLI flags. CLI flags take precedence.
 *
 * @param {Object} projectConfig - Config loaded from file
 * @param {Object} cliArgs - Parsed CLI arguments
 * @returns {Object} Merged config
 */
function mergeWithCliArgs(projectConfig, cliArgs) {
  const merged = Object.assign({}, projectConfig);

  // CLI args override config file
  if (cliArgs['out-dir'] || cliArgs.outDir) {
    merged.outDir = cliArgs['out-dir'] || cliArgs.outDir;
  }
  if (cliArgs.adapter) {
    merged.adapter = cliArgs.adapter;
  }

  return merged;
}

/**
 * Load project config from the given directory.
 * Convenience function that combines find + load + merge.
 *
 * @param {string} [startDir] - Directory to search from (default: cwd)
 * @param {Object} [cliArgs] - CLI arguments to merge (optional)
 * @returns {{ config: Object, errors: Object[], rootDir: string }} Final config + errors + project root
 */
function loadProjectConfig(startDir, cliArgs) {
  startDir = startDir || process.cwd();
  const allErrors = [];

  const found = findConfigFile(startDir);
  let config = {};

  if (found.configPath) {
    const result = loadConfigFile(found.configPath);
    config = result.config;
    allErrors.push(...result.errors);
  }

  // Merge with CLI args
  if (cliArgs) {
    config = mergeWithCliArgs(config, cliArgs);
  }

  // Defaults
  config.rootDir = config.rootDir || found.rootDir;
  config.outDir = config.outDir || 'dist';
  config.pagesDir = config.pagesDir || 'pages';
  config.assetsDir = config.assetsDir || 'assets';
  config.adapter = config.adapter || null;
  config.plugins = config.plugins || [];
  config.meta = config.meta || {};
  config.siteUrl = config.siteUrl || '';
  config.apiUrl = config.apiUrl || '';

  return {
    config: config,
    errors: allErrors,
    rootDir: found.rootDir,
  };
}

module.exports = {
  CONFIG_FILENAMES,
  KNOWN_ADAPTERS,
  findConfigFile,
  loadConfigFile,
  mergeWithCliArgs,
  loadProjectConfig,
};
