// @ts-check

/**
 * PromptJS v0.2 — RESOLVER (Merged) / Resolver Terpadu
 * ============================================================================
 *
 * Merges the best of Team A & Team B resolver implementations.
 * Menggabungkan kelebihan implementasi resolver Tim A & Tim B:
 *   - Model SemanticSymbol lengkap (B)
 *   - Scope management, deteksi duplikat & shadowing (B)
 *   - Usage tracking: read/write count, references (B)
 *   - Alias properti Indonesia → JS (A)
 *   - Self-reference "ketika" tanpa target (A)
 *   - Penanganan JS Interop (`jalankan`) agar tidak dianggap undefined (A)
 *   - Kode error & warning terpadu
 *
 * v0.3.1-patch1: Perbaikan bug kritikal
 *   - [C2] Fix node.args → node.arguments di visitJalankanExpression
 *   - [C3] Emit E3001 untuk identifier yang tidak dideklarasikan
 *   - [C4] Emit E3003 untuk penulisan ke variabel tetap (const)
 *   - [H1] E5001 → E3005 untuk error "ketika tanpa target"
 *   - [H2] Standardisasi format objek error (code/message/severity/loc/suggestion)
 *   - [H3] Tambah visitor: visitSelamaStatement, visitPerbaruiStatement,
 *          visitGunakanStatement, visitTambahkanStatement, visitKurangiStatement,
 *          visitSisipkanStatement, visitSetelahStatement, visitTampilkanStatement,
 *          visitSembunyikanStatement, visitHapusStatement, visitKosongkanStatement,
 *          visitArahkanStatement, visitAmbilDomStatement, visitAmbilLuarStatement
 *   - [M2] Write tracking untuk tambahkan/kurangi/sisipkan
 *   - [M4] W3001 di saatStatement → W3003 (kode baru untuk non-reaktif watcher)
 */

const { BaseVisitor, accept } = require('../utils/visitor');
const Err = require('../parser/error-codes');

// ============================================================================
// JS GLOBAL IDENTIFIERS — PromptJS patch
// These identifiers are available in browser/Node and should not trigger E3001.
// ============================================================================
const JS_GLOBALS = new Set([
  // Browser globals
  'window',
  'document',
  'navigator',
  'location',
  'history',
  'screen',
  'localStorage',
  'sessionStorage',
  'console',
  'alert',
  'confirm',
  'prompt',
  'setTimeout',
  'setInterval',
  'clearTimeout',
  'clearInterval',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'FormData',
  'URL',
  'URLSearchParams',
  'MutationObserver',
  'IntersectionObserver',
  'ResizeObserver',
  'Event',
  'CustomEvent',
  'MessageChannel',
  // JS built-in constructors
  'Object',
  'Array',
  'String',
  'Number',
  'Boolean',
  'Symbol',
  'Function',
  'Date',
  'RegExp',
  'Error',
  'TypeError',
  'RangeError',
  'Map',
  'Set',
  'WeakMap',
  'WeakSet',
  'Promise',
  'Proxy',
  'Reflect',
  'JSON',
  'Math',
  'Intl',
  'AbortController',
  'parseInt',
  'parseFloat',
  'isNaN',
  'isFinite',
  'encodeURI',
  'decodeURI',
  'encodeURIComponent',
  'decodeURIComponent',
  'undefined',
  'NaN',
  'Infinity',
  // Node.js globals (for SSR/build)
  'global',
  'process',
  'Buffer',
  'require',
  'module',
  '__dirname',
  '__filename',
]);

// ============================================================================
// ALIAS PROPERTI (dari Tim A)
// ============================================================================
const ALIAS_PROPERTI = {
  panjang: 'length',
  nilai: 'value',
  teks: 'innerText',
  html: 'innerHTML',
  tipe: 'type',
  nama: 'name',
  ditandai: 'checked',
  nonaktif: 'disabled',
  anak: 'children',
  induk: 'parentElement',
  fokus: 'focus',
  atribut: 'getAttribute',
  sumber: 'src',
  tautan: 'href',
  kelas: 'className',
  gaya: 'style',
  placeholder: 'placeholder',
};

// ============================================================================
// ALIAS METHOD — Indonesian method names → JavaScript method names
// Digunakan untuk akses method pada objek (arr.untukSetiap → arr.forEach)
// ============================================================================
const ALIAS_METHOD = {
  untukSetiap: 'forEach',
  untukSetiapItem: 'forEach',
  sisip: 'push',
  sisipAkhir: 'push',
  ambilAkhir: 'pop',
  ambilAwal: 'shift',
  sisipAwal: 'unshift',
  gabung: 'join',
  saring: 'filter',
  pilih: 'map',
  kurangi: 'reduce',
  temukan: 'find',
  temukanIndex: 'findIndex',
  apakahAda: 'includes',
  urutkan: 'sort',
  balik: 'reverse',
  potong: 'slice',
  sambung: 'splice',
  isi: 'fill',
  keTeks: 'toString',
  gabungTeks: 'join',
  setiap: 'every',
  beberapa: 'some',
  indeksDari: 'indexOf',
  indeksTerakhir: 'lastIndexOf',
  datar: 'flat',
  petakanDatar: 'flatMap',
};

// ============================================================================
// FUNGSI BAWAAN (Builtins) — Indonesian function names → JS equivalents
// Digunakan saat nama fungsi dipanggil sebagai CallExpression: panjang(arr)
// Tidak sama dengan ALIAS_PROPERTI yang hanya bekerja di MemberExpression.
// ============================================================================
const BUILTIN_FUNCTIONS = {
  // Array/string utilities
  panjang: { jsName: '__promptjs_panjang', helper: true },
  tipeData: { jsName: 'typeof', helper: false, prefix: true },
  apakahArray: { jsName: 'Array.isArray', helper: false },
  keTeks: { jsName: 'String', helper: false },
  keAngka: { jsName: 'Number', helper: false },
  keTeksAngka: { jsName: 'parseInt', helper: false },
  keAngkaDesimal: { jsName: 'parseFloat', helper: false },
  apakahKosong: { jsName: '__promptjs_apakahKosong', helper: true },
  gabung: { jsName: '__promptjs_gabung', helper: true },
  saring: { jsName: '__promptjs_saring', helper: true },
  pilih: { jsName: '__promptjs_pilih', helper: true },
  urutkan: { jsName: '__promptjs_urutkan', helper: true },
  balik: { jsName: '__promptjs_balik', helper: true },
  temukan: { jsName: '__promptjs_temukan', helper: true },
  apakahAda: { jsName: '__promptjs_apakahAda', helper: true },
};

// ============================================================================
// EVENT NAMES yang valid untuk ketika (dari spesifikasi PromptJS)
// ============================================================================
const VALID_EVENT_NAMES = new Set([
  'diklik',
  'diketik',
  'ditekan',
  'dilepas',
  'dilewat',
  'ditinggal',
  'difokus',
  'diblur',
  'diubah',
  'diseret',
  'diubahukuran',
  'dipindah',
  'dikirim',
  'direset',
  'digulir',
  'dikonteks',
  'masuk',
  'keluar',
  'aktif',
  'nonaktif',
  'muat',
  'salah',
  'disubmit',
  'dimuat',
  'diarahkan',
  'ditinggal-kursor',
  'dipasang',
  'dilepas-dari-dom',
]);

// ============================================================================
// PROPERTI PERBARUI yang valid
// ============================================================================
const VALID_PERBARUI_PROPERTIES = new Set([
  'teks',
  'html',
  'kelas',
  'src',
  'href',
  'nilai',
  'tipe',
  'nama',
  'ditandai',
  'nonaktif',
  'placeholder',
  'gaya',
  'atribut',
]);

// ============================================================================
// SEMANTIC SYMBOL (dari Tim B)
// ============================================================================
/**
 * Constructor SemanticSymbol — representasi simbol dalam symbol table.
 *
 * @constructor
 * @param {string} name - Nama simbol
 * @param {string} kind - Jenis simbol ('data','tetap','ubah','turunan','fungsi','komponen','parameter')
 * @param {Object} node - AST node deklarasi
 * @param {Scope} scope - Scope tempat simbol didefinisikan
 * @param {Object} [metadata] - Metadata tambahan (isReactive, isWritable, id, scopeId, shadowedSymbol)
 * @this {SemanticSymbol}
 */
function SemanticSymbol(name, kind, node, scope, metadata = {}) {
  this.name = name;
  this.kind = kind; // 'data','tetap','ubah','turunan','fungsi','komponen','parameter'
  this.id = metadata.id || null;
  this.declarationNode = node;
  this.scope = scope;
  this.scopeId = metadata.scopeId || null;

  // Properti dari Tim B
  this.isReactive = metadata.isReactive || false;
  this.isWritable = metadata.isWritable || false;
  this.isComputed = kind === 'turunan';
  this.isParameter = kind === 'parameter';
  this.isComponent = kind === 'komponen';
  this.isFunction = kind === 'fungsi';

  // Shadowing (Tim B)
  this.shadowedSymbol = metadata.shadowedSymbol || null;

  // Usage tracking (Tim B)
  this.references = [];
  this.readCount = 0;
  this.writeCount = 0;
}

// ============================================================================
// SCOPE (dari Tim B, sedikit penyesuaian)
// ============================================================================
/**
 * Constructor Scope — representasi satu scope dalam scope chain.
 *
 * @constructor
 * @param {string} type - Jenis scope ('global','blok','komponen','iterasi','watcher')
 * @param {Scope | null} parent - Scope parent (null untuk global scope)
 * @this {Scope}
 */
function Scope(type, parent) {
  this.id = 'scope_' + ++Scope._nextId;
  this.type = type; // 'global','blok','komponen','iterasi','watcher'
  this.parent = parent;
  this.symbols = new Map();
}
Scope._nextId = 0;

/**
 * Definisikan simbol dalam scope ini.
 *
 * @param {string} name - Nama simbol
 * @param {SemanticSymbol} symbol - Objek simbol
 * @returns {void}
 */
Scope.prototype.define = function (name, symbol) {
  this.symbols.set(name, symbol);
};

/**
 * Cari simbol di scope ini atau parent scope (recursive).
 *
 * @param {string} name - Nama simbol yang dicari
 * @returns {SemanticSymbol | null} Simbol jika ditemukan, null jika tidak
 */
Scope.prototype.lookup = function (name) {
  if (this.symbols.has(name)) return this.symbols.get(name);
  if (this.parent) return this.parent.lookup(name);
  return null;
};

// ============================================================================
// RESOLVER ENGINE (utama)
// ============================================================================
/**
 * Constructor PromptJSResolver — resolver berbasis visitor pattern.
 *
 * Inherit dari BaseVisitor. Setiap `visit<NodeType>` method melakukan
 * resolusi referensi, tracking read/write, dan emit error/warning sesuai
 * aturan semantik PromptJS.
 *
 * @constructor
 * @this {PromptJSResolver & { genericVisit: (node: Object) => void, accept: (node: Object, visitor: Object) => any }}
 */
function PromptJSResolver() {
  BaseVisitor.call(this);
  this.errors = [];
  this.warnings = [];
  this.currentScope = null;
  this.buatStack = [];
  this.allSymbols = [];
  this.currentJalankanCallee = null;
  this._symbolIdCounter = 0;
}

PromptJSResolver.prototype = Object.create(BaseVisitor.prototype);
PromptJSResolver.prototype.constructor = PromptJSResolver;

// TypeScript hint: BaseVisitor.call(this) in the constructor inherits
// genericVisit/visit* methods from BaseVisitor.prototype at runtime, but
// TS cannot see this connection. Declare the aliases explicitly so method
// bodies that call `this.genericVisit(node)` type-check cleanly.
/** @type {(node: Object) => void} */
PromptJSResolver.prototype.genericVisit;

// Engine assigns this dynamically; declare so TS is aware.
/** @type {Object | null} */
PromptJSResolver.prototype._frontMatterData;

// ─── Entry Point ───────────────────────────────────────────
/**
 * Entry point resolver — traverse AST, resolve references, build symbol table.
 *
 * Algoritma: inisialisasi global scope, gather global declarations, lalu
 * traverse AST via `accept`. Hasil: AST yang sama (mungkin dimodifikasi
 * dengan metadata), daftar errors, dan daftar warnings.
 *
 * @param {Object} ast - Root AST node (Program)
 * @returns {{ ast: Object, errors: Object[], warnings: Object[] }} Hasil resolusi
 */
PromptJSResolver.prototype.resolve = function (ast) {
  this.errors = [];
  this.warnings = [];
  Scope._nextId = 0;
  this._symbolIdCounter = 0;
  this.currentScope = new Scope('global', null);
  this.allSymbols = [];

  // Pass 1: Hoisting deklarasi global (menggunakan addSymbol untuk deteksi duplikat)
  this.gatherGlobals(ast);

  // Pass 2: Deep resolution
  accept(ast, this);

  // Tempelkan metadata untuk Analyzer (Tim B)
  ast.semantic = {
    symbols: this.allSymbols,
    globalScope: this.currentScope,
  };

  return { ast, errors: this.errors, warnings: this.warnings };
};

// ─── Utility: menambah simbol (dari Tim B) ─────────────────
/**
 * Tambahkan simbol baru ke current scope.
 *
 * Memeriksa duplikasi dalam scope yang sama (E3002), shadowing (W3002),
 * dan tracking ke `allSymbols` untuk usage analysis.
 *
 * @param {string} name - Nama simbol
 * @param {string} kind - Jenis simbol
 * @param {Object} node - AST node deklarasi
 * @param {Object} [metadata] - Metadata tambahan
 * @returns {SemanticSymbol} Simbol yang baru ditambahkan
 */
PromptJSResolver.prototype.addSymbol = function (name, kind, node, metadata = {}) {
  // Deteksi duplikat (E3002 - Tim B)
  const existing = this.currentScope.symbols.get(name);
  if (existing) {
    this.errors.push(
      Err.createError('E3002', node.loc, {
        message: `Simbol "${name}" sudah dideklarasikan dalam scope yang sama.`,
        suggestion: `Deklarasi pertama ada di Baris ${existing.declarationNode.loc.start.line}.`,
      })
    );
    return null;
  }

  // Shadowing (Tim B) → W3002
  const shadowed = this.currentScope.parent ? this.currentScope.parent.lookup(name) : null;

  if (shadowed) {
    this.warnings.push(
      Err.createError('W3002', node.loc, {
        message: `Variabel "${name}" menyembunyikan variabel dengan nama sama di scope luar.`,
        suggestion: 'Gunakan nama yang berbeda untuk menghindari kebingungan.',
        relatedInformation: [
          {
            message: `Deklarasi yang disembunyikan: "${name}" (${shadowed.kind}).`,
            loc:
              shadowed.declarationNode && shadowed.declarationNode.loc
                ? shadowed.declarationNode.loc
                : null,
          },
        ],
      })
    );
  }

  const symbol = new SemanticSymbol(name, kind, node, this.currentScope.type, {
    ...metadata,
    id: 'sym_' + ++this._symbolIdCounter,
    scopeId: this.currentScope.id,
    shadowedSymbol: shadowed,
  });

  this.currentScope.define(name, symbol);
  this.allSymbols.push(symbol);

  // Ikat simbol ke node (untuk akses mudah)
  node.symbol = symbol;
  return symbol;
};

// ─── Global Hoisting (modifikasi dari Tim B) ───────────────
/**
 * Pre-scan top-level AST untuk mengumpulkan deklarasi global.
 *
 * Hoisting: semua deklarasi top-level (Data/Tetap/Ubah/Fungsi/Komponen)
 * ditambahkan ke global scope SEBELUM traverse dimulai, sehingga
 * referensi maju (forward reference) tetap valid.
 *
 * @param {Object} ast - Root AST node
 * @returns {void}
 */
PromptJSResolver.prototype.gatherGlobals = function (ast) {
  if (!ast.body) return;
  ast.body.forEach((node) => {
    if (node.type === 'DataDeclaration')
      this.addSymbol(node.name, 'data', node, { isReactive: true, isWritable: true });
    else if (node.type === 'TetapDeclaration')
      this.addSymbol(node.name, 'tetap', node, { isWritable: false });
    else if (node.type === 'UbahDeclaration')
      this.addSymbol(node.name, 'ubah', node, { isWritable: true });
    else if (node.type === 'TurunanDeclaration')
      this.addSymbol(node.name, 'turunan', node, { isReactive: true, isWritable: false });
    else if (node.type === 'FungsiDeclaration')
      this.addSymbol(node.name, 'fungsi', node, { isWritable: false });
    else if (node.type === 'KomponenDeclaration')
      this.addSymbol(node.name, 'komponen', node, { isWritable: false });
  });
};

// ============================================================================
// VISITOR METHODS
// ============================================================================

// ─── Identifier (gabungan) ─────────────────────────────────
/**
 * Visitor untuk node Identifier — resolusi referensi + tracking read.
 *
 * Jika identifier tidak ditemukan di scope chain dan bukan JS_GLOBALS,
 * emit E3001. Jika ditemukan, increment readCount dan tambahkan ke references.
 *
 * @param {Object} node - AST node Identifier
 * @this {any}
 * @returns {void}
 */
PromptJSResolver.prototype.visitIdentifier = function (node) {
  // Abaikan jika ini adalah nama callee dari "jalankan"
  if (node.isCalleeJS || (this.currentJalankanCallee && node.name === this.currentJalankanCallee)) {
    return;
  }

  // [BUG-3 FIX] Abaikan jika ini adalah nama fungsi bawaan (builtin)
  // Fungsi bawaan seperti panjang(), tipeData(), dll. tidak dideklarasikan
  // dalam scope, tapi tetap valid sebagai callee di CallExpression.
  if (node.isBuiltinCallee && BUILTIN_FUNCTIONS[node.name]) {
    node.resolved = { kind: 'builtin', name: node.name, isReactive: false, isWritable: false };
    return;
  }

  const symbol = this.currentScope.lookup(node.name);
  if (symbol) {
    node.resolved = symbol;
    node.semantic = { symbol };
    symbol.readCount++;
    symbol.references.push(node);
  } else {
    // Jika identifier adalah nama fungsi bawaan, jangan emit E3001
    // (akan ditangani di visitCallExpression sebagai builtin)
    if (BUILTIN_FUNCTIONS[node.name]) {
      node.resolved = { kind: 'builtin', name: node.name, isReactive: false, isWritable: false };
      return;
    }

    // PromptJS patch: Jika identifier adalah JS global, jangan emit E3001
    if (JS_GLOBALS.has(node.name)) {
      node.resolved = { kind: 'global', name: node.name, isReactive: false, isWritable: false };
      return;
    }

    // [C3 FIX] Emit E3001 untuk identifier yang tidak dideklarasikan
    // PromptJS patch: suppress E3001 for $external references (marked by parser)
    if (node._isExternal) {
      node.resolved = { kind: 'external', name: node.name, isReactive: false, isWritable: false };
      return;
    }

    node.isUndefined = true;
    this.errors.push(
      Err.createError('E3001', node.loc, {
        message: `Identifier "${node.name}" tidak dideklarasikan.`,
        suggestion: 'Periksa ejaan identifier atau deklarasikan variabel terlebih dahulu.',
      })
    );
  }
};

// ─── MemberExpression (dari Tim A: alias properti) ─────────
/**
 * Visitor untuk node MemberExpression — akses properti `obj.prop` atau `obj[idx]`.
 *
 * Traverse `object` dan `property`. Untuk external ref `$name.path`, tandai
 * sebagai JS external agar tidak dianggap undefined.
 *
 * @param {Object} node - AST node MemberExpression
 * @this {any}
 * @returns {void}
 */
PromptJSResolver.prototype.visitMemberExpression = function (node) {
  // Visit object (kiri)
  accept(node.object, this);

  // Resolusi alias properti dan method (Tim A + fix BUG-5)
  if (node.property.type === 'Identifier') {
    const propName = node.property.name;

    // Khusus .indeks dalam scope iterasi (virtual)
    if (propName === 'indeks') {
      node.property.isVirtual = true;
    }

    // Cek alias properti terlebih dahulu
    if (ALIAS_PROPERTI[propName]) {
      node.property.originalName = propName;
      node.property.name = ALIAS_PROPERTI[propName];
      node.isTranslatedAlias = true;
    }
    // Cek alias method (untukSetiap → forEach, sisip → push, dll)
    else if (ALIAS_METHOD[propName]) {
      node.property.originalName = propName;
      node.property.name = ALIAS_METHOD[propName];
      node.isTranslatedMethodAlias = true;
      // Tandai jika method ini bermutasi array (perlu trigger reaktivitas)
      const MUTATING_METHODS = new Set([
        'push',
        'pop',
        'shift',
        'unshift',
        'splice',
        'sort',
        'reverse',
        'fill',
      ]);
      node.isMutatingMethod = MUTATING_METHODS.has(ALIAS_METHOD[propName]);
    }
  }
};

/**
 * Visitor untuk node CallExpression — pemanggilan fungsi `callee(args)`.
 *
 * Traverse `callee` dan semua `arguments`. Cek apakah callee adalah
 * BUILTIN_FUNCTIONS atau fungsi yang dideklarasikan.
 *
 * @param {Object} node - AST node CallExpression
 * @this {any}
 * @returns {void}
 */
PromptJSResolver.prototype.visitCallExpression = function (node) {
  // Visit callee
  accept(node.callee, this);

  // Visit arguments
  if (node.arguments && node.arguments.length > 0) {
    node.arguments.forEach((arg) => accept(arg, this));
  }

  // Cek apakah callee adalah Identifier yang cocok dengan fungsi bawaan
  if (node.callee && node.callee.type === 'Identifier') {
    const calleeName = node.callee.name;
    if (BUILTIN_FUNCTIONS[calleeName]) {
      const builtin = BUILTIN_FUNCTIONS[calleeName];
      node.isBuiltin = true;
      node.builtinInfo = builtin;
      node.callee.originalName = calleeName;

      // Jika builtin adalah prefix operator (seperti typeof), tandai khusus
      if (builtin.prefix) {
        node.isPrefixBuiltin = true;
      }

      // Jika builtin memerlukan runtime helper, tandai untuk compiler
      if (builtin.helper) {
        node.needsRuntimeHelper = true;
      }
    }
  }

  // Cek jika callee adalah MemberExpression dengan method alias yang bermutasi
  if (node.callee && node.callee.type === 'MemberExpression' && node.callee.isMutatingMethod) {
    node.isMutatingMethodCall = true;
    node.mutatingMethodName = node.callee.property.name; // already translated
  }
};

// ─── JalankanExpression (Tim A: JS Interop) ───────────────
/**
 * Visitor untuk node JalankanExpression — JS interop via `Jalankan name(args)`.
 *
 * Tandai callee sebagai JS external (bukan undefined), lalu traverse args.
 *
 * @param {Object} node - AST node JalankanExpression
 * @this {any}
 * @returns {void}
 */
PromptJSResolver.prototype.visitJalankanExpression = function (node) {
  // Simpan nama fungsi yang dipanggil (callee)
  const prevCallee = this.currentJalankanCallee;
  this.currentJalankanCallee = node.callee; // node.callee adalah string

  // [C2 FIX] node.args → node.arguments (sesuai AST factory)
  if (node.arguments && node.arguments.length > 0) {
    node.arguments.forEach((arg) => accept(arg, this));
  }
  if (node.withArgs && node.withArgs.length > 0) {
    node.withArgs.forEach((arg) => accept(arg, this));
  }

  // Kembalikan ke nilai sebelumnya (null jika tidak ada nested jalankan)
  this.currentJalankanCallee = prevCallee;
};

/**
 * Tandai node sebagai referensi JS external (bukan PromptJS symbol).
 *
 * @param {Object} node - AST node yang akan ditandai
 * @this {any}
 * @returns {void}
 */
PromptJSResolver.prototype.markAsJSExternal = function (node) {
  if (node.type === 'Identifier') {
    node.isCalleeJS = true;
  } else if (node.type === 'MemberExpression') {
    this.markAsJSExternal(node.object);
  }
};

// ─── Write-Tracking Helper ────────────────────────────────
/**
 * Melacak penulisan ke variabel dan memvalidasi isWritable.
 * Digunakan oleh simpan, tambahkan, kurangi, sisipkan, perbarui.
 */
/**
 * Track write ke simbol — increment writeCount dan tambahkan ke references.
 *
 * @param {string} targetName - Nama simbol target
 * @param {Object} node - AST node write
 * @this {any}
 * @returns {void}
 */
PromptJSResolver.prototype._trackWrite = function (targetName, node) {
  if (!targetName) return;
  const symbol = this.currentScope.lookup(targetName);
  if (symbol) {
    symbol.writeCount++;
    node.targetSymbol = symbol; // untuk Analyzer (proteksi read-only)

    // [C4 FIX] Emit E3003 jika menulis ke variabel tetap (const)
    if (!symbol.isWritable) {
      this.errors.push(
        Err.createError('E3003', node.loc, {
          message: `Variabel tetap "${targetName}" tidak dapat diubah setelah inisialisasi.`,
          suggestion: 'Gunakan "ubah" jika variabel perlu diubah, bukan "tetap".',
        })
      );
    }
  }
};

// ─── SimpanStatement (Tim B: write tracking) ──────────────
/**
 * Visitor untuk SimpanStatement — track write ke target. Emit E3003 bila
 * menulis ke simbol `tetap` (const).
 *
 * @param {Object} node - AST node SimpanStatement
 * @this {any}
 * @returns {void}
 */
PromptJSResolver.prototype.visitSimpanStatement = function (node) {
  // Catat penulisan jika target berupa identifier (node.target adalah string nama)
  if (typeof node.target === 'string') {
    this._trackWrite(node.target, node);
  } else if (node.target && node.target.type === 'Identifier') {
    this._trackWrite(node.target.name, node);
  }
  this.genericVisit(node);
};

// ─── Mutation Statements: Write Tracking (M2 FIX) ─────────
/**
 * Visitor untuk TambahkanStatement — track write ke target array.
 *
 * @param {Object} node - AST node TambahkanStatement
 * @this {any}
 * @returns {void}
 */
PromptJSResolver.prototype.visitTambahkanStatement = function (node) {
  if (typeof node.target === 'string') {
    this._trackWrite(node.target, node);
  } else if (node.target && node.target.type === 'Identifier') {
    this._trackWrite(node.target.name, node);
  }
  this.genericVisit(node);
};

/**
 * Visitor untuk KurangiStatement — track write ke target.
 *
 * @param {Object} node - AST node KurangiStatement
 * @this {any}
 * @returns {void}
 */
PromptJSResolver.prototype.visitKurangiStatement = function (node) {
  if (typeof node.target === 'string') {
    this._trackWrite(node.target, node);
  } else if (node.target && node.target.type === 'Identifier') {
    this._trackWrite(node.target.name, node);
  }
  this.genericVisit(node);
};

/**
 * Visitor untuk SisipkanStatement — track write ke target.
 *
 * @param {Object} node - AST node SisipkanStatement
 * @this {any}
 * @returns {void}
 */
PromptJSResolver.prototype.visitSisipkanStatement = function (node) {
  if (typeof node.target === 'string') {
    this._trackWrite(node.target, node);
  } else if (node.target && node.target.type === 'Identifier') {
    this._trackWrite(node.target.name, node);
  }
  this.genericVisit(node);
};

// ─── PerbaruiStatement (H3 FIX: visitor baru) ──────────────
/**
 * Visitor untuk PerbaruiStatement — update properti elemen DOM.
 *
 * Cek `property` ada di VALID_PERBARUI_PROPERTIES, traverse target dan value.
 *
 * @param {Object} node - AST node PerbaruiStatement
 * @this {any}
 * @returns {void}
 */
PromptJSResolver.prototype.visitPerbaruiStatement = function (node) {
  // Resolve target jika berupa identifier
  if (node.target) {
    if (typeof node.target === 'string') {
      this._trackWrite(node.target, node);
    } else {
      accept(node.target, this);
      // Jika target adalah identifier, lacak penulisan
      if (node.target.type === 'Identifier' && node.target.name) {
        this._trackWrite(node.target.name, node);
      }
    }
  }

  // Resolve value expression
  if (node.value) accept(node.value, this);

  // Validasi properti perbarui
  if (node.property && typeof node.property === 'string') {
    if (!VALID_PERBARUI_PROPERTIES.has(node.property)) {
      this.warnings.push(
        Err.createError('E4008', node.loc, {
          message: `Properti perbarui "${node.property}" mungkin tidak didukung.`,
          suggestion: 'Gunakan properti yang didukung: teks, html, kelas, src, href, nilai, dll.',
        })
      );
    }
  }
};

// ─── GunakanStatement (H3 FIX: visitor baru) ───────────────
/**
 * Visitor untuk GunakanStatement — instansiasi komponen.
 *
 * Cek apakah `componentName` ada di symbol table (E3004 jika tidak ditemukan),
 * lalu traverse props.
 *
 * @param {Object} node - AST node GunakanStatement
 * @this {any}
 * @returns {void}
 */
PromptJSResolver.prototype.visitGunakanStatement = function (node) {
  // Validasi bahwa nama komponen terdaftar
  if (node.componentName) {
    const symbol = this.currentScope.lookup(node.componentName);
    if (!symbol) {
      // [E3004] Komponen tidak dideklarasikan
      this.errors.push(
        Err.createError('E3004', node.loc, {
          message: `Komponen "${node.componentName}" digunakan sebelum dideklarasi.`,
          suggestion: 'Pindahkan deklarasi komponen sebelum penggunaannya.',
        })
      );
    } else if (symbol.kind !== 'komponen') {
      // [E4010] gunakan untuk non-komponen
      this.errors.push(
        Err.createError('E4010', node.loc, {
          message: `"${node.componentName}" bukan komponen, tidak dapat digunakan dengan "gunakan".`,
          suggestion: 'Pastikan nama yang direferensikan adalah komponen (PascalCase).',
        })
      );
    }
  }

  // Resolve props jika ada
  if (node.props) {
    node.props.forEach((prop) => {
      if (prop.value) accept(prop.value, this);
    });
  }

  this.genericVisit(node);
};

// ─── TampilkanStatement (H3 FIX) ───────────────────────────
/**
 * Visitor untuk TampilkanStatement — traverse target dan mountTarget.
 *
 * @param {Object} node - AST node TampilkanStatement
 * @this {any}
 * @returns {void}
 */
PromptJSResolver.prototype.visitTampilkanStatement = function (node) {
  if (node.target) accept(node.target, this);
  this.genericVisit(node);
};

// ─── SembunyikanStatement (H3 FIX) ─────────────────────────
/**
 * Visitor untuk SembunyikanStatement — traverse target.
 *
 * @param {Object} node - AST node SembunyikanStatement
 * @this {any}
 * @returns {void}
 */
PromptJSResolver.prototype.visitSembunyikanStatement = function (node) {
  if (node.target) accept(node.target, this);
  this.genericVisit(node);
};

// ─── HapusStatement (H3 FIX) ───────────────────────────────
/**
 * Visitor untuk HapusStatement — traverse target.
 *
 * @param {Object} node - AST node HapusStatement
 * @this {any}
 * @returns {void}
 */
PromptJSResolver.prototype.visitHapusStatement = function (node) {
  if (node.target) accept(node.target, this);
  this.genericVisit(node);
};

/**
 * Visitor untuk HapusDariStatement — traverse item dan fromArray.
 *
 * @param {Object} node - AST node HapusDariStatement
 * @this {any}
 * @returns {void}
 */
PromptJSResolver.prototype.visitHapusDariStatement = function (node) {
  // Resolve the item expression
  if (node.item) accept(node.item, this);
  // Resolve the array identifier and attach metadata
  const symbol = this.currentScope.lookup(node.fromArray);
  if (symbol) {
    node.fromArraySymbol = symbol;
    node.fromArrayReactive = symbol.kind === 'data' || symbol.kind === 'turunan';
  } else {
    this.addError('E3001', 'Identifier "' + node.fromArray + '" tidak dideklarasikan', node.loc);
  }
};

// ─── KosongkanStatement (H3 FIX) ───────────────────────────
/**
 * Visitor untuk KosongkanStatement — traverse target.
 *
 * @param {Object} node - AST node KosongkanStatement
 * @this {any}
 * @returns {void}
 */
PromptJSResolver.prototype.visitKosongkanStatement = function (node) {
  if (node.target) accept(node.target, this);
  this.genericVisit(node);
};

// ─── ArahkanStatement (H3 FIX) ─────────────────────────────
/**
 * Visitor untuk ArahkanStatement — traverse url.
 *
 * @param {Object} node - AST node ArahkanStatement
 * @this {any}
 * @returns {void}
 */
PromptJSResolver.prototype.visitArahkanStatement = function (node) {
  if (node.url) accept(node.url, this);
  this.genericVisit(node);
};

// ─── SetelahStatement (H3 FIX + Bug 3 FIX) ─────────────────
/**
 * Visitor untuk SetelahStatement — traverse target, body, dan action.
 *
 * @param {Object} node - AST node SetelahStatement
 * @this {any}
 * @returns {void}
 */
PromptJSResolver.prototype.visitSetelahStatement = function (node) {
  // [Bug 3 FIX] Resolve target symbol dan lampirkan ke node,
  // supaya compiler bisa membedakan fungsi PromptJS vs external variable.
  if (node.target) {
    const symbol = this.currentScope.lookup(node.target);
    if (symbol) {
      node.targetSymbol = symbol;
    }
  }
  this.genericVisit(node);
};

// ─── AmbilDomStatement (H3 FIX) ────────────────────────────
/**
 * Visitor untuk AmbilDomStatement — traverse source DOM.
 *
 * @param {Object} node - AST node AmbilDomStatement
 * @this {any}
 * @returns {void}
 */
PromptJSResolver.prototype.visitAmbilDomStatement = function (node) {
  if (node.source) accept(node.source, this);
  this.genericVisit(node);
};

// ─── AmbilLuarStatement (H3 FIX) ───────────────────────────
/**
 * Visitor untuk AmbilLuarStatement — traverse url, branches, dan options.
 *
 * @param {Object} node - AST node AmbilLuarStatement
 * @this {any}
 * @returns {void}
 */
PromptJSResolver.prototype.visitAmbilLuarStatement = function (node) {
  if (node.url) accept(node.url, this);

  // Buat scope untuk callback
  const prevScope = this.currentScope;
  this.currentScope = new Scope('blok', prevScope);

  if (node.saveTarget) {
    this.addSymbol(node.saveTarget, 'ubah', node, { isWritable: true });
  }

  this.genericVisit(node);
  this.currentScope = prevScope;
};

// ─── SelamaStatement (H3 FIX: scope untuk loop body) ───────
/**
 * Visitor untuk SelamaStatement — traverse condition dan body.
 *
 * @param {Object} node - AST node SelamaStatement
 * @this {any}
 * @returns {void}
 */
PromptJSResolver.prototype.visitSelamaStatement = function (node) {
  // Resolve kondisi di scope sekarang
  if (node.condition) accept(node.condition, this);

  const prevScope = this.currentScope;
  this.currentScope = new Scope('blok', prevScope);
  if (node.body) accept(node.body, this);
  this.currentScope = prevScope;
};

// ─── Scope: Blok, Fungsi, Komponen, Ulangi (Tim B, disempurnakan) ──
/**
 * Visitor untuk BlockStatement — push scope blok, traverse body, pop scope.
 *
 * @param {Object} node - AST node BlockStatement
 * @this {any}
 * @returns {void}
 */
PromptJSResolver.prototype.visitBlockStatement = function (node) {
  const prevScope = this.currentScope;
  this.currentScope = new Scope('blok', prevScope);
  this.genericVisit(node);
  this.currentScope = prevScope;
};

/**
 * Visitor untuk FungsiDeclaration — push scope fungsi, tambahkan params sebagai
 * simbol lokal, traverse body, pop scope.
 *
 * @param {Object} node - AST node FungsiDeclaration
 * @this {any}
 * @returns {void}
 */
PromptJSResolver.prototype.visitFungsiDeclaration = function (node) {
  const prevScope = this.currentScope;
  this.currentScope = new Scope('blok', prevScope);

  if (node.params) {
    node.params.forEach((p) =>
      this.addSymbol(p.name, 'parameter', p, { isReactive: false, isWritable: true })
    );
  }

  this.genericVisit(node);
  this.currentScope = prevScope;
};

/**
 * Visitor untuk KomponenDeclaration — push scope komponen, tambahkan params,
 * traverse body, pop scope.
 *
 * @param {Object} node - AST node KomponenDeclaration
 * @this {any}
 * @returns {void}
 */
PromptJSResolver.prototype.visitKomponenDeclaration = function (node) {
  const prevScope = this.currentScope;
  this.currentScope = new Scope('komponen', prevScope);

  if (node.params) {
    node.params.forEach((p) =>
      this.addSymbol(p.name, 'parameter', p, { isReactive: true, isWritable: true })
    );
  }

  // Komponen juga berperan sebagai elemen untuk self-reference "ketika"
  this.buatStack.push(node);
  this.genericVisit(node);
  this.buatStack.pop();

  this.currentScope = prevScope;
};

/**
 * Visitor untuk UlangiStatement — push scope iterasi, tambahkan iterator sebagai
 * simbol lokal, traverse source dan body, pop scope.
 *
 * @param {Object} node - AST node UlangiStatement
 * @this {any}
 * @returns {void}
 */
PromptJSResolver.prototype.visitUlangiStatement = function (node) {
  // Resolve source di scope sekarang (Tim B sudah benar)
  accept(node.source, this);

  const prevScope = this.currentScope;
  this.currentScope = new Scope('iterasi', prevScope);

  if (node.iteratorName) {
    this.addSymbol(node.iteratorName, 'ubah', node, { isWritable: false });
  }

  accept(node.body, this);
  this.currentScope = prevScope;
};

// ─── BuatStatement (Tim A: untuk self-reference "ketika") ──
/**
 * Visitor untuk BuatStatement — push ke `buatStack` (untuk resolusi `ketika`
 * tanpa target), traverse selector/properties/body/action, pop dari stack.
 *
 * @param {Object} node - AST node BuatStatement
 * @this {any}
 * @returns {void}
 */
PromptJSResolver.prototype.visitBuatStatement = function (node) {
  this.buatStack.push(node);
  this.genericVisit(node);
  this.buatStack.pop();
};

// ─── KetikaStatement (Tim A: self-reference) ──────────────
/**
 * Visitor untuk KetikaStatement — event handler.
 *
 * Jika tanpa target dan tidak dalam blok Buat/Komponen, emit E3005.
 * Jika dengan target, traverse target. Traverse body dan action.
 *
 * @param {Object} node - AST node KetikaStatement
 * @this {any}
 * @returns {void}
 */
PromptJSResolver.prototype.visitKetikaStatement = function (node) {
  // Tangani target kosong (self-reference)
  if (!node.target) {
    if (this.buatStack.length > 0) {
      const parentNode = this.buatStack[this.buatStack.length - 1];
      node.target = {
        type: 'SelfReference',
        referencedNode: parentNode,
        loc: node.loc,
      };
    } else {
      // [H1 FIX] E5001 → E3005 (kode error resolver, bukan compiler)
      this.errors.push(
        Err.createError('E3005', node.loc, {
          message:
            'Event listener "ketika" tanpa target hanya boleh di dalam blok "buat" atau "komponen".',
          suggestion:
            'Tambahkan target pada "ketika" atau letakkan di dalam blok "buat"/"komponen".',
        })
      );
    }
  } else {
    accept(node.target, this);
  }

  // Validasi event name jika tersedia
  if (node.event && typeof node.event === 'string' && !VALID_EVENT_NAMES.has(node.event)) {
    this.warnings.push(
      Err.createError('E4009', node.loc, {
        message: `Event name "${node.event}" mungkin tidak dikenali.`,
        suggestion: 'Gunakan nama event yang valid: diklik, diketik, ditekan, dll.',
      })
    );
  }

  // Watcher-like scope (Tim A)
  const prevScope = this.currentScope;
  this.currentScope = new Scope('watcher', prevScope);
  if (node.body) accept(node.body, this);
  if (node.action) accept(node.action, this);
  this.currentScope = prevScope;
};

// ─── SaatStatement (Tim B, dilengkapi) ────────────────────
/**
 * Visitor untuk SaatStatement — reactive watcher.
 *
 * Cek apakah target adalah data reaktif; jika tidak, emit W3003.
 *
 * @param {Object} node - AST node SaatStatement
 * @this {any}
 * @returns {void}
 */
PromptJSResolver.prototype.visitSaatStatement = function (node) {
  // Resolve target reaktif.
  // `node.target` bisa berupa:
  //   - String (legacy API, langsung nama variabel)
  //   - Identifier node (`{ type: 'Identifier', name: 'hitung' }`)
  //   - MemberExpression node (`{ type: 'MemberExpression', object: ..., property: ... }`)
  //     untuk `nama.berubah` — kita ambil nama root object untuk lookup.
  let targetName;
  if (typeof node.target === 'string') {
    targetName = node.target;
  } else if (node.target && node.target.type === 'Identifier') {
    targetName = node.target.name;
  } else if (node.target && node.target.type === 'MemberExpression') {
    // `nama.berubah` → ambil `nama` sebagai root
    let root = node.target;
    while (root.type === 'MemberExpression') {
      root = root.object;
    }
    targetName = root.name;
  } else {
    targetName = String(node.target);
  }

  const binding = this.currentScope.lookup(targetName);
  if (!binding) {
    // Emit E3001 untuk watcher target yang tidak dideklarasikan
    node.isUndefined = true;
    this.errors.push(
      Err.createError('E3001', node.loc, {
        message: `Identifier "${targetName}" tidak dideklarasikan.`,
        suggestion: 'Periksa ejaan identifier atau deklarasikan variabel terlebih dahulu.',
      })
    );
  } else if (!binding.isReactive) {
    // [M4 FIX] W3001 → W3003 (kode baru khusus: watcher target non-reaktif)
    this.warnings.push(
      Err.createError('W3003', node.loc, {
        message: `Variabel "${targetName}" bukan data reaktif. Watcher mungkin tidak akan pernah terpicu.`,
        suggestion: 'Gunakan "data" (var) reaktif sebagai target watcher.',
      })
    );
  }

  const prevScope = this.currentScope;
  this.currentScope = new Scope('watcher', prevScope);
  this.genericVisit(node);
  this.currentScope = prevScope;
};

// ─── Deklarasi Lokal (Tim B, pengecekan agar tidak duplikasi global) ──
/**
 * Visitor untuk DataDeclaration — tambahkan simbol data (isReactive, isWritable).
 *
 * @param {Object} node - AST node DataDeclaration
 * @this {any}
 * @returns {void}
 */
PromptJSResolver.prototype.visitDataDeclaration = function (node) {
  if (!this.currentScope.symbols.has(node.name)) {
    this.addSymbol(node.name, 'data', node, { isReactive: true, isWritable: true });
  }
  this.genericVisit(node);
};

/**
 * Visitor untuk TetapDeclaration — tambahkan simbol tetap (isWritable = false).
 *
 * @param {Object} node - AST node TetapDeclaration
 * @this {any}
 * @returns {void}
 */
PromptJSResolver.prototype.visitTetapDeclaration = function (node) {
  if (!this.currentScope.symbols.has(node.name)) {
    // PromptJS patch: external data from front-matter
    const isExternal = node._isExternal || false;
    this.addSymbol(node.name, 'tetap', node, { isWritable: false, isExternal: isExternal });
  }
  // [W4003] Warning: tetap tanpa nilai awal
  // PromptJS patch: suppress for external data (value loaded at build/runtime time)
  if (!node.init && !node._isExternal) {
    this.warnings.push(
      Err.createError('W4003', node.loc, {
        message: `Deklarasi "tetap" untuk "${node.name}" tanpa nilai awal.`,
        suggestion: 'Berikan nilai awal untuk konstanta.',
      })
    );
  }
  this.genericVisit(node);
};

/**
 * Visitor untuk UbahDeclaration — tambahkan simbol ubah (isWritable = true).
 *
 * @param {Object} node - AST node UbahDeclaration
 * @this {any}
 * @returns {void}
 */
PromptJSResolver.prototype.visitUbahDeclaration = function (node) {
  if (!this.currentScope.symbols.has(node.name)) {
    this.addSymbol(node.name, 'ubah', node, { isWritable: true });
  }
  this.genericVisit(node);
};

/**
 * Visitor untuk TurunanDeclaration — tambahkan simbol turunan (isComputed, isWritable = false).
 *
 * @param {Object} node - AST node TurunanDeclaration
 * @this {any}
 * @returns {void}
 */
PromptJSResolver.prototype.visitTurunanDeclaration = function (node) {
  if (!this.currentScope.symbols.has(node.name)) {
    this.addSymbol(node.name, 'turunan', node, { isReactive: true, isWritable: false });
  }
  this.genericVisit(node);
};

// ─── Error Helper ──────────────────────────────────────────
// ─── TextNode (PromptJS patch: pass-through) ───────────────────────────────
/**
 * Visitor untuk TextNode — no-op (tidak ada simbol yang perlu diresolve).
 *
 * @param {Object} _node - AST node TextNode (unused)
 * @this {any}
 * @returns {void}
 */
PromptJSResolver.prototype.visitTextNode = function (_node) {
  // TextNode has no identifiers to resolve — it's a pure text value.
  // Just traverse in case there are embedded expressions in the future.
};

/**
 * Tambahkan error ke daftar `this.errors`.
 *
 * @param {string} code - Kode error
 * @param {string} message - Pesan error
 * @param {Object} loc - Source location
 * @param {string} [suggestion] - Saran perbaikan (opsional)
 * @this {any}
 * @returns {void}
 */
PromptJSResolver.prototype.addError = function (code, message, loc, suggestion) {
  this.errors.push(
    Err.createError(code, loc, {
      message: message,
      suggestion: suggestion || '',
    })
  );
};

/**
 * Tambahkan warning ke daftar `this.warnings`.
 *
 * @param {string} code - Kode warning
 * @param {string} message - Pesan warning
 * @param {Object} loc - Source location
 * @param {string} [suggestion] - Saran perbaikan (opsional)
 * @this {any}
 * @returns {void}
 */
PromptJSResolver.prototype.addWarning = function (code, message, loc, suggestion) {
  this.warnings.push(
    Err.createError(code, loc, {
      message: message,
      suggestion: suggestion || '',
    })
  );
};

module.exports = PromptJSResolver;
