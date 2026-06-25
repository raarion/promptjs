// @ts-check

/**
 * PromptJS v0.6 — Client-Side Router Runtime
 * ============================================================================
 *
 * Zero-dependency SPA router embedded at compile time when
 * `router: benar` is set in front-matter.
 *
 * Features:
 * - Exact and dynamic segment route matching (/blog/:slug)
 * - pushState navigation (no full reload)
 * - <a href> click interception for internal links
 * - popstate handling (browser back/forward)
 * - 404 fallback route ("*")
 * - Page mount/unmount lifecycle
 *
 * This file exports the runtime code as a STRING to be embedded
 * in compiled output — not imported at runtime. (Prinsip ① ✅)
 */

'use strict';

/**
 * Router runtime code as a JavaScript string.
 * This is embedded directly into the compiled output.
 *
 * @type {string}
 */
const ROUTER_RUNTIME = `
function __pjsRouter(routes, options) {
  options = options || {};
  var appEl = options.appEl || document.getElementById("app") || document.body;
  var current = null;

  function navigate(path, pushState) {
    if (current && typeof current.unmount === "function") {
      current.unmount();
      current = null;
    }
    if (pushState !== false) {
      history.pushState(null, "", path);
    }
    var factory = matchRoute(routes, path);
    if (factory) {
      current = typeof factory === "function" ? factory(appEl) : factory;
      if (current && typeof current.mount === "function") {
        current.mount(appEl);
      }
    }
  }

  function matchRoute(routes, path) {
    if (routes[path]) return routes[path];
    for (var pattern in routes) {
      if (pattern.indexOf(":") !== -1) {
        var regexStr = "^" + pattern.replace(/:\\w+/g, "([^/]+)") + "$";
        var regex = new RegExp(regexStr);
        var match = path.match(regex);
        if (match) {
          var params = extractParams(pattern, match);
          return function(parent) { return routes[pattern](parent, params); };
        }
      }
    }
    return routes["*"] || null;
  }

  function extractParams(pattern, match) {
    var paramNames = [];
    var parts = pattern.split("/");
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].charAt(0) === ":") {
        paramNames.push(parts[i].substring(1));
      }
    }
    var params = {};
    for (var j = 0; j < paramNames.length; j++) {
      params[paramNames[j]] = match[j + 1];
    }
    return params;
  }

  function handleClick(e) {
    var a = e.target.closest("a[href]");
    if (!a) return;
    var href = a.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;
    if (a.hasAttribute("external") || a.hasAttribute("target")) return;
    try {
      var url = new URL(href, location.origin);
      if (url.origin !== location.origin) return;
      e.preventDefault();
      navigate(url.pathname);
    } catch(err) { /* invalid URL, ignore */ }
  }

  function handlePopState() {
    navigate(location.pathname, false);
  }

  document.addEventListener("click", handleClick);
  window.addEventListener("popstate", handlePopState);

  navigate(location.pathname, false);

  return {
    navigate: navigate,
    destroy: function() {
      document.removeEventListener("click", handleClick);
      window.removeEventListener("popstate", handlePopState);
      if (current && typeof current.unmount === "function") {
        current.unmount();
        current = null;
      }
    }
  };
}
`.trim();

module.exports = {
  ROUTER_RUNTIME,
};
