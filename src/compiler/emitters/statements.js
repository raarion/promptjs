/**
 * PromptJS v0.2 — Statement Emitters
 * ============================================================================
 * Statement visitor emitters dipisah dari compiler utama.
 */

'use strict';

function install(PromptJSCompiler, accept) {
  // ═══════════════════════════════════════════════════════════════════════════════
  // VISITOR IMPLEMENTATIONS — DECLARATIONS
  // ═══════════════════════════════════════════════════════════════════════════════

  PromptJSCompiler.prototype.visitDataDeclaration = function(node) {
    const initVal = this.lowerExpression(node.init);
    this.emit(`const ${node.name} = __createReactive(${initVal});`);
  };

  PromptJSCompiler.prototype.visitTetapDeclaration = function(node) {
    // PromptJS patch: handle external data from front-matter
    if (node._isExternal && node._externalInfo) {
      const info = node._externalInfo;
      if (info.type === 'inline' && info.value !== null && info.value !== undefined) {
        this.emit(`const ${node.name} = ${JSON.stringify(info.value)};`);
      } else if (info.type === 'file') {
        // File reference: at build time, the engine should have loaded the data.
        // If not loaded (dev mode), emit a placeholder that loads at runtime.
        this.emit(`const ${node.name} = window.__DATA__ && window.__DATA__.${node.name} || ${JSON.stringify(info.value || null)};`);
      } else {
        this.emit(`const ${node.name} = ${JSON.stringify(info.value || null)};`);
      }
      return;
    }
    const initVal = this.lowerExpression(node.init);
    this.emit(`const ${node.name} = ${initVal};`);
  };

  PromptJSCompiler.prototype.visitUbahDeclaration = function(node) {
    const initVal = this.lowerExpression(node.init);
    this.emit(`let ${node.name} = ${initVal};`);
  };

  PromptJSCompiler.prototype.visitTurunanDeclaration = function(node) {
    const expr = this.lowerExpression(node.init);
    this.emit(`const ${node.name} = __createComputed(() => ${expr});`);
  };

  PromptJSCompiler.prototype.visitKomponenDeclaration = function(node) {
    // Component = factory function that takes a single named-props object and
    // returns a DOM element. Props are destructured into locals so the body can
    // reference them by name (e.g. `judul`).
    const componentVar = `__komp_${node.name}`;

    this.emit(`function ${componentVar}(props) {`);
    this.indent++;
    this.emit(`props = props || {};`);
    this.emit(`// Component: ${node.name}`);
    if (node.params && node.params.length > 0) {
      node.params.forEach(p => {
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

  PromptJSCompiler.prototype.visitFungsiDeclaration = function(node) {
    const params = node.params.map(p => p.name).join(', ');
    this.emit(`function ${node.name}(${params}) {`);
    this.indent++;
    accept(node.body, this);
    this.indent--;
    this.emit("}");
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // VISITOR IMPLEMENTATIONS — DOM STRUCTURE
  // ═══════════════════════════════════════════════════════════════════════════════

  PromptJSCompiler.prototype.visitBuatStatement = function(node) {
    const varName = this.genVar('el');
    node.compiledVarName = varName; // Simpan untuk child reference

    // Tag alias mapping
    const tagAliases = {
      // Original aliases
      'tombol': 'button',
      'ruang': 'div',
      'judul': 'h1',
      'subjudul': 'h2',
      'paragraf': 'p',
      'gambar': 'img',
      'tautan': 'a',
      'masukan': 'input',
      'pilihan': 'select',
      'kolom': 'textarea',
      'tabel': 'table',
      'artikel': 'article',
      'kanvas': 'canvas',
      'opsi': 'option',
      'fragmen': 'fragment',
      'wadjud': 'h1',
      'wadah': 'div',
      'kotak': 'div',
      'frm': 'form',
      'frmMasuk': 'form',
      // PromptJS extended aliases (bilingual + additional)
      'halaman': 'div',
      'card': 'div',
      'page': 'div',
      'pemisah': 'hr',
      'container': 'div',
      'button': 'button',
      'div': 'div',
      'h1': 'h1', 'h2': 'h2', 'h3': 'h3', 'h4': 'h4', 'h5': 'h5', 'h6': 'h6',
      'p': 'p',
      'img': 'img',
      'a': 'a',
      'input': 'input',
      'select': 'select',
      'textarea': 'textarea',
      'table': 'table',
      'article': 'article',
      'canvas': 'canvas',
      'option': 'option',
      'fragment': 'fragment',
      'form': 'form',
      'hr': 'hr',
      'nav': 'nav',
      'header': 'header',
      'footer': 'footer',
      'section': 'section',
      'main': 'main',
      'aside': 'aside',
      'ul': 'ul',
      'ol': 'ol',
      'li': 'li',
      'span': 'span',
      'label': 'label',
      'video': 'video',
      'audio': 'audio',
      'iframe': 'iframe',
      'navigasi': 'nav',
      'kepala': 'header',
      'kaki': 'footer',
      'bagian': 'section',
      'utama': 'main',
      'samping': 'aside',
      'daftar': 'ul',
      'item': 'li',
      'rentang': 'span',
      'bingkai': 'iframe',
    };

    const tag = tagAliases[node.selector.tag] || node.selector.tag;

    // ── PromptJS patch: fragment should NOT create a DOM element ──
    // Instead, just visit children and append them directly to the current parent.
    if (tag === 'fragment') {
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
      node.selector.attributes.forEach(attr => {
        const attrVal = attr.value ? this.lowerExpression(attr.value) : '""';
        this.emit(`${varName}.setAttribute("${attr.key}", ${attrVal});`);
      });
    }

    // Properti
    if (node.properties) {
      node.properties.forEach(p => {
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
  PromptJSCompiler.prototype.visitTextNode = function(node) {
    const varName = this.genVar('txt');
    this.emit(`const ${varName} = document.createTextNode(${JSON.stringify(node.value)});`);
    if (!this.currentParent) {
      this.emit(`document.body.appendChild(${varName});`);
    } else {
      this.emit(`${this.currentParent}.appendChild(${varName});`);
    }
  };

  PromptJSCompiler.prototype.visitTampilkanStatement = function(node) {
    // Handle message kinds: pesan, pesan-error, notifikasi
    if (node.messageKind) {
      const msgVal = this.lowerExpression(node.target);
      if (node.messageKind === 'pesan') {
        this.emit(`alert(${msgVal});`);
      } else if (node.messageKind === 'pesan-error') {
        this.emit(`console.error(${msgVal});`);
      } else if (node.messageKind === 'notifikasi') {
        this.emit(`if (typeof Notification !== 'undefined' && Notification.permission === 'granted') { new Notification(${msgVal}); } else { alert(${msgVal}); };`);
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

  PromptJSCompiler.prototype.visitSembunyikanStatement = function(node) {
    const target = this.resolveTarget(node.target);
    this.emit(`{ const __el = ${target}; if (__el) __el.style.display = 'none'; };`);
  };

  PromptJSCompiler.prototype.visitHapusStatement = function(node) {
    const target = this.resolveTarget(node.target);
    this.emit(`{ const __el = ${target}; if (__el && __el.parentElement) __el.parentElement.removeChild(__el); };`);
  };

  PromptJSCompiler.prototype.visitHapusDariStatement = function(node) {
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

  PromptJSCompiler.prototype.visitKosongkanStatement = function(node) {
    const target = this.resolveTarget(node.target);
    this.emit(`{ const __el = ${target}; if (__el) __el.innerHTML = ''; };`);
  };

  PromptJSCompiler.prototype.visitPerbaruiStatement = function(node) {
    const val = this.lowerExpression(node.value);
    const target = this.resolveTarget(node.target);

    const propertyMap = {
      'teks': 'innerText',
      'html': 'innerHTML',
      'nilai': 'value',
      'kelas': 'className',
      'gaya': 'style.cssText',
      'sumber': 'src',
      'src': 'src',
      'tautan': 'href',
      'href': 'href',
      'tipe': 'type',
      'nama': 'name',
      'ditandai': 'checked',
      'nonaktif': 'disabled',
      'placeholder': 'placeholder',
      'atribut': 'setAttribute'
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

  PromptJSCompiler.prototype.visitKetikaStatement = function(node) {
    const eventMap = {
      'diklik': 'click',
      'diketik': 'input',
      'disubmit': 'submit',
      'diubah': 'change',
      'ditekan': 'keydown',
      'dilepas': 'keyup',
      'dimuat': 'DOMContentLoaded',
      'difokus': 'focus',
      'diblur': 'blur',
      'ditinggal': 'blur',
      'diarahkan': 'mouseover',
      'ditinggal-kursor': 'mouseout',
      'digulir': 'scroll',
      'diseret': 'dragstart',
      'diubahukuran': 'resize',
      'dipindah': 'drag',
      'dikirim': 'submit',
      'direset': 'reset',
      'dikonteks': 'contextmenu',
      'dilewat': 'paste',
      'masuk': 'mouseenter',
      'keluar': 'mouseleave',
      'aktif': 'focus',
      'nonaktif': 'blur',
      'muat': 'load',
      'salah': 'error',
      'dipasang': '__promptjs_mounted',
      'dilepas-dari-dom': '__promptjs_unmounted'
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
    if (node.event === 'disubmit') this.emit("event.preventDefault();");

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
    this.emit("});");
  };

  PromptJSCompiler.prototype.visitSaatStatement = function(node) {
    this.emit(`__watch(${node.target}, (nilaiBaru, nilaiLama) => {`);
    this.indent++;
    accept(node.body, this);
    this.indent--;
    this.emit("});");
  };

  PromptJSCompiler.prototype.visitLifecycleStatement = function(node) {
    // Lifecycle hooks: dipasang, dilepas, diperbarui
    const lifecycleMap = {
      'dipasang': '__promptjs_mounted',
      'dilepas': '__promptjs_unmounted',
      'diperbarui': '__promptjs_updated'
    };
    const hookName = lifecycleMap[node.kind] || node.kind;

    // Emit as custom event dispatch or callback registration
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

  PromptJSCompiler.prototype.visitSetelahStatement = function(node) {
    // "setelah X selesai" — X adalah nama operasi/fungsi async
    // Lower to: X().then(() => { ... }) atau callback setelah pemanggilan
    const target = node.target;

    // Cek apakah target adalah fungsi yang sudah di-resolve.
    // Jika ya, panggil langsung tanpa typeof check (fungsi lokal selalu ada).
    // Jika tidak, gunakan typeof check untuk keamanan (external/async).
    const isLocalFunction = node.targetSymbol && node.targetSymbol.isFunction;
    const callExpr = isLocalFunction ? `${target}()` : `(typeof ${target} === 'function' ? ${target}() : ${target})`;

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

  PromptJSCompiler.prototype.visitJikaStatement = function(node) {
    const cond = this.lowerExpression(node.condition);
    this.emit(`if (${cond}) {`);
    this.indent++;
    accept(node.consequent, this);
    this.indent--;
    if (node.alternate) {
      this.emit("} else {");
      this.indent++;
      accept(node.alternate, this);
      this.indent--;
    }
    this.emit("}");
  };

  PromptJSCompiler.prototype.visitUlangiStatement = function(node) {
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
      this.emit(`for (let ${node.iteratorName} = ${source}; ${node.iteratorName} <= ${rangeEnd}; ${node.iteratorName}++) {`);
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
      this.emit("});");
    }
  };

  PromptJSCompiler.prototype.visitSelamaStatement = function(node) {
    const cond = this.lowerExpression(node.condition);
    this.emit(`while (${cond}) {`);
    this.indent++;
    accept(node.body, this);
    this.indent--;
    this.emit("}");
  };

  PromptJSCompiler.prototype.visitBerhentiStatement = function(node) {
    this.emit(`break;`);
  };

  PromptJSCompiler.prototype.visitLewatiStatement = function(node) {
    // PromptJS patch: "pass" inside a BuatStatement means "empty element body" — emit nothing.
    // "lewati" inside a loop means "skip this iteration" — emit continue.
    // We use a context flag set by visitBuatStatement.
    if (this._inBuatBody) {
      // pass as empty body marker — nothing to emit
      return;
    }
    this.emit(`continue;`);
  };

  PromptJSCompiler.prototype.visitKembalikanStatement = function(node) {
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
  PromptJSCompiler.prototype._isTargetReactive = function(node) {
    if (node.targetSymbol) {
      return node.targetSymbol.isReactive === true;
    }
    // Fallback: jika tidak ada metadata resolver, anggap reaktif
    // (lebih aman karena __setState bekerja dengan Proxy)
    return true;
  };

  PromptJSCompiler.prototype.visitSimpanStatement = function(node) {
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

  PromptJSCompiler.prototype.visitTambahkanStatement = function(node) {
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

  PromptJSCompiler.prototype.visitKurangiStatement = function(node) {
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

  PromptJSCompiler.prototype.visitSisipkanStatement = function(node) {
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

  PromptJSCompiler.prototype.visitAmbilDomStatement = function(node) {
    // "ambil nilai/teks/html/dll dari sumber -> simpan ke target"
    const source = this.resolveTarget(node.source);
    const targetVar = node.target; // string nama variabel

    const kindMap = {
      'nilai': 'value',
      'teks': 'innerText',
      'html': 'innerHTML',
      'tinggi': 'offsetHeight',
      'lebar': 'offsetWidth',
      'atribut': null  // khusus — pakai getAttribute
    };

    if (node.kind === 'atribut') {
      const attrName = node.attributeName || '';
      this.emit(`__setState(${targetVar}, ${source}.getAttribute("${attrName}"));`);
    } else {
      const jsProp = kindMap[node.kind] || node.kind;
      this.emit(`__setState(${targetVar}, ${source}.${jsProp});`);
    }
  };

  PromptJSCompiler.prototype.visitAmbilLuarStatement = function(node) {
    // "ambil dari URL" → fetch API
    const url = this.lowerExpression(node.url);

    // Build fetch options
    let fetchOptions = '{}';
    if (node.options && node.options.length > 0) {
      const optPairs = node.options.map(opt => {
        const val = this.lowerExpression(opt.value);
        return `"${opt.key}": ${val}`;
      });
      fetchOptions = `{ ${optPairs.join(', ')} }`;
    }

    this.emit(`fetch(${url}, ${fetchOptions})`);
    this.indent++;

    // Process branches (berhasil, gagal, selalu)
    if (node.branches && node.branches.length > 0) {
      node.branches.forEach(branch => {
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

  PromptJSCompiler.prototype.visitGunakanStatement = function(node) {
    // "gunakan NamaKomponen dengan props di target"
    const componentFactory = `__komp_${node.componentName}`;

    // Build props object
    let propsArg = '';
    if (node.props && node.props.length > 0) {
      const propPairs = node.props.map(p => {
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

  PromptJSCompiler.prototype.visitArahkanStatement = function(node) {
    // "arahkan ke URL" → window.location.href
    const url = this.lowerExpression(node.url);
    this.emit(`window.location.href = ${url};`);
  };

  PromptJSCompiler.prototype.visitMuatUlangStatement = function(node) {
    this.emit(`window.location.reload();`);
  };

  PromptJSCompiler.prototype.visitKembaliStatement = function(node) {
    this.emit(`window.history.back();`);
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // VISITOR IMPLEMENTATIONS — INTEROP & RANTAI AKSI
  // ═══════════════════════════════════════════════════════════════════════════════

  PromptJSCompiler.prototype.visitLangsungBlock = function(node) {
    this.emit(node.content);
  };

  PromptJSCompiler.prototype.visitPanggilNativeExpression = function(node) {
    const args = node.arguments.map(a => this.lowerExpression(a)).join(', ');
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

  PromptJSCompiler.prototype.visitJalankanExpression = function(node) {
    // Hanya gunakan node.arguments atau node.withArgs
    const args = (node.arguments || node.withArgs || [])
      .map(a => this.lowerExpression(a));
    const code = `${node.callee}(${args.join(', ')})`;

    // Jika dipakai sebagai statement di dalam blok 'buat' (ada currentParent),
    // emit langsung; jika tidak, kembalikan sebagai ekspresi.
    if (this.currentParent) {
      this.emit(`${code};`);
    } else {
      return code;
    }
  };

  PromptJSCompiler.prototype.visitRantaiAksi = function(node) {
    // RantaiAksi: first statement diikuti chain of actions
    // "aksi1 lalu aksi2 lalu aksi3"
    // Lower: jalankan first, lalu chain secara berurutan

    // Visit the first action
    if (node.first) accept(node.first, this);

    // Visit each chained action
    if (node.chain && node.chain.length > 0) {
      node.chain.forEach(chainedAction => {
        accept(chainedAction, this);
      });
    }
  };

  // ── PromptJS patch: Expression visitors ────────────────────────────────────────
  // These visitors return JS code strings so that expression nodes used as
  // statements (e.g., CallExpression in KetikaStatement.action) get emitted.
  // Without these, BaseVisitor.genericVisit would just traverse children
  // without producing any output.

  PromptJSCompiler.prototype.visitCallExpression = function(node) {
    const code = this.lowerExpression(node);
    if (this.currentParent) {
      this.emit(code + ';');
    }
    return code;
  };

  PromptJSCompiler.prototype.visitIdentifier = function(node) {
    return this.lowerExpression(node);
  };

  PromptJSCompiler.prototype.visitLiteral = function(node) {
    return this.lowerExpression(node);
  };

  PromptJSCompiler.prototype.visitBinaryExpression = function(node) {
    return this.lowerExpression(node);
  };

  PromptJSCompiler.prototype.visitUnaryExpression = function(node) {
    return this.lowerExpression(node);
  };

  PromptJSCompiler.prototype.visitMemberExpression = function(node) {
    return this.lowerExpression(node);
  };

  PromptJSCompiler.prototype.visitObjectLiteral = function(node) {
    return this.lowerExpression(node);
  };

  PromptJSCompiler.prototype.visitArrayLiteral = function(node) {
    return this.lowerExpression(node);
  };

  PromptJSCompiler.prototype.visitJalankanExpression = function(node) {
    const code = this.lowerExpression(node);
    if (this.currentParent) {
      this.emit(code + ';');
    }
    return code;
  };

}

module.exports = { install };
