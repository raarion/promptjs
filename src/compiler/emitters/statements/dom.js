'use strict';
const { tagAliases } = require('./constants');

/**
 * DOM structure emitters: Buat (element creation), TextNode, Tampilkan (show/mount/alert), Sembunyikan (hide).
 *
 * This module is a behavior-preserving extraction from the former monolithic
 * `src/compiler/emitters/statements.js`. Every visitor is installed onto
 * `PromptJSCompiler.prototype` exactly as before; only the file layout changed.
 */

/**
 * Pasang visitor untuk modul ini ke `PromptJSCompiler.prototype`.
 *
 * @param {Function} PromptJSCompiler - Constructor PromptJSCompiler
 * @param {Function} accept - Fungsi `accept` dari `utils/visitor` (dispatch visitor)
 * @returns {void}
 */
function install(PromptJSCompiler, accept) {
  PromptJSCompiler.prototype.visitBuatStatement = function (node) {
    const varName = this.genVar('el');
    node.compiledVarName = varName; // Simpan untuk child reference

    const tag = tagAliases[node.selector.tag] || node.selector.tag;

    // ── PromptJS patch: fragment should NOT create a DOM element ──
    // Instead, just visit children and append them directly to the current parent.
    //
    // BUG FIX (Wave D snapshot): fragment must inherit the parent's
    // `compiledVarName` so that child KetikaStatement (event handler
    // without explicit target) can resolve its SelfReference target
    // correctly. Without this, `on_klik = ...` inside a multi-child Buat
    // body (which auto-wraps in a fragment) would emit `__el_2` instead
    // of the actual parent element variable name.
    //
    // BUG-03 FIX: When currentParent is null (page root), the fragment
    // would get varName but no createElement call — any SelfReference to
    // it would produce a ReferenceError. Set compiledVarName to null so
    // the resolver/compiler can detect the invalid state.
    if (tag === 'fragment') {
      if (this.currentParent) {
        node.compiledVarName = this.currentParent;
      } else {
        node.compiledVarName = null;
      }
      if (node.body) accept(node.body, this);
      if (node.action) accept(node.action, this);
      return;
    }

    // PromptJS patch: track that we're inside a Buat body so pass/lewati
    // is treated as "empty body marker" (emits nothing) instead of continue;
    const prevInBuatBody = this._inBuatBody || false;
    this._inBuatBody = true;

    this.emit(`const ${varName} = document.createElement("${tag}");`);

    // v132 #79: CSS scoping -- stamp EVERY element created here (not just
    // the component's root) with the currently-active scope attribute, so
    // a `Gaya:` selector's compound-selector-1 (the only part `scopeSelector`
    // actually attaches `[data-pjs-*]` to -- descendant parts of a selector
    // like `.card h3` are left as plain `h3` and rely on the DOM's real
    // descendant relationship to match) matches regardless of which element
    // inside the component/page it targets. This mirrors how Vue's scoped
    // CSS stamps every template element with the same `data-v-xxxx`, rather
    // than trying to infer (at compile time, with no cross-reference between
    // CSS selectors and markup) exactly which element each selector's first
    // compound targets. A no-op (emits nothing) when scoping is not opted
    // into for this file (`currentCssScopeAttr()` returns null).
    const __cssScopeAttr = this.currentCssScopeAttr();
    if (__cssScopeAttr) {
      this.emit(`${varName}.setAttribute(${JSON.stringify(__cssScopeAttr)}, "");`);
    }

    if (node.selector.id) {
      this.emit(`${varName}.id = "${node.selector.id}";`);
    }
    if (node.selector.classes && node.selector.classes.length > 0) {
      this.emit(`${varName}.className = "${node.selector.classes.join(' ')}";`);
    }

    // Attributes dari selector
    if (node.selector.attributes && node.selector.attributes.length > 0) {
      node.selector.attributes.forEach((attr) => {
        const attrVal = attr.value ? this.lowerExpression(attr.value) : '""';
        this.emitSafeAttribute(varName, attr.key, attrVal); // S-4: filter on*/URL
      });
    }

    // Properti
    if (node.properties) {
      node.properties.forEach((p) => {
        if (p.key === 'ikat' || p.key === 'bind') {
          // v1.1: two-way binding declared in the element header property list.
          this.emitTwoWayBinding(varName, p.value);
          return;
        }
        const val = this.lowerExpression(p.value);
        if (p.key === 'teks') this.emit(`${varName}.innerText = ${val};`);
        else if (p.key === 'html')
          this.emitHtmlAssignment(varName, val); // S-3: selalu sanitasi
        else if (p.key === 'nilai') this.emit(`${varName}.value = ${val};`);
        else this.emitSafeAttribute(varName, p.key, val); // S-4: filter on*/URL
      });
    }

    // PromptJS patch: docstring (inline content after colon)
    // docstring is { teks: <expression> } — emitted as innerText
    if (node.docstring && node.docstring.teks) {
      const teksVal = this.lowerExpression(node.docstring.teks);
      this.emit(`${varName}.innerText = ${teksVal};`);
    }

    // Simpan parent current untuk append
    const prevParent = this.currentParent;
    this.currentParent = varName;

    if (node.body) accept(node.body, this);
    if (node.action) accept(node.action, this);

    this.currentParent = prevParent;

    if (!this.currentParent) {
      // v0.6: SPA mode — don't auto-append; track page root for mount()
      if (this.isSPA) {
        if (!this._spaPageRoot) {
          this._spaPageRoot = varName;
        }
      } else {
        this.emit(`document.body.appendChild(${varName});`);
      }
    } else {
      this.emit(`${this.currentParent}.appendChild(${varName});`);
    }

    // Restore Buat body context
    this._inBuatBody = prevInBuatBody;
  };

  PromptJSCompiler.prototype.visitTextNode = function (node) {
    const varName = this.genVar('txt');
    this.emit(`const ${varName} = document.createTextNode(${JSON.stringify(node.value)});`);
    if (!this.currentParent) {
      this.emit(`document.body.appendChild(${varName});`);
    } else {
      this.emit(`${this.currentParent}.appendChild(${varName});`);
    }
  };

  PromptJSCompiler.prototype.visitTampilkanStatement = function (node) {
    // Handle message kinds: pesan, pesan-error, notifikasi
    if (node.messageKind) {
      const msgVal = this.lowerExpression(node.target);
      if (node.messageKind === 'pesan') {
        this.emit(`alert(${msgVal});`);
      } else if (node.messageKind === 'pesan-error') {
        this.emit(`console.error(${msgVal});`);
      } else if (node.messageKind === 'notifikasi') {
        this.emit(
          `if (typeof Notification !== 'undefined' && Notification.permission === 'granted') { new Notification(${msgVal}); } else { alert(${msgVal}); };`
        );
      }
      return;
    }

    // Auto-detect: if target is a string literal (or expression that's not a
    // DOM selector/identifier), treat as a message (alert). This prevents the
    // confusing behavior where `tampilkan "Hello"` was lowered to
    // `document.querySelector("Hello")` instead of `alert("Hello")`.
    if (
      node.target &&
      (node.target.type === 'Literal' ||
        node.target.type === 'BinaryExpression' ||
        node.target.type === 'TemplateLiteral')
    ) {
      const msgVal = this.lowerExpression(node.target);
      this.emit(`alert(${msgVal});`);
      return;
    }

    // Normal element show/mount
    const target = this.resolveTarget(node.target);
    const mountTarget = node.mountTarget ? this.resolveTarget(node.mountTarget) : null;

    if (mountTarget) {
      this.helpers.add('__mount');
      this.emit(`__mount(${target}, ${mountTarget});`);
    } else {
      // Show element (remove display:none if hidden)
      this.emit(`{ const __el = ${target}; if (__el) __el.style.display = ''; };`);
    }
  };

  PromptJSCompiler.prototype.visitSembunyikanStatement = function (node) {
    const target = this.resolveTarget(node.target);
    this.emit(`{ const __el = ${target}; if (__el) __el.style.display = 'none'; };`);
  };
}

module.exports = { install };
