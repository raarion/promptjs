/**
 * PromptJS Standalone — Browser Entry Point
 *
 * This is the entry point for the esbuild browser bundle.
 * It imports the engine and wires up the auto-detection loader.
 *
 * Built by: node scripts/build-standalone.js
 * Output:   dist/promptjs.standalone.js
 */

// The engine — esbuild resolves these requires + stubs fs/path/process
var PromptJS = require('../engine/promptjs');
var CSS = require('../engine/css');

// ── Expose for debugging ─────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  window.__PromptJS = PromptJS;
}

// ── CSP nonce ────────────────────────────────────────────────────────────
var ownScript =
  typeof document !== 'undefined' ? document.currentScript : null;
var nonce = ownScript ? ownScript.nonce : undefined;

// ── Execute compiled JS via safe script injection ────────────────────────
function executeJS(js, sourceName) {
  var el = document.createElement('script');
  if (sourceName) {
    js += '\n//# sourceURL=' + sourceName;
  }
  el.textContent = js;
  if (nonce) el.nonce = nonce;
  document.body.appendChild(el);
}

// ── Compile + execute ────────────────────────────────────────────────────
function compileAndExecute(source, sourceName) {
  try {
    var result = PromptJS.compile(source, {
      loadDataFiles: false,
      source: sourceName || 'inline.pjs',
    });

    if (!result.success) {
      var errors = result.errors || [];
      errors.forEach(function (e) {
        console.error(
          '[PromptJS] ' +
            (e.code || 'ERROR') +
            ': ' +
            (e.message || 'Compilation failed')
        );
      });
      // Also show in DOM so non-console users can see
      showDOMError(errors);
      return;
    }

    if (result.warnings && result.warnings.length > 0) {
      result.warnings.forEach(function (w) {
        console.warn(
          '[PromptJS] ' + (w.code || 'WARNING') + ': ' + (w.message || '')
        );
      });
    }

    // Inject any compiled CSS into <head>
    if (result.css) {
      injectCSS(result.css, sourceName);
    }

    executeJS(result.js, sourceName);
  } catch (err) {
    console.error('[PromptJS] Unexpected error:', err);
  }
}

// ── Inject CSS ───────────────────────────────────────────────────────────
function injectCSS(css, sourceName) {
  var style = document.createElement('style');
  if (sourceName) {
    css = '/* ' + sourceName + ' */\n' + css;
  }
  style.textContent = css;
  if (nonce) style.nonce = nonce;
  document.head.appendChild(style);
}

// ── DOM error display (for non-console users) ────────────────────────────
function showDOMError(errors) {
  try {
    var el = document.createElement('div');
    el.style.cssText =
      'position:fixed;bottom:16px;right:16px;max-width:400px;' +
      'background:#1e1b2e;color:#fca5a5;padding:16px;border-radius:12px;' +
      'font-family:monospace;font-size:13px;z-index:99999;' +
      'border:1px solid rgba(239,68,68,0.3);box-shadow:0 8px 32px rgba(0,0,0,0.4);';
    var msg = errors
      .map(function (e) {
        return (e.code || 'ERROR') + ': ' + e.message;
      })
      .join('<br>');
    el.innerHTML =
      '<strong>🌀 PromptJS Error</strong><br><br>' +
      msg +
      '<br><small style="color:#64748b">Check console for details</small>';
    document.body.appendChild(el);
    setTimeout(function () {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.5s';
    }, 8000);
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 8500);
  } catch (_) {
    /* DOM might not be ready */
  }
}

// ── Process inline <script type="text/pjs"> ──────────────────────────────
function processInline() {
  var scripts = document.querySelectorAll('script[type="text/pjs"]');
  scripts.forEach(function (script) {
    var source = script.textContent;
    var name = script.getAttribute('data-name') || 'inline';
    if (source && source.trim()) {
      compileAndExecute(source, name);
    }
  });
}

// ── Process external <link rel="pjs" href="..."> ─────────────────────────
function processLinks() {
  var links = document.querySelectorAll('link[rel="pjs"]');
  links.forEach(function (link) {
    var href = link.getAttribute('href');
    if (!href) return;

    fetch(href)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(function (source) {
        compileAndExecute(source, href);
      })
      .catch(function (err) {
        console.error('[PromptJS] Failed to fetch ' + href + ':', err.message);
      });
  });
}

// ── Init ─────────────────────────────────────────────────────────────────
function init() {
  processInline();
  processLinks();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}

// ── Public API ───────────────────────────────────────────────────────────
// Expose for programmatic use
if (typeof window !== 'undefined') {
  window.PromptJS = {
    compile: PromptJS.compile,
    version: '1.0.0',
  };
}

module.exports = PromptJS;
