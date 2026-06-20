// @ts-check

/**
 * PromptJS v0.2 — Statement Emitters / Emitor Statement
 * ============================================================================
 *
 * Statement visitor emitters separated from the main compiler.
 * Statement visitor emitters dipisah dari compiler utama.
 *
 * Fungsi `install` memasang semua `visit<NodeType>` ke `PromptJSCompiler.prototype`
 * sebagai statement emitter. Setiap visitor menerima AST node dan menulis
 * kode JavaScript ke `this.output` via `this.emit(...)`.
 */

'use strict';

/**
 * Pasang semua statement visitor ke `PromptJSCompiler.prototype`.
 *
 * Dipanggil sekali saat module load. Setelah `install`, instance PromptJSCompiler
 * akan memiliki semua `visit<NodeType>` method yang siap dipakai oleh `accept`
 * dispatch dari `compile()`.
 *
 * @param {Function} PromptJSCompiler - Constructor PromptJSCompiler
 * @param {Function} accept - Fungsi `accept` dari `utils/visitor` (dispatch visitor)
 * @returns {void}
 */
function install(PromptJSCompiler, accept) {
  // ═══════════════════════════════════════════════════════════════════════════════
  // VISITOR IMPLEMENTATIONS — DECLARATIONS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Emit `const <name> = __createReactive(<init>);` untuk DataDeclaration reaktif.
   *
   * @this {any}
   * @param {Object} node - AST node DataDeclaration
   * @returns {void | string}
   */
  PromptJSCompiler.prototype.visitDataDeclaration = function (node) {
    const initVal = this.lowerExpression(node.init);
    this.emit(`const ${node.name} = __createReactive(${initVal});`);
  };

  /**
   * Emit `const <name> = <init>;` untuk TetapDeclaration. Handle external data dari front-matter.
   *
   * @this {any}
   * @param {Object} node - AST node TetapDeclaration
   * @returns {void | string}
   */
  PromptJSCompiler.prototype.visitTetapDeclaration = function (node) {
    // PromptJS patch: handle external data from front-matter
    if (node._isExternal && node._externalInfo) {
      const info = node._externalInfo;
      if (info.type === 'inline' && info.value !== null && info.value !== undefined) {
        this.emit(`const ${node.name} = ${JSON.stringify(info.value)};`);
      } else if (info.type === 'file') {
        // File reference: at build time, the engine should have loaded the data.
        // If not loaded (dev mode), emit a placeholder that loads at runtime.
        this.emit(
          `const ${node.name} = window.__DATA__ && window.__DATA__.${node.name} || ${JSON.stringify(info.value || null)};`
        );
      } else {
        this.emit(`const ${node.name} = ${JSON.stringify(info.value || null)};`);
      }
      return;
    }
    const initVal = this.lowerExpression(node.init);
    this.emit(`const ${node.name} = ${initVal};`);
  };

  /**
   * Emit `let <name> = <init>;` untuk UbahDeclaration (mutable).
   *
   * @this {any}
   * @param {Object} node - AST node UbahDeclaration
   * @returns {void | string}
   */
  PromptJSCompiler.prototype.visitUbahDeclaration = function (node) {
    const initVal = this.lowerExpression(node.init);
    this.emit(`let ${node.name} = ${initVal};`);
  };

  /**
   * Emit `const <name> = __createComputed(() => <init>);` untuk TurunanDeclaration (computed).
   *
   * @this {any}
   * @param {Object} node - AST node TurunanDeclaration
   * @returns {void | string}
   */
  PromptJSCompiler.prototype.visitTurunanDeclaration = function (node) {
    const expr = this.lowerExpression(node.init);
    this.emit(`const ${node.name} = __createComputed(() => ${expr});`);
  };

  /**
   * Emit factory function `function __komp_<Name>(props) { ... return __root; }` untuk KomponenDeclaration.
   *
   * @this {any}
   * @param {Object} node - AST node KomponenDeclaration
   * @returns {void | string}
   */
  PromptJSCompiler.prototype.visitKomponenDeclaration = function (node) {
    // Component = factory function that takes a single named-props object and
    // returns a DOM element. Props are destructured into locals so the body can
    // reference them by name (e.g. `judul`).
    const componentVar = `__komp_${node.name}`;

    this.emit(`function ${componentVar}(props) {`);
    this.indent++;
    this.emit(`props = props || {};`);
    this.emit(`// Component: ${node.name}`);
    if (node.params && node.params.length > 0) {
      node.params.forEach((p) => {
        this.emit(`const ${p.name} = props.${p.name};`);
      });
    }
    this.emit(`const __root = document.createElement("div");`);

    // Set currentParent so child elements append to __root
    const prevParent = this.currentParent;
    this.currentParent = '__root';

    // Visit body (buat, ketika, etc.)
    if (node.body) accept(node.body, this);

    this.currentParent = prevParent;

    this.emit(`return __root;`);
    this.indent--;
    this.emit(`}`);

    // Expose component factory globally
    this.emit(`window.${node.name} = ${componentVar};`);
  };

  /**
   * Emit `function <name>(<params>) { ... }` untuk FungsiDeclaration.
   *
   * @this {any}
   * @param {Object} node - AST node FungsiDeclaration
   * @returns {void | string}
   */
  PromptJSCompiler.prototype.visitFungsiDeclaration = function (node) {
    const params = node.params.map((p) => p.name).join(', ');
    this.emit(`function ${node.name}(${params}) {`);
    this.indent++;
    accept(node.body, this);
    this.indent--;
    this.emit('}');
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // VISITOR IMPLEMENTATIONS — DOM STRUCTURE
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Emit pembuatan elemen DOM via `__createElement(tag, props, children)` (sangat kompleks, ~150 baris).
   *
   * @this {any}
   * @param {Object} node - AST node BuatStatement
   * @returns {void | string}
   */
  PromptJSCompiler.prototype.visitBuatStatement = function (node) {
    const varName = this.genVar('el');
    node.compiledVarName = varName; // Simpan untuk child reference

    // Tag alias mapping
    const tagAliases = {
      // Original aliases
      tombol: 'button',
      ruang: 'div',
      judul: 'h1',
      subjudul: 'h2',
      paragraf: 'p',
      gambar: 'img',
      tautan: 'a',
      masukan: 'input',
      pilihan: 'select',
      kolom: 'textarea',
      tabel: 'table',
      artikel: 'article',
      kanvas: 'canvas',
      opsi: 'option',
      fragmen: 'fragment',
      wadjud: 'h1',
      wadah: 'div',
      kotak: 'div',
      frm: 'form',
      frmMasuk: 'form',
      // PromptJS extended aliases (bilingual + additional)
      halaman: 'div',
      card: 'div',
      page: 'div',
      pemisah: 'hr',
      container: 'div',
      button: 'button',
      div: 'div',
      h1: 'h1',
      h2: 'h2',
      h3: 'h3',
      h4: 'h4',
      h5: 'h5',
      h6: 'h6',
      p: 'p',
      img: 'img',
      a: 'a',
      input: 'input',
      select: 'select',
      textarea: 'textarea',
      table: 'table',
      article: 'article',
      canvas: 'canvas',
      option: 'option',
      fragment: 'fragment',
      form: 'form',
      hr: 'hr',
      nav: 'nav',
      header: 'header',
      footer: 'footer',
      section: 'section',
      main: 'main',
      aside: 'aside',
      ul: 'ul',
      ol: 'ol',
      li: 'li',
      span: 'span',
      label: 'label',
      video: 'video',
      audio: 'audio',
      iframe: 'iframe',
      navigasi: 'nav',
      kepala: 'header',
      kaki: 'footer',
      bagian: 'section',
      utama: 'main',
      samping: 'aside',
      daftar: 'ul',
      item: 'li',
      rentang: 'span',
      bingkai: 'iframe',
    };

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
    if (tag === 'fragment') {
      // Make this fragment "transparent" — children see the grand-parent's
      // compiledVarName as their SelfReference target.
      if (this.currentParent) {
        node.compiledVarName = this.currentParent;
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
        this.emit(`${varName}.setAttribute("${attr.key}", ${attrVal});`);
      });
    }

    // Properti
    if (node.properties) {
      node.properties.forEach((p) => {
        const val = this.lowerExpression(p.value);
        if (p.key === 'teks') this.emit(`${varName}.innerText = ${val};`);
        else if (p.key === 'html') this.emit(`${varName}.innerHTML = ${val};`);
        else if (p.key === 'nilai') this.emit(`${varName}.value = ${val};`);
        else this.emit(`${varName}.setAttribute("${p.key}", ${val});`);
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
      this.emit(`document.body.appendChild(${varName});`);
    } else {
      this.emit(`${this.currentParent}.appendChild(${varName});`);
    }

    // Restore Buat body context
    this._inBuatBody = prevInBuatBody;
  };

  // ── PromptJS patch: TextNode emitter ──────────────────────────────────────────
  /**
   * Emit `document.createTextNode(<text>);` untuk TextNode (child string literal).
   *
   * @this {any}
   * @param {Object} node - AST node TextNode
   * @returns {void | string}
   */
  PromptJSCompiler.prototype.visitTextNode = function (node) {
    const varName = this.genVar('txt');
    this.emit(`const ${varName} = document.createTextNode(${JSON.stringify(node.value)});`);
    if (!this.currentParent) {
      this.emit(`document.body.appendChild(${varName});`);
    } else {
      this.emit(`${this.currentParent}.appendChild(${varName});`);
    }
  };

  /**
   * Emit `__mount(<target>, <mountTarget>);` untuk TampilkanStatement.
   *
   * @this {any}
   * @param {Object} node - AST node TampilkanStatement
   * @returns {void | string}
   */
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

    // Normal element show/mount
    const target = this.resolveTarget(node.target);
    const mountTarget = node.mountTarget ? this.resolveTarget(node.mountTarget) : null;

    if (mountTarget) {
      this.emit(`__mount(${target}, ${mountTarget});`);
    } else {
      // Show element (remove display:none if hidden)
      this.emit(`{ const __el = ${target}; if (__el) __el.style.display = ''; };`);
    }
  };

  /**
   * Emit `<target>.style.display = "none";` untuk SembunyikanStatement.
   *
   * @this {any}
   * @param {Object} node - AST node SembunyikanStatement
   * @returns {void | string}
   */
  PromptJSCompiler.prototype.visitSembunyikanStatement = function (node) {
    const target = this.resolveTarget(node.target);
    this.emit(`{ const __el = ${target}; if (__el) __el.style.display = 'none'; };`);
  };

  /**
   * Emit `<target>.remove();` untuk HapusStatement.
   *
   * @this {any}
   * @param {Object} node - AST node HapusStatement
   * @returns {void | string}
   */
  PromptJSCompiler.prototype.visitHapusStatement = function (node) {
    const target = this.resolveTarget(node.target);
    this.emit(
      `{ const __el = ${target}; if (__el && __el.parentElement) __el.parentElement.removeChild(__el); };`
    );
  };

  /**
   * Emit `<array>.splice(<array>.indexOf(<item>), 1);` untuk HapusDariStatement.
   *
   * @this {any}
   * @param {Object} node - AST node HapusDariStatement
   * @returns {void | string}
   */
  PromptJSCompiler.prototype.visitHapusDariStatement = function (node) {
    const item = this.lowerExpression(node.item);
    const arr = node.fromArray;
    const isReactive = node.fromArrayReactive;

    if (isReactive) {
      // Reactive array: use filter to remove item and trigger Proxy setter
      // arr.value = arr.value.filter(__item => __item !== item)
      this.emit(`${arr}.value = ${arr}.value.filter((__item) => __item !== ${item});`);
    } else {
      // Non-reactive array: use filter with assignment
      this.emit(`${arr} = ${arr}.filter((__item) => __item !== ${item});`);
    }
  };

  /**
   * Emit `<target>.innerHTML = "";` untuk KosongkanStatement.
   *
   * @this {any}
   * @param {Object} node - AST node KosongkanStatement
   * @returns {void | string}
   */
  PromptJSCompiler.prototype.visitKosongkanStatement = function (node) {
    const target = this.resolveTarget(node.target);
    this.emit(`{ const __el = ${target}; if (__el) __el.innerHTML = ''; };`);
  };

  /**
   * Emit update properti elemen DOM (mis. `el.innerText = ...`, `el.className = ...`) untuk PerbaruiStatement.
   *
   * @this {any}
   * @param {Object} node - AST node PerbaruiStatement
   * @returns {void | string}
   */
  PromptJSCompiler.prototype.visitPerbaruiStatement = function (node) {
    const val = this.lowerExpression(node.value);
    const target = this.resolveTarget(node.target);

    const propertyMap = {
      teks: 'innerText',
      html: 'innerHTML',
      nilai: 'value',
      kelas: 'className',
      gaya: 'style.cssText',
      sumber: 'src',
      src: 'src',
      tautan: 'href',
      href: 'href',
      tipe: 'type',
      nama: 'name',
      ditandai: 'checked',
      nonaktif: 'disabled',
      placeholder: 'placeholder',
      atribut: 'setAttribute',
    };

    const jsProp = propertyMap[node.property];
    if (jsProp) {
      this.emit(`${target}.${jsProp} = ${val};`);
    } else {
      this.emit(`${target}.setAttribute("${node.property}", ${val});`);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // VISITOR IMPLEMENTATIONS — BEHAVIOR & EVENTS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Emit `el.addEventListener("<event>", function(e) { ... });` untuk KetikaStatement (sangat kompleks, ~80 baris).
   *
   * @this {any}
   * @param {Object} node - AST node KetikaStatement
   * @returns {void | string}
   */
  PromptJSCompiler.prototype.visitKetikaStatement = function (node) {
    const eventMap = {
      diklik: 'click',
      diketik: 'input',
      disubmit: 'submit',
      diubah: 'change',
      ditekan: 'keydown',
      dilepas: 'keyup',
      dimuat: 'DOMContentLoaded',
      difokus: 'focus',
      diblur: 'blur',
      ditinggal: 'blur',
      diarahkan: 'mouseover',
      'ditinggal-kursor': 'mouseout',
      digulir: 'scroll',
      diseret: 'dragstart',
      diubahukuran: 'resize',
      dipindah: 'drag',
      dikirim: 'submit',
      direset: 'reset',
      dikonteks: 'contextmenu',
      dilewat: 'paste',
      masuk: 'mouseenter',
      keluar: 'mouseleave',
      aktif: 'focus',
      nonaktif: 'blur',
      muat: 'load',
      salah: 'error',
      dipasang: '__promptjs_mounted',
      'dilepas-dari-dom': '__promptjs_unmounted',
    };

    const eventName = eventMap[node.event] || node.event;
    let target = 'document';

    if (node.target) {
      if (node.target.type === 'SelfReference') {
        target = node.target.referencedNode.compiledVarName || 'null';
      } else if (node.target.type === 'Identifier') {
        if (node.target.name === 'halaman') {
          target = 'document';
        } else {
          target = node.target.name;
        }
      } else if (node.target.type === 'Selector') {
        target = this.resolveTarget(node.target);
      } else if (node.target.type === 'Literal') {
        target = `document.querySelector("${node.target.value}")`;
      }
    }

    // Custom events (mounted/unmounted) need MutationObserver
    if (eventName === '__promptjs_mounted' || eventName === '__promptjs_unmounted') {
      const domEvent = eventName === '__promptjs_mounted' ? 'DOMNodeInserted' : 'DOMNodeRemoved';
      this.emit(`${target}.addEventListener("${domEvent}", (event) => {`);
    } else if (eventName === 'DOMContentLoaded') {
      this.emit(`document.addEventListener("DOMContentLoaded", (event) => {`);
    } else {
      this.emit(`${target}.addEventListener("${eventName}", (event) => {`);
    }

    this.indent++;
    if (node.event === 'disubmit') this.emit('event.preventDefault();');

    if (node.body) accept(node.body, this);
    if (node.action) {
      // PromptJS patch: action may be an expression (CallExpression, etc.)
      // Expression visitors return JS code strings. We emit them here as statements.
      // Use lowerExpression directly to avoid double-emission from visitCallExpression.
      const actionCode = this.lowerExpression(node.action);
      if (actionCode && actionCode !== 'undefined') {
        this.emit(actionCode + ';');
      }
    }

    this.indent--;
    this.emit('});');
  };

  /**
   * Emit `__watch(<target>, function(n, o) { ... });` untuk SaatStatement (reactive watcher).
   *
   * @this {any}
   * @param {Object} node - AST node SaatStatement
   * @returns {void | string}
   */
  PromptJSCompiler.prototype.visitSaatStatement = function (node) {
    this.emit(`__watch(${node.target}, (nilaiBaru, nilaiLama) => {`);
    this.indent++;
    accept(node.body, this);
    this.indent--;
    this.emit('});');
  };

  /**
   * Emit lifecycle hook (mis. `__mount` callback untuk `pasang`/`mount`) untuk LifecycleStatement.
   *
   * @this {any}
   * @param {Object} node - AST node LifecycleStatement
   * @returns {void | string}
   */
  PromptJSCompiler.prototype.visitLifecycleStatement = function (node) {
    // Lifecycle hooks: dipasang, dilepas, diperbarui.
    // Emitted directly via DOM event listeners based on node.kind below.
    this.emit(`// Lifecycle: saat komponen ${node.kind}`);
    if (node.kind === 'dipasang') {
      // mounted — schedule to run after DOM is ready
      this.emit(`if (document.readyState === 'loading') {`);
      this.indent++;
      this.emit(`document.addEventListener('DOMContentLoaded', () => {`);
      this.indent++;
      accept(node.body, this);
      this.indent--;
      this.emit(`});`);
      this.indent--;
      this.emit(`} else {`);
      this.indent++;
      accept(node.body, this);
      this.indent--;
      this.emit(`}`);
    } else if (node.kind === 'dilepas') {
      // unmounted — use beforeunload as approximation
      this.emit(`window.addEventListener('beforeunload', () => {`);
      this.indent++;
      accept(node.body, this);
      this.indent--;
      this.emit(`});`);
    } else {
      // Generic lifecycle — just emit the body
      accept(node.body, this);
    }
  };

  /**
   * Emit `setTimeout(function() { ... }, 0);` untuk SetelahStatement (next-tick).
   *
   * @this {any}
   * @param {Object} node - AST node SetelahStatement
   * @returns {void | string}
   */
  PromptJSCompiler.prototype.visitSetelahStatement = function (node) {
    // "setelah X selesai" — X adalah nama operasi/fungsi async
    // Lower to: X().then(() => { ... }) atau callback setelah pemanggilan
    const target = node.target;

    // Cek apakah target adalah fungsi yang sudah di-resolve.
    // Jika ya, panggil langsung tanpa typeof check (fungsi lokal selalu ada).
    // Jika tidak, gunakan typeof check untuk keamanan (external/async).
    const isLocalFunction = node.targetSymbol && node.targetSymbol.isFunction;
    const callExpr = isLocalFunction
      ? `${target}()`
      : `(typeof ${target} === 'function' ? ${target}() : ${target})`;

    this.emit(`// setelah ${target} selesai`);
    if (node.body) {
      this.emit(`Promise.resolve(${callExpr}).then((__result) => {`);
      this.indent++;
      accept(node.body, this);
      this.indent--;
      this.emit(`});`);
    } else if (node.action) {
      this.emit(`Promise.resolve(${callExpr}).then((__result) => {`);
      this.indent++;
      accept(node.action, this);
      this.indent--;
      this.emit(`});`);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // VISITOR IMPLEMENTATIONS — LOGIC & CONTROL FLOW
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Emit `if (<cond>) { ... } else { ... }` untuk JikaStatement.
   *
   * @this {any}
   * @param {Object} node - AST node JikaStatement
   * @returns {void | string}
   */
  PromptJSCompiler.prototype.visitJikaStatement = function (node) {
    const cond = this.lowerExpression(node.condition);
    this.emit(`if (${cond}) {`);
    this.indent++;
    accept(node.consequent, this);
    this.indent--;
    if (node.alternate) {
      this.emit('} else {');
      this.indent++;
      accept(node.alternate, this);
      this.indent--;
    }
    this.emit('}');
  };

  /**
   * Emit `for (...) { ... }` untuk UlangiStatement (3 varian: counted, iterasi, range).
   *
   * @this {any}
   * @param {Object} node - AST node UlangiStatement
   * @returns {void | string}
   */
  PromptJSCompiler.prototype.visitUlangiStatement = function (node) {
    const source = this.lowerExpression(node.source);

    if (node.kind === 'kali') {
      // "ulangi N kali:" → for loop
      this.emit(`for (let __i = 0; __i < ${source}; __i++) {`);
      this.indent++;
      accept(node.body, this);
      this.indent--;
      this.emit(`}`);
    } else if (node.kind === 'rentang') {
      // "ulangi item dari A sampai B:" → for range
      const rangeEnd = node.rangeEnd ? this.lowerExpression(node.rangeEnd) : source;
      this.emit(
        `for (let ${node.iteratorName} = ${source}; ${node.iteratorName} <= ${rangeEnd}; ${node.iteratorName}++) {`
      );
      this.indent++;
      accept(node.body, this);
      this.indent--;
      this.emit(`}`);
    } else {
      // "ulangi item dari sumber:" → forEach
      this.emit(`${source}.forEach((${node.iteratorName}, indeks) => {`);
      this.indent++;
      accept(node.body, this);
      this.indent--;
      this.emit('});');
    }
  };

  /**
   * Emit `while (<cond>) { ... }` untuk SelamaStatement.
   *
   * @this {any}
   * @param {Object} node - AST node SelamaStatement
   * @returns {void | string}
   */
  PromptJSCompiler.prototype.visitSelamaStatement = function (node) {
    const cond = this.lowerExpression(node.condition);
    this.emit(`while (${cond}) {`);
    this.indent++;
    accept(node.body, this);
    this.indent--;
    this.emit('}');
  };

  /**
   * Emit `break;` untuk BerhentiStatement.
   *
   * @this {any}
   * @param {Object} _node - AST node BerhentiStatement
   * @returns {void | string}
   */
  PromptJSCompiler.prototype.visitBerhentiStatement = function (_node) {
    this.emit(`break;`);
  };

  /**
   * Emit `continue;` untuk LewatiStatement.
   *
   * @this {any}
   * @param {Object} _node - AST node LewatiStatement
   * @returns {void | string}
   */
  PromptJSCompiler.prototype.visitLewatiStatement = function (_node) {
    // PromptJS patch: "pass" inside a BuatStatement means "empty element body" — emit nothing.
    // "lewati" inside a loop means "skip this iteration" — emit continue.
    // We use a context flag set by visitBuatStatement.
    if (this._inBuatBody) {
      // pass as empty body marker — nothing to emit
      return;
    }
    this.emit(`continue;`);
  };

  /**
   * Emit `return <value>;` untuk KembalikanStatement.
   *
   * @this {any}
   * @param {Object} node - AST node KembalikanStatement
   * @returns {void | string}
   */
  PromptJSCompiler.prototype.visitKembalikanStatement = function (node) {
    if (node.value) {
      const val = this.lowerExpression(node.value);
      this.emit(`return ${val};`);
    } else {
      this.emit(`return;`);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // VISITOR IMPLEMENTATIONS — DATA & REACTIVITY
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Cek apakah target variabel bersifat reaktif (data/turunan)
   * atau biasa (ubah/tetap). Menentukan cara assign yang benar.
   *
   * - Reaktif (data, turunan) → Proxy punya .value → gunakan __setState()
   * - Biasa (ubah) → plain variable → gunakan assignment langsung
   * - Tidak diketahui → fallback ke __setState (aman untuk Proxy)
   */
  PromptJSCompiler.prototype._isTargetReactive = function (node) {
    if (node.targetSymbol) {
      return node.targetSymbol.isReactive === true;
    }
    // Fallback: jika tidak ada metadata resolver, anggap reaktif
    // (lebih aman karena __setState bekerja dengan Proxy)
    return true;
  };

  /**
   * Emit assignment ke variabel/property reaktif (mis. `<target>.value = <value>;`) untuk SimpanStatement.
   *
   * @this {any}
   * @param {Object} node - AST node SimpanStatement
   * @returns {void | string}
   */
  PromptJSCompiler.prototype.visitSimpanStatement = function (node) {
    const target = node.target;
    const val = this.lowerExpression(node.value);
    if (this._isTargetReactive(node)) {
      // data/turunan → Proxy, gunakan __setState
      this.emit(`__setState(${target}, ${val});`);
    } else {
      // ubah → plain variable, assignment langsung
      this.emit(`${target} = ${val};`);
    }
  };

  /**
   * Emit `<array>.push(<value>);` untuk TambahkanStatement.
   *
   * @this {any}
   * @param {Object} node - AST node TambahkanStatement
   * @returns {void | string}
   */
  PromptJSCompiler.prototype.visitTambahkanStatement = function (node) {
    const target = node.target;
    const jumlah = this.lowerExpression(node.value);
    if (this._isTargetReactive(node)) {
      // data/turunan → Proxy, akses via .value
      this.emit(`__setState(${target}, ${target}.value + ${jumlah});`);
    } else {
      // ubah → plain variable, assignment langsung
      this.emit(`${target} = ${target} + ${jumlah};`);
    }
  };

  /**
   * Emit `<array>.splice(...)` atau `<target> -= <value>;` untuk KurangiStatement.
   *
   * @this {any}
   * @param {Object} node - AST node KurangiStatement
   * @returns {void | string}
   */
  PromptJSCompiler.prototype.visitKurangiStatement = function (node) {
    const target = node.target;
    // Default ke 1 jika tidak ada value (kurangi counter → counter - 1)
    const jumlah = node.value ? this.lowerExpression(node.value) : '1';
    if (this._isTargetReactive(node)) {
      // data/turunan → Proxy, akses via .value
      this.emit(`__setState(${target}, ${target}.value - ${jumlah});`);
    } else {
      // ubah → plain variable, assignment langsung
      this.emit(`${target} = ${target} - ${jumlah};`);
    }
  };

  /**
   * Emit `<array>.splice(idx, 0, <value>);` untuk SisipkanStatement.
   *
   * @this {any}
   * @param {Object} node - AST node SisipkanStatement
   * @returns {void | string}
   */
  PromptJSCompiler.prototype.visitSisipkanStatement = function (node) {
    const val = this.lowerExpression(node.value);
    const target = node.target;
    if (this._isTargetReactive(node)) {
      // data/turunan → Proxy, push lalu trigger reaktivitas via spread assignment
      // .push() saja bermutasi array tanpa mengubah reference .value,
      // sehingga Proxy setter tidak terpicu dan watcher tidak terpanggil.
      this.emit(`${target}.value.push(${val}); ${target}.value = [...${target}.value];`);
    } else {
      // ubah → plain array, push langsung
      this.emit(`${target}.push(${val});`);
    }
  };

  /**
   * Emit assignment dari nilai DOM (mis. `const <target> = <source>.value;`) untuk AmbilDomStatement.
   *
   * @this {any}
   * @param {Object} node - AST node AmbilDomStatement
   * @returns {void | string}
   */
  PromptJSCompiler.prototype.visitAmbilDomStatement = function (node) {
    // "ambil nilai/teks/html/dll dari sumber -> simpan ke target"
    const source = this.resolveTarget(node.source);
    const targetVar = node.target; // string nama variabel

    const kindMap = {
      nilai: 'value',
      teks: 'innerText',
      html: 'innerHTML',
      tinggi: 'offsetHeight',
      lebar: 'offsetWidth',
      atribut: null, // khusus — pakai getAttribute
    };

    if (node.kind === 'atribut') {
      const attrName = node.attributeName || '';
      this.emit(`__setState(${targetVar}, ${source}.getAttribute("${attrName}"));`);
    } else {
      const jsProp = kindMap[node.kind] || node.kind;
      this.emit(`__setState(${targetVar}, ${source}.${jsProp});`);
    }
  };

  /**
   * Emit `fetch(<url>, <options>).then(...).catch(...)` untuk AmbilLuarStatement (sangat kompleks, ~60 baris).
   *
   * @this {any}
   * @param {Object} node - AST node AmbilLuarStatement
   * @returns {void | string}
   */
  PromptJSCompiler.prototype.visitAmbilLuarStatement = function (node) {
    // "ambil dari URL" → fetch API
    const url = this.lowerExpression(node.url);

    // Build fetch options
    let fetchOptions = '{}';
    if (node.options && node.options.length > 0) {
      const optPairs = node.options.map((opt) => {
        const val = this.lowerExpression(opt.value);
        return `"${opt.key}": ${val}`;
      });
      fetchOptions = `{ ${optPairs.join(', ')} }`;
    }

    this.emit(`fetch(${url}, ${fetchOptions})`);
    this.indent++;

    // Process branches (berhasil, gagal, selalu)
    if (node.branches && node.branches.length > 0) {
      node.branches.forEach((branch) => {
        if (branch.kind === 'berhasil') {
          this.emit(`.then((__response) => {`);
          this.indent++;
          this.emit(`if (!__response.ok) throw new Error("HTTP " + __response.status);`);
          this.emit(`return __response.json();`);
          this.indent--;
          this.emit(`})`);
          this.emit(`.then((__data) => {`);
          this.indent++;
          if (branch.action) accept(branch.action, this);
          this.indent--;
          this.emit(`})`);
        } else if (branch.kind === 'gagal') {
          this.emit(`.catch((__error) => {`);
          this.indent++;
          this.emit(`console.error("AmbilLuar gagal:", __error);`);
          if (branch.action) accept(branch.action, this);
          this.indent--;
          this.emit(`})`);
        } else if (branch.kind === 'selalu') {
          this.emit(`.finally(() => {`);
          this.indent++;
          if (branch.action) accept(branch.action, this);
          this.indent--;
          this.emit(`})`);
        }
      });
    } else {
      // No branches — just log
      this.emit(`.then(r => r.json())`);
      this.emit(`.catch(e => console.error(e))`);
    }

    this.emit(`;`);
    this.indent--;
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // VISITOR IMPLEMENTATIONS — KOMPONEN & GUNAKAN
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Emit instansiasi komponen `__komp_<Name>({prop: val, ...})` + append ke parent untuk GunakanStatement.
   *
   * @this {any}
   * @param {Object} node - AST node GunakanStatement
   * @returns {void | string}
   */
  PromptJSCompiler.prototype.visitGunakanStatement = function (node) {
    // "gunakan NamaKomponen dengan props di target"
    const componentFactory = `__komp_${node.componentName}`;

    // Build props object
    let propsArg = '';
    if (node.props && node.props.length > 0) {
      const propPairs = node.props.map((p) => {
        const val = this.lowerExpression(p.value);
        return `"${p.key}": ${val}`;
      });
      propsArg = `{ ${propPairs.join(', ')} }`;
    }

    const instanceVar = this.genVar('komp');
    this.emit(`const ${instanceVar} = ${componentFactory}(${propsArg});`);

    // Mount ke target
    if (node.mountTarget) {
      const mountTarget = this.resolveTarget(node.mountTarget);
      this.emit(`${mountTarget}.appendChild(${instanceVar});`);
    } else if (this.currentParent) {
      this.emit(`${this.currentParent}.appendChild(${instanceVar});`);
    } else {
      this.emit(`document.body.appendChild(${instanceVar});`);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // VISITOR IMPLEMENTATIONS — NAVIGASI
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Emit `window.location.href = <url>;` untuk ArahkanStatement.
   *
   * @this {any}
   * @param {Object} node - AST node ArahkanStatement
   * @returns {void | string}
   */
  PromptJSCompiler.prototype.visitArahkanStatement = function (node) {
    // "arahkan ke URL" → window.location.href
    const url = this.lowerExpression(node.url);
    this.emit(`window.location.href = ${url};`);
  };

  /**
   * Emit `window.location.reload();` untuk MuatUlangStatement.
   *
   * @this {any}
   * @param {Object} _node - AST node MuatUlangStatement
   * @returns {void | string}
   */
  PromptJSCompiler.prototype.visitMuatUlangStatement = function (_node) {
    this.emit(`window.location.reload();`);
  };

  /**
   * Emit `window.history.back();` untuk KembaliStatement.
   *
   * @this {any}
   * @param {Object} _node - AST node KembaliStatement
   * @returns {void | string}
   */
  PromptJSCompiler.prototype.visitKembaliStatement = function (_node) {
    this.emit(`window.history.back();`);
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // VISITOR IMPLEMENTATIONS — INTEROP & RANTAI AKSI
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Emit raw JS string apa adanya untuk LangsungBlock (JS passthrough).
   *
   * @this {any}
   * @param {Object} node - AST node LangsungBlock
   * @returns {void | string}
   */
  PromptJSCompiler.prototype.visitLangsungBlock = function (node) {
    this.emit(node.content);
  };

  /**
   * Lower PanggilNativeExpression ke ekspresi JS (mis. `Math.max(a, b)`).
   *
   * @this {any}
   * @param {Object} node - AST node PanggilNativeExpression
   * @returns {void | string}
   */
  PromptJSCompiler.prototype.visitPanggilNativeExpression = function (node) {
    const args = node.arguments.map((a) => this.lowerExpression(a)).join(', ');
    // Gunakan lowerExpression untuk callee, bukan .name langsung
    // Ini mendukung MemberExpression seperti console.log, document.querySelector
    const calleeCode = this.lowerExpression(node.callee);
    const code = `${calleeCode}(${args})`;

    if (this.currentParent) {
      // Jika dipanggil sebagai statement di dalam blok 'buat'
      this.emit(`${code};`);
    } else {
      return code;
    }
  };

  /**
   * Lower JalankanExpression ke pemanggilan fungsi PromptJS.
   *
   * @this {any}
   * @param {Object} node - AST node JalankanExpression
   * @returns {void | string}
   */
  PromptJSCompiler.prototype.visitJalankanExpression = function (node) {
    // Hanya gunakan node.arguments atau node.withArgs
    const args = (node.arguments || node.withArgs || []).map((a) => this.lowerExpression(a));
    const code = `${node.callee}(${args.join(', ')})`;

    // Jika dipakai sebagai statement di dalam blok 'buat' (ada currentParent),
    // emit langsung; jika tidak, kembalikan sebagai ekspresi.
    if (this.currentParent) {
      this.emit(`${code};`);
    } else {
      return code;
    }
  };

  /**
   * Emit rantai aksi berurutan `aksi1(); aksi2(); aksi3();` untuk RantaiAksi.
   *
   * @this {any}
   * @param {Object} node - AST node RantaiAksi
   * @returns {void | string}
   */
  PromptJSCompiler.prototype.visitRantaiAksi = function (node) {
    // RantaiAksi: first statement diikuti chain of actions
    // "aksi1 lalu aksi2 lalu aksi3"
    // Lower: jalankan first, lalu chain secara berurutan

    // Visit the first action
    if (node.first) accept(node.first, this);

    // Visit each chained action
    if (node.chain && node.chain.length > 0) {
      node.chain.forEach((chainedAction) => {
        accept(chainedAction, this);
      });
    }
  };

  // ── PromptJS patch: Expression visitors ────────────────────────────────────────
  // These visitors return JS code strings so that expression nodes used as
  // statements (e.g., CallExpression in KetikaStatement.action) get emitted.
  // Without these, BaseVisitor.genericVisit would just traverse children
  // without producing any output.

  /**
   * Lower CallExpression ke ekspresi JS (delegate ke `lowerExpression`).
   *
   * @this {any}
   * @param {Object} node - AST node CallExpression
   * @returns {void | string}
   */
  PromptJSCompiler.prototype.visitCallExpression = function (node) {
    const code = this.lowerExpression(node);
    if (this.currentParent) {
      this.emit(code + ';');
    }
    return code;
  };

  /**
   * Lower Identifier ke ekspresi JS (delegate ke `lowerExpression`).
   *
   * @this {any}
   * @param {Object} node - AST node Identifier
   * @returns {void | string}
   */
  PromptJSCompiler.prototype.visitIdentifier = function (node) {
    return this.lowerExpression(node);
  };

  /**
   * Lower Literal ke ekspresi JS (delegate ke `lowerExpression`).
   *
   * @this {any}
   * @param {Object} node - AST node Literal
   * @returns {void | string}
   */
  PromptJSCompiler.prototype.visitLiteral = function (node) {
    return this.lowerExpression(node);
  };

  /**
   * Lower BinaryExpression ke ekspresi JS (delegate ke `lowerExpression`).
   *
   * @this {any}
   * @param {Object} node - AST node BinaryExpression
   * @returns {void | string}
   */
  PromptJSCompiler.prototype.visitBinaryExpression = function (node) {
    return this.lowerExpression(node);
  };

  /**
   * Lower UnaryExpression ke ekspresi JS (delegate ke `lowerExpression`).
   *
   * @this {any}
   * @param {Object} node - AST node UnaryExpression
   * @returns {void | string}
   */
  PromptJSCompiler.prototype.visitUnaryExpression = function (node) {
    return this.lowerExpression(node);
  };

  /**
   * Lower MemberExpression ke ekspresi JS (delegate ke `lowerExpression`).
   *
   * @this {any}
   * @param {Object} node - AST node MemberExpression
   * @returns {void | string}
   */
  PromptJSCompiler.prototype.visitMemberExpression = function (node) {
    return this.lowerExpression(node);
  };

  /**
   * Lower ObjectLiteral ke ekspresi JS (delegate ke `lowerExpression`).
   *
   * @this {any}
   * @param {Object} node - AST node ObjectLiteral
   * @returns {void | string}
   */
  PromptJSCompiler.prototype.visitObjectLiteral = function (node) {
    return this.lowerExpression(node);
  };

  /**
   * Lower ArrayLiteral ke ekspresi JS (delegate ke `lowerExpression`).
   *
   * @this {any}
   * @param {Object} node - AST node ArrayLiteral
   * @returns {void | string}
   */
  PromptJSCompiler.prototype.visitArrayLiteral = function (node) {
    return this.lowerExpression(node);
  };

  PromptJSCompiler.prototype.visitJalankanExpression = function (node) {
    const code = this.lowerExpression(node);
    if (this.currentParent) {
      this.emit(code + ';');
    }
    return code;
  };
}

module.exports = { install };
