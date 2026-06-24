// @ts-check

/**
 * PromptJS v0.8 — Plugin System
 * ============================================================================
 *
 * Provides 4 transform hooks that plugins can use to modify compilation
 * output at different stages of the build pipeline.
 *
 * Plugin contract:
 * {
 *   name: string,                    // Plugin name (required)
 *   transformSource?(source, filename): string,   // Hook 1: before compile
 *   transformJS?(js, filename): string,            // Hook 2: after compile JS
 *   transformCSS?(css, filename): string,          // Hook 3: after compile CSS
 *   transformHTML?(html, filename): string,        // Hook 4: after generate HTML
 * }
 *
 * Zero-dependency. Plugins are loaded via config (see config.js).
 */

'use strict';

/**
 * Apply a single hook across all loaded plugins.
 *
 * @param {Object[]} plugins - Array of plugin objects
 * @param {string} hookName - Name of the hook to call
 * @param {string} content - Content to transform
 * @param {string} filename - File being processed (for context)
 * @returns {string} Transformed content
 */
function applyHook(plugins, hookName, content, filename) {
  if (!plugins || plugins.length === 0) return content;

  var result = content;
  for (var i = 0; i < plugins.length; i++) {
    var plugin = plugins[i];
    if (plugin && typeof plugin[hookName] === 'function') {
      try {
        result = plugin[hookName](result, filename);
      } catch (e) {
        // Plugin errors are non-fatal — log and continue
        process.stderr.write(
          '[PromptJS] Plugin "' + (plugin.name || 'unknown') + '" error in ' +
          hookName + ': ' + e.message + '\n'
        );
      }
    }
  }
  return result;
}

/**
 * Apply transformSource hook to .pjs source before compilation.
 *
 * @param {Object[]} plugins - Loaded plugins
 * @param {string} source - Raw .pjs source
 * @param {string} filename - File path
 * @returns {string} Transformed source
 */
function transformSource(plugins, source, filename) {
  return applyHook(plugins, 'transformSource', source, filename);
}

/**
 * Apply transformJS hook to compiled JS output.
 *
 * @param {Object[]} plugins - Loaded plugins
 * @param {string} js - Compiled JavaScript
 * @param {string} filename - File path
 * @returns {string} Transformed JS
 */
function transformJS(plugins, js, filename) {
  return applyHook(plugins, 'transformJS', js, filename);
}

/**
 * Apply transformCSS hook to compiled CSS output.
 *
 * @param {Object[]} plugins - Loaded plugins
 * @param {string} css - Compiled CSS
 * @param {string} filename - File path
 * @returns {string} Transformed CSS
 */
function transformCSS(plugins, css, filename) {
  return applyHook(plugins, 'transformCSS', css, filename);
}

/**
 * Apply transformHTML hook to generated HTML.
 *
 * @param {Object[]} plugins - Loaded plugins
 * @param {string} html - Generated HTML
 * @param {string} filename - File path
 * @returns {string} Transformed HTML
 */
function transformHTML(plugins, html, filename) {
  return applyHook(plugins, 'transformHTML', html, filename);
}

module.exports = {
  applyHook,
  transformSource,
  transformJS,
  transformCSS,
  transformHTML,
};