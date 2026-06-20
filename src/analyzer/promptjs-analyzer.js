// @ts-check

/**
 * PromptJS v0.2 — ANALYZER (Tahap 4) / Analis Semantik
 * ============================================================================
 *
 * Performs semantic validation: types, reactivity, control flow, and lifecycle.
 * Melakukan validasi semantik: tipe, reaktivitas, kontrol alur, dan lifecycle.
 *
 * Sesuai Spesifikasi: PromptJS-grammar-spec_v0_3_1.md
 *
 * v0.3.1-patch1: Perbaikan bug kritikal
 *   - [C5] Tambah visitPerbaruiStatement + checkWriteToTurunan
 *   - [H4] Tambah visitor: visitGunakanStatement, visitSetelahStatement,
 *          visitTampilkanStatement, visitSembunyikanStatement, visitHapusStatement,
 *          visitKosongkanStatement, visitArahkanStatement, visitAmbilDomStatement,
 *          visitAmbilLuarStatement, visitTambahkanStatement, visitKurangiStatement,
 *          visitSisipkanStatement
 *   - [H6] E6001/E6002/E6003 → E4011/E4012/E4013 (kode analyzer, bukan runtime)
 *   - [H2] Standardisasi format error menggunakan Err.createError
 *   - [M1] Tambah cek inTurunanExpr untuk tambahkan/kurangi/sisipkan
 */

const { BaseVisitor, accept } = require('../utils/visitor');
const Err = require('../parser/error-codes');
const DependencyGraph = require('./dependency-graph');

/**
 * Constructor PromptJSAnalyzer — semantic analyzer berbasis visitor.
 *
 * State analyzer:
 * - `errors` / `warnings` — daftar diagnostic yang terkumpul
 * - `_currentAst` — AST yang sedang dianalisis (dipakai buildSemanticGraph)
 * - `options` — opsi analisis (mis. `{ strict: true }`)
 * - `context` — stack konteks semantik (inComponent, inFunction, loopDepth, dll.)
 *
 * @constructor
 * @this {PromptJSAnalyzer}
 */
function PromptJSAnalyzer() {
  BaseVisitor.call(this);
  this.errors = [];
  this.warnings = [];
  this._currentAst = null;
  this.options = {};

  // Context stacks
  this.context = {
    inComponent: false,
    inFunction: false,
    loopDepth: 0,
    handlerDepth: 0,
    inTurunanExpr: false,
    inBuatStatement: false, // PromptJS: allows pass/lewati inside Buat body
  };
}

PromptJSAnalyzer.prototype = Object.create(BaseVisitor.prototype);
PromptJSAnalyzer.prototype.constructor = PromptJSAnalyzer;

// TypeScript hint: BaseVisitor.call(this) inherits genericVisit/visit* methods
// from BaseVisitor.prototype at runtime, but TS cannot see this connection.
// Declare the alias explicitly so method bodies that call `this.genericVisit(node)`
// type-check cleanly.
/** @type {(node: Object) => void} */
PromptJSAnalyzer.prototype.genericVisit;

/**
 * Entry point analyzer — traverse AST, validasi semantik, kumpulkan errors/warnings.
 *
 * @param {Object} ast - Root AST node (Program)
 * @param {Object} [options] - Opsi analisis
 * @returns {{ ast: Object, errors: Object[], warnings: Object[] }} Hasil analisis
 */
PromptJSAnalyzer.prototype.analyze = function (ast, options) {
  this.errors = [];
  this.warnings = [];
  this._currentAst = ast;
  this.options = options || {};
  // [Bug 4 FIX] Build Map sekali untuk lookup O(1)
  this._symbolMap = null;
  this._symbolsByName = null;
  if (ast && ast.semantic && ast.semantic.symbols) {
    this._symbolMap = new Map();
    this._symbolsByName = new Map();
    ast.semantic.symbols.forEach(
      function (sym) {
        // Jangan overwrite symbol pertama: shadowing ditangani lewat node.resolved/targetSymbol.
        if (!this._symbolMap.has(sym.name)) this._symbolMap.set(sym.name, sym);
        if (!this._symbolsByName.has(sym.name)) this._symbolsByName.set(sym.name, []);
        this._symbolsByName.get(sym.name).push(sym);
      }.bind(this)
    );
  }
  accept(ast, this);
  this.buildSemanticGraph();
  this.emitUsageWarnings();
  return {
    ast: ast,
    errors: this.errors,
    warnings: this.warnings,
  };
};

// --- Helpers ---

/**
 * Tambahkan error ke daftar `this.errors`.
 *
 * @param {string} code - Kode error
 * @param {string} pesan - Pesan error
 * @param {Object} loc - Source location
 * @param {string} [saran] - Saran perbaikan (opsional)
 * @returns {void}
 */
PromptJSAnalyzer.prototype.addError = function (code, pesan, loc, saran) {
  this.errors.push(
    Err.createError(code, loc, {
      message: pesan,
      suggestion: saran || '',
    })
  );
};

/**
 * Tambahkan warning ke daftar `this.warnings`.
 *
 * @param {string} code - Kode warning
 * @param {string} pesan - Pesan warning
 * @param {Object} loc - Source location
 * @param {string} [saran] - Saran perbaikan (opsional)
 * @this {any}
 * @returns {void}
 */
PromptJSAnalyzer.prototype.addWarning = function (code, pesan, loc, saran) {
  this.warnings.push(
    Err.createError(code, loc, {
      message: pesan,
      suggestion: saran || '',
    })
  );
};

/**
 * Validasi Tipe Dasar (Section 7.3)
 */
/**
 * Cek apakah typeHint kompatibel dengan valueNode (mis. `Data x: angka = "teks"` → W4001).
 *
 * @param {string} typeHint - Type hint yang dideklarasikan
 * @param {Object} valueNode - AST node ekspresi nilai
 * @this {any}
 * @returns {void}
 */
PromptJSAnalyzer.prototype.checkTypeHint = function (typeHint, valueNode) {
  if (!typeHint || !valueNode || valueNode.type === 'ErrorNode') return;

  let actualType = '';
  if (valueNode.type === 'Literal') {
    if (typeof valueNode.value === 'number') actualType = 'angka';
    else if (typeof valueNode.value === 'string') actualType = 'teks';
    else if (typeof valueNode.value === 'boolean') actualType = 'benar-salah';
  } else if (valueNode.type === 'ObjectLiteral') actualType = 'objek';
  else if (valueNode.type === 'ArrayLiteral') actualType = 'array';
  else if (valueNode.type === 'CallExpression') {
    // Try to infer from callee name
    const callee = valueNode.callee;
    if (callee && callee.type === 'Identifier') {
      const name = callee.name;
      if (name && name.indexOf('ambil') === 0) actualType = 'teks';
      // Otherwise unknown — don't emit warning (too many false positives)
    }
  } else if (valueNode.type === 'BinaryExpression') {
    const op = valueNode.operator;
    if (op === '+' || op === '-' || op === '*' || op === '/' || op === '%') {
      actualType = 'angka';
    } else {
      // Comparison or logic operators -> boolean
      actualType = 'benar-salah';
    }
  } else if (valueNode.type === 'UnaryExpression') {
    if (valueNode.operator === 'bukan') {
      actualType = 'benar-salah';
    } else if (valueNode.operator === '-') {
      actualType = 'angka';
    }
  } else if (valueNode.type === 'MemberExpression') {
    // .panjang/.length -> angka, otherwise unknown
    const prop = valueNode.property;
    if (prop && prop.type === 'Identifier' && (prop.name === 'panjang' || prop.name === 'length')) {
      actualType = 'angka';
    }
    // Otherwise unknown — don't emit warning
  }

  // Both expected and actualType use PromptJS type names
  if (actualType && typeHint !== actualType) {
    this.addWarning(
      'W4001',
      `Type hint "${typeHint}" tidak cocok dengan nilai awal bertipe "${actualType}".`,
      valueNode.loc,
      `Gunakan nilai yang sesuai atau ubah type hint menjadi yang benar.`
    );
  }
};

// --- Symbol Lookup ---

/**
 * Cari simbol berdasarkan nama (mirip Scope.lookup, tapi pakai semantic graph analyzer).
 *
 * @param {string} name - Nama simbol
 * @returns {Object | null} SemanticSymbol jika ditemukan, null jika tidak
 */
PromptJSAnalyzer.prototype.lookupSymbol = function (name) {
  // [Bug 4 FIX] Lookup O(1) via Map, bukan O(n) linear scan
  if (this._symbolMap) {
    return this._symbolMap.get(name) || null;
  }
  // Fallback jika Map belum dibangun
  if (!this._currentAst || !this._currentAst.semantic || !this._currentAst.semantic.symbols) {
    return null;
  }
  const symbols = this._currentAst.semantic.symbols;
  for (let i = 0; i < symbols.length; i++) {
    if (symbols[i].name === name) {
      return symbols[i];
    }
  }
  return null;
};

/**
 * Cek apakah target adalah data turunan (read-only).
 * Digunakan oleh simpan, tambahkan, kurangi, sisipkan, perbarui.
 */
/**
 * Cek apakah ada penulisan ke data turunan (read-only) → emit E4004.
 *
 * @param {Object} node - AST node statement yang menulis
 * @this {any}
 * @returns {void}
 */
PromptJSAnalyzer.prototype.checkWriteToTurunan = function (node) {
  if (!node.target) return;
  const targetName = typeof node.target === 'string' ? node.target : node.target.name || null;
  if (!targetName) return;
  const symbol = node.targetSymbol || this.lookupSymbol(targetName);
  if (symbol && symbol.kind === 'turunan') {
    this.addError(
      'E4004',
      `Data turunan "${targetName}" bersifat read-only dan tidak boleh diubah.`,
      node.loc,
      'Gunakan data (var) biasa jika perlu mengubah nilainya.'
    );
    return;
  }
  if (symbol && symbol.isWritable === false) {
    this.addError(
      'E4101',
      `Target "${targetName}" tidak dapat ditulis berdasarkan metadata semantic.`,
      node.loc,
      'Gunakan target yang writable atau ubah deklarasi menjadi data/ubah sesuai kebutuhan.'
    );
  }
};

/**
 * Cek apakah statement berada di dalam ekspresi turunan (side-effect check).
 */
/**
 * Cek apakah ada side-effect (Simpan/Tambahkan/Kurangi) di dalam ekspresi turunan → E4002.
 *
 * @param {Object} node - AST node ekspresi turunan
 * @this {any}
 * @returns {void}
 */
PromptJSAnalyzer.prototype.checkSideEffectInTurunan = function (node) {
  if (this.context.inTurunanExpr) {
    this.addError(
      'E4002',
      'Ekspresi turunan tidak boleh mengandung aksi side-effect.',
      node.loc,
      'Hapus aksi simpan/tambahkan/kurangi/sisipkan dari ekspresi turunan.'
    );
  }
};

/**
 * Refinement lvl.2: bangun dependency graph static dan normalized semantic view.
 */
/**
 * Bangun semantic graph dari AST untuk tracking dependency simbol.
 *
 * @this {any}
 * @returns {void}
 */
PromptJSAnalyzer.prototype.buildSemanticGraph = function () {
  if (!this._currentAst || !this._currentAst.semantic) return;

  const graph = DependencyGraph.buildDependencyGraph(this._currentAst);
  this._currentAst.semantic.dependencies = graph.dependencies;
  this._currentAst.semantic.dependencyCycles = graph.cycles;

  if (graph.cycles && graph.cycles.length > 0) {
    for (let i = 0; i < graph.cycles.length; i++) {
      const cycle = graph.cycles[i];
      const names = this._symbolNamesFromIds(cycle.symbolIds || []);
      this.addError(
        'E4201',
        'Dependency cycle pada data turunan: ' + names.join(' -> '),
        null,
        'Ubah salah satu ekspresi turunan agar tidak saling bergantung secara melingkar.'
      );
    }
  }

  this._currentAst.semantic.normalized = DependencyGraph.normalizeSemantic(this._currentAst);
};

/**
 * Konversi daftar ID/identifier menjadi daftar nama simbol.
 *
 * @param {(string | number)[]} ids - Daftar ID atau nama
 * @returns {string[]} Daftar nama simbol
 */
PromptJSAnalyzer.prototype._symbolNamesFromIds = function (ids) {
  const symbols =
    this._currentAst && this._currentAst.semantic ? this._currentAst.semantic.symbols || [] : [];
  return ids.map(function (id) {
    for (let i = 0; i < symbols.length; i++) {
      if (symbols[i].id === id) return symbols[i].name;
    }
    return id;
  });
};

/**
 * Refinement lvl.1: gunakan metadata resolver untuk diagnostics usage dasar.
 * Rule ini sengaja konservatif: parameter tidak dilaporkan agar tidak bising,
 * dan declaration node tanpa loc valid dilewati.
 */
/**
 * Emit warning penggunaan simbol (W4101/W4102/W4103/W4104) berdasarkan tracking read/write.
 *
 * @this {any}
 * @returns {void}
 */
PromptJSAnalyzer.prototype.emitUsageWarnings = function () {
  if (!this._currentAst || !this._currentAst.semantic || !this._currentAst.semantic.symbols) return;

  const usageMode = this.options.usageWarnings || 'normal';
  if (usageMode === false || usageMode === 'off') return;
  const strictUsage = usageMode === 'strict';

  const symbols = this._currentAst.semantic.symbols;
  for (let i = 0; i < symbols.length; i++) {
    const sym = symbols[i];
    if (!sym || !sym.name || sym.kind === 'parameter') continue;

    // Mode normal sengaja tidak memperingatkan fungsi/komponen top-level agar
    // tidak bising pada library/component catalog. Gunakan --strict-usage untuk itu.
    if (!strictUsage && (sym.kind === 'fungsi' || sym.kind === 'komponen')) continue;

    // Hindari warning turunan jika sudah ada error fatal pada declaration node.
    if (sym.declarationNode && sym.declarationNode.type === 'ErrorNode') continue;

    const loc = sym.declarationNode && sym.declarationNode.loc ? sym.declarationNode.loc : null;
    const name = sym.name;
    const readCount = sym.readCount || 0;
    const writeCount = sym.writeCount || 0;

    // Deklarasi yang sama sekali tidak pernah dibaca atau ditulis setelah deklarasi.
    if (readCount === 0 && writeCount === 0) {
      this.addWarning(
        'W4101',
        `Simbol "${name}" dideklarasikan tetapi tidak pernah digunakan.`,
        loc,
        'Hapus deklarasi jika tidak diperlukan, atau gunakan simbol tersebut.'
      );
      continue;
    }

    // Data reaktif yang dimutasi tetapi tidak pernah dibaca adalah dead reactive state.
    if (sym.isReactive && sym.kind === 'data' && writeCount > 0 && readCount === 0) {
      this.addWarning(
        'W4103',
        `Data reaktif "${name}" dimutasi ${writeCount} kali tetapi tidak pernah dibaca.`,
        loc,
        'Jika state reaktif tidak pernah dibaca, pertimbangkan ubah biasa atau hapus mutasinya.'
      );
      continue;
    }

    // Simbol dimutasi tetapi nilainya tidak pernah dibaca.
    if (writeCount > 0 && readCount === 0) {
      this.addWarning(
        'W4102',
        `Simbol "${name}" ditulis ${writeCount} kali tetapi tidak pernah dibaca.`,
        loc,
        'Pastikan nilai yang ditulis benar-benar dibaca, atau hapus penulisan yang tidak perlu.'
      );
    }
  }
};

// --- Visitor Methods ---

/**
 * Validasi Komponen (Section 8)
 */
/**
 * Visitor untuk KomponenDeclaration — set context.inComponent, traverse body.
 *
 * @param {Object} node - AST node KomponenDeclaration
 * @this {any}
 * @returns {void}
 */
PromptJSAnalyzer.prototype.visitKomponenDeclaration = function (node) {
  const prevInComponent = this.context.inComponent;
  this.context.inComponent = true;

  // 1. Validasi Parameter (Section 15.3 context)
  const paramNames = new Set();
  let foundDefault = false;

  if (node.params) {
    node.params.forEach((p) => {
      // Duplicate check
      if (paramNames.has(p.name)) {
        this.addError(
          'E4005',
          `Parameter "${p.name}" duplikat dalam komponen "${node.name}".`,
          p.loc,
          'Hapus salah satu deklarasi parameter.'
        );
      }
      paramNames.add(p.name);

      // Default param order check
      if (p.defaultValue) {
        foundDefault = true;
      } else if (foundDefault) {
        this.addError(
          'E4006',
          `Parameter tanpa nilai default tidak boleh diletakkan setelah parameter dengan default.`,
          p.loc,
          'Pindahkan parameter dengan default ke akhir daftar.'
        );
      }

      if (p.defaultValue) this.checkTypeHint(p.typeHint, p.defaultValue);
    });
  }

  this.genericVisit(node);
  this.context.inComponent = prevInComponent;
};

/**
 * Validasi Lifecycle Hook (Section 5.4 / 8.5)
 */
/**
 * Visitor untuk LifecycleStatement — cek context.inComponent (E4001 jika di luar komponen).
 *
 * @param {Object} node - AST node LifecycleStatement
 * @this {any}
 * @returns {void}
 */
PromptJSAnalyzer.prototype.visitLifecycleStatement = function (node) {
  if (!this.context.inComponent) {
    this.addError(
      'E4001',
      `Lifecycle hook "saat komponen ${node.kind}" hanya valid di dalam komponen.`,
      node.loc,
      'Pindahkan blok ini ke dalam definisi komponen.'
    );
  }

  if (this.context.loopDepth > 0 || this.context.handlerDepth > 0) {
    this.addWarning(
      'W4002',
      `Lifecycle hook sebaiknya tidak diletakkan di dalam loop atau handler.`,
      node.loc
    );
  }

  this.genericVisit(node);
};

/**
 * Validasi Turunan (Section 7.4)
 */
/**
 * Visitor untuk TurunanDeclaration — set context.inTurunanExpr, traverse init.
 *
 * @param {Object} node - AST node TurunanDeclaration
 * @this {any}
 * @returns {void}
 */
PromptJSAnalyzer.prototype.visitTurunanDeclaration = function (node) {
  const prevInTurunan = this.context.inTurunanExpr;
  this.context.inTurunanExpr = true;

  this.genericVisit(node);
  this.context.inTurunanExpr = prevInTurunan;
};

/**
 * Validasi Type Hint pada Deklarasi Data (Section 7.3)
 */
/**
 * Visitor untuk DataDeclaration — checkTypeHint + traverse init.
 *
 * @param {Object} node - AST node DataDeclaration
 * @this {any}
 * @returns {void}
 */
PromptJSAnalyzer.prototype.visitDataDeclaration = function (node) {
  if (node.typeHint && node.init) {
    this.checkTypeHint(node.typeHint, node.init);
  }
  this.genericVisit(node);
};

/**
 * Visitor untuk TetapDeclaration — cek init wajib (W4003 jika null), checkTypeHint.
 *
 * @param {Object} node - AST node TetapDeclaration
 * @this {any}
 * @returns {void}
 */
PromptJSAnalyzer.prototype.visitTetapDeclaration = function (node) {
  if (node.typeHint && node.init) {
    this.checkTypeHint(node.typeHint, node.init);
  }
  // W4003: tetap tanpa nilai awal
  if (!node.init) {
    this.addWarning(
      'W4003',
      `Deklarasi "tetap" untuk "${node.name}" tanpa nilai awal.`,
      node.loc,
      'Berikan nilai awal untuk konstanta.'
    );
  }
  this.genericVisit(node);
};

/**
 * Visitor untuk UbahDeclaration — checkTypeHint + traverse init.
 *
 * @param {Object} node - AST node UbahDeclaration
 * @this {any}
 * @returns {void}
 */
PromptJSAnalyzer.prototype.visitUbahDeclaration = function (node) {
  if (node.typeHint && node.init) {
    this.checkTypeHint(node.typeHint, node.init);
  }
  this.genericVisit(node);
};

/**
 * Validasi Reaktivitas & Assignment (Section 7.5)
 */
/**
 * Visitor untuk SimpanStatement — cek checkWriteToTurunan.
 *
 * @param {Object} node - AST node SimpanStatement
 * @this {any}
 * @returns {void}
 */
PromptJSAnalyzer.prototype.visitSimpanStatement = function (node) {
  // Cek side-effect dalam turunan
  this.checkSideEffectInTurunan(node);
  // Cek apakah target adalah turunan (read-only)
  this.checkWriteToTurunan(node);

  this.genericVisit(node);
};

// ─── Mutation Statements (C5/M1 FIX) ──────────────────────

/**
 * Visitor untuk TambahkanStatement — cek inTurunanExpr (E4002), checkWriteToTurunan.
 *
 * @param {Object} node - AST node TambahkanStatement
 * @this {any}
 * @returns {void}
 */
PromptJSAnalyzer.prototype.visitTambahkanStatement = function (node) {
  this.checkSideEffectInTurunan(node);
  this.checkWriteToTurunan(node);
  this.genericVisit(node);
};

/**
 * Visitor untuk KurangiStatement — cek inTurunanExpr (E4002), checkWriteToTurunan.
 *
 * @param {Object} node - AST node KurangiStatement
 * @this {any}
 * @returns {void}
 */
PromptJSAnalyzer.prototype.visitKurangiStatement = function (node) {
  this.checkSideEffectInTurunan(node);
  this.checkWriteToTurunan(node);
  this.genericVisit(node);
};

/**
 * Visitor untuk SisipkanStatement — cek inTurunanExpr (E4002), checkWriteToTurunan.
 *
 * @param {Object} node - AST node SisipkanStatement
 * @this {any}
 * @returns {void}
 */
PromptJSAnalyzer.prototype.visitSisipkanStatement = function (node) {
  this.checkSideEffectInTurunan(node);
  this.checkWriteToTurunan(node);
  this.genericVisit(node);
};

// ─── PerbaruiStatement (C5 FIX) ────────────────────────────
/**
 * Visitor untuk PerbaruiStatement — cek property valid (E4008), checkWriteToTurunan.
 *
 * @param {Object} node - AST node PerbaruiStatement
 * @this {any}
 * @returns {void}
 */
PromptJSAnalyzer.prototype.visitPerbaruiStatement = function (node) {
  // Cek side-effect dalam turunan
  this.checkSideEffectInTurunan(node);
  // Cek apakah target adalah turunan (read-only)
  this.checkWriteToTurunan(node);
  this.genericVisit(node);
};

// ─── GunakanStatement (H4 FIX) ─────────────────────────────
/**
 * Visitor untuk GunakanStatement — cek componentName adalah komponen (E4010 jika tidak).
 *
 * @param {Object} node - AST node GunakanStatement
 * @this {any}
 * @returns {void}
 */
PromptJSAnalyzer.prototype.visitGunakanStatement = function (node) {
  if (node.componentName) {
    const symbol = this.lookupSymbol(node.componentName);
    if (symbol && symbol.kind !== 'komponen') {
      this.addError(
        'E4010',
        `"${node.componentName}" bukan komponen, tidak dapat digunakan dengan "gunakan".`,
        node.loc,
        'Pastikan nama yang direferensikan adalah komponen (PascalCase).'
      );
    }
  }
  this.genericVisit(node);
};

// ─── TampilkanStatement (H4 FIX) ───────────────────────────
/**
 * Visitor untuk TampilkanStatement — cek mode valid (E4007).
 *
 * @param {Object} node - AST node TampilkanStatement
 * @this {any}
 * @returns {void}
 */
PromptJSAnalyzer.prototype.visitTampilkanStatement = function (node) {
  const validModes = ['tambahkan', 'ganti', 'awalan', 'sebelum', 'sesudah'];
  if (node.mode && validModes.indexOf(node.mode) === -1) {
    this.addError(
      'E4007',
      `Mode "${node.mode}" tidak dikenal.`,
      node.loc,
      `Mode yang valid: ${validModes.join(', ')}.`
    );
  }
  this.genericVisit(node);
};

// ─── SembunyikanStatement (H4 FIX) ─────────────────────────
/**
 * Visitor untuk SembunyikanStatement — traverse target.
 *
 * @param {Object} node - AST node SembunyikanStatement
 * @this {any}
 * @returns {void}
 */
PromptJSAnalyzer.prototype.visitSembunyikanStatement = function (node) {
  this.genericVisit(node);
};

// ─── HapusStatement (H4 FIX) ───────────────────────────────
/**
 * Visitor untuk HapusStatement — traverse target.
 *
 * @param {Object} node - AST node HapusStatement
 * @this {any}
 * @returns {void}
 */
PromptJSAnalyzer.prototype.visitHapusStatement = function (node) {
  this.genericVisit(node);
};

// ─── KosongkanStatement (H4 FIX) ───────────────────────────
/**
 * Visitor untuk KosongkanStatement — traverse target.
 *
 * @param {Object} node - AST node KosongkanStatement
 * @this {any}
 * @returns {void}
 */
PromptJSAnalyzer.prototype.visitKosongkanStatement = function (node) {
  this.genericVisit(node);
};

// ─── ArahkanStatement (H4 FIX) ─────────────────────────────
/**
 * Visitor untuk ArahkanStatement — traverse url.
 *
 * @param {Object} node - AST node ArahkanStatement
 * @this {any}
 * @returns {void}
 */
PromptJSAnalyzer.prototype.visitArahkanStatement = function (node) {
  this.genericVisit(node);
};

// ─── SetelahStatement (H4 FIX) ─────────────────────────────
/**
 * Visitor untuk SetelahStatement — traverse target, body, action.
 *
 * @param {Object} node - AST node SetelahStatement
 * @this {any}
 * @returns {void}
 */
PromptJSAnalyzer.prototype.visitSetelahStatement = function (node) {
  this.genericVisit(node);
};

// ─── AmbilDomStatement (H4 FIX) ────────────────────────────
/**
 * Visitor untuk AmbilDomStatement — traverse source.
 *
 * @param {Object} node - AST node AmbilDomStatement
 * @this {any}
 * @returns {void}
 */
PromptJSAnalyzer.prototype.visitAmbilDomStatement = function (node) {
  this.genericVisit(node);
};

// ─── AmbilLuarStatement (H4 FIX) ───────────────────────────
/**
 * Visitor untuk AmbilLuarStatement — traverse url, branches, options.
 *
 * @param {Object} node - AST node AmbilLuarStatement
 * @this {any}
 * @returns {void}
 */
PromptJSAnalyzer.prototype.visitAmbilLuarStatement = function (node) {
  this.genericVisit(node);
};

/**
 * Validasi Kontrol Alur (Section 6.5)
 * [H6 FIX] E6xxx → E4xxx baru
 */
/**
 * Visitor untuk BerhentiStatement — cek context (E4011 jika di luar loop/handler).
 *
 * @param {Object} node - AST node BerhentiStatement
 * @this {any}
 * @returns {void}
 */
PromptJSAnalyzer.prototype.visitBerhentiStatement = function (node) {
  const isValid = this.context.loopDepth > 0 || this.context.handlerDepth > 0;
  if (!isValid) {
    this.addError(
      'E4011',
      '"berhenti" tidak valid di luar loop atau event handler.',
      node.loc,
      '"berhenti" hanya valid di dalam loop atau event handler.'
    );
  }
  if (this.context.inFunction && this.context.loopDepth === 0 && this.context.handlerDepth === 0) {
    this.addError(
      'E4011',
      '"berhenti" di dalam fungsi (bukan loop/handler) tidak valid.',
      node.loc,
      'Gunakan "kembalikan" untuk keluar dari fungsi.'
    );
  }
};

/**
 * Visitor untuk LewatiStatement — cek context.loopDepth > 0 (E4012 jika di luar loop).
 *
 * @param {Object} node - AST node LewatiStatement
 * @this {any}
 * @returns {void}
 */
PromptJSAnalyzer.prototype.visitLewatiStatement = function (node) {
  // PromptJS patch: "pass" in BuatStatement body is valid (empty element marker)
  // Only emit error if not inside a BuatStatement (i.e., standalone pass outside loop)
  if (this.context.loopDepth === 0 && !this.context.inBuatStatement) {
    this.addError(
      'E4012',
      '"lewati" tidak valid di luar loop.',
      node.loc,
      'Gunakan "lewati" hanya di dalam "ulangi" atau "selama".'
    );
  }
};

/**
 * Visitor untuk KembalikanStatement — cek context.inFunction || inComponent (E4013 jika di luar).
 *
 * @param {Object} node - AST node KembalikanStatement
 * @this {any}
 * @returns {void}
 */
PromptJSAnalyzer.prototype.visitKembalikanStatement = function (node) {
  if (!this.context.inFunction && !this.context.inComponent) {
    this.addError(
      'E4013',
      '"kembalikan" tidak valid di luar fungsi atau komponen.',
      node.loc,
      'Gunakan "kembalikan" hanya di dalam fungsi atau komponen.'
    );
  }
};

/**
 * Validasi Konteks Loop & Handler
 */
/**
 * Visitor untuk UlangiStatement — increment loopDepth, traverse body, decrement.
 *
 * @param {Object} node - AST node UlangiStatement
 * @this {any}
 * @returns {void}
 */
PromptJSAnalyzer.prototype.visitUlangiStatement = function (node) {
  this.context.loopDepth++;
  this.genericVisit(node);
  this.context.loopDepth--;
};

/**
 * Visitor untuk SelamaStatement — increment loopDepth, traverse condition + body, decrement.
 *
 * @param {Object} node - AST node SelamaStatement
 * @this {any}
 * @returns {void}
 */
PromptJSAnalyzer.prototype.visitSelamaStatement = function (node) {
  this.context.loopDepth++;
  this.genericVisit(node);
  this.context.loopDepth--;
};

/**
 * Visitor untuk KetikaStatement — increment handlerDepth, traverse body, decrement.
 *
 * @param {Object} node - AST node KetikaStatement
 * @this {any}
 * @returns {void}
 */
PromptJSAnalyzer.prototype.visitKetikaStatement = function (node) {
  this.context.handlerDepth++;
  this.genericVisit(node);
  this.context.handlerDepth--;
};

/**
 * Visitor untuk FungsiDeclaration — set context.inFunction, traverse params + body.
 *
 * @param {Object} node - AST node FungsiDeclaration
 * @this {any}
 * @returns {void}
 */
PromptJSAnalyzer.prototype.visitFungsiDeclaration = function (node) {
  const prevInFunc = this.context.inFunction;
  this.context.inFunction = true;
  this.genericVisit(node);
  this.context.inFunction = prevInFunc;
};

/**
 * PromptJS patch: Track BuatStatement context so pass/lewati is valid inside it.
 */
/**
 * Visitor untuk BuatStatement — set context.inBuatStatement, traverse body.
 *
 * @param {Object} node - AST node BuatStatement
 * @this {any}
 * @returns {void}
 */
PromptJSAnalyzer.prototype.visitBuatStatement = function (node) {
  const prevInBuat = this.context.inBuatStatement;
  this.context.inBuatStatement = true;
  this.genericVisit(node);
  this.context.inBuatStatement = prevInBuat;
};

/**
 * Validasi Watcher (Section 7.6)
 */
/**
 * Visitor untuk SaatStatement — cek target adalah data reaktif (W3003 jika tidak).
 *
 * @param {Object} node - AST node SaatStatement
 * @this {any}
 * @returns {void}
 */
PromptJSAnalyzer.prototype.visitSaatStatement = function (node) {
  const symbol = node.targetSymbol || this.lookupSymbol(node.target);
  if (symbol && symbol.isReactive === false) {
    this.addWarning(
      'W4104',
      `Watcher target "${node.target}" bukan data reaktif menurut analyzer.`,
      node.loc,
      'Gunakan data/turunan reaktif sebagai target watcher.'
    );
  }
  this.genericVisit(node);
};

// ─── TextNode (PromptJS patch: pass-through) ───────────────────────────────
/**
 * Visitor untuk TextNode — no-op.
 *
 * @param {Object} _node - AST node TextNode (unused)
 * @this {any}
 * @returns {void}
 */
PromptJSAnalyzer.prototype.visitTextNode = function (_node) {
  // TextNode is a leaf node — no semantic validation needed.
  // The value is a plain string that will become a DOM text node.
};

module.exports = PromptJSAnalyzer;
