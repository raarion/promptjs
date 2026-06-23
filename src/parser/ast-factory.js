// @ts-check

/**
 * PromptJS v0.2 — AST Node Factory / Pabrik Node AST
 * ============================================================================
 *
 * Factory functions that build AST nodes. Guarantees / Jaminan:
 * - Setiap node memiliki `type` dan `loc` (TIDAK PERNAH null/undefined)
 * - `loc` mengikuti format SourceLocation { start: Position, end: Position }
 * - Properti anak berupa array, bukan null
 * - ErrorNode digunakan sebagai pengganti null pada posisi anak
 * - Jika loc tidak disediakan, digunakan UNKNOWN_LOC (0:0-0:0)
 *
 * Based on / Berdasarkan: AST Specification v1.0.0
 */

/**
 * Posisi dalam source code (baris, kolom).
 *
 * @typedef {Object} Position
 * @property {number} line - Nomor baris (1-indexed)
 * @property {number} column - Nomor kolom (0-indexed)
 */

/**
 * Lokasi source dalam source code PromptJS.
 *
 * @typedef {Object} SourceLocation
 * @property {Position} start - Posisi awal / Start position
 * @property {Position} end - Posisi akhir / End position
 * @property {string} [source] - Nama file source / Source filename (opsional, hanya di Program)
 */

/**
 * Token hasil lexer (digunakan `buatLoc` untuk konversi ke SourceLocation).
 *
 * @typedef {Object} Token
 * @property {string} type - Jenis token (mis. 'TK_IDENT', 'TK_STRING')
 * @property {*} value - Nilai token
 * @property {number} baris - Nomor baris (1-indexed, alias ID untuk `line`)
 * @property {number} kolom - Nomor kolom (0-indexed, alias ID untuk `column`)
 * @property {string} [nilai] - Raw value (alias ID untuk `raw`)
 */

/**
 * Node AST generik. Setiap node memiliki properti `type` string; properti
 * lainnya bergantung pada jenis node (lihat `getChildKeys` di `utils/visitor.js`).
 *
 * @typedef {Object} ASTNode
 * @property {string} type - Jenis node / Node type (mis. 'Program', 'BuatStatement')
 * @property {SourceLocation} loc - Lokasi source / Source location (selalu diisi, fallback UNKNOWN_LOC)
 * @property {ASTNode} [docstring] - Docstring yang menempel / Attached docstring (opsional)
 */

/**
 * Node Program — root AST yang merepresentasikan satu file `.pjs`.
 *
 * @typedef {ASTNode & { type: 'Program', body: ASTNode[], source?: string }} ProgramNode
 */

/**
 * Node deklarasi data/variabel (data/tetap/ubah/turunan).
 *
 * @typedef {ASTNode & {
 *   type: 'DataDeclaration' | 'TetapDeclaration' | 'UbahDeclaration' | 'TurunanDeclaration',
 *   name: string,
 *   typeHint?: string,
 *   init: ASTNode | null
 * }} DeclarationNode
 */

/**
 * Node deklarasi komponen/fungsi.
 *
 * @typedef {ASTNode & {
 *   type: 'KomponenDeclaration' | 'FungsiDeclaration',
 *   name: string,
 *   params: ASTNode[],
 *   returnType?: string,
 *   body: ASTNode
 * }} CallableDeclarationNode
 */

/**
 * Lokasi default untuk node yang tidak memiliki informasi posisi.
 * Digunakan sebagai fallback ketika parser tidak menyediakan loc.
 *
 * @type {SourceLocation}
 */
const UNKNOWN_LOC = {
  start: { line: 0, column: 0 },
  end: { line: 0, column: 0 },
};

/**
 * Memastikan `loc` selalu valid. Jika `loc` null/undefined atau tidak punya
 * `start`, kembalikan `UNKNOWN_LOC`.
 *
 * @param {SourceLocation | null | undefined} loc - Lokasi yang akan divalidasi
 * @returns {SourceLocation} SourceLocation yang valid (tidak pernah null)
 */
function ensureLoc(loc) {
  if (!loc) return UNKNOWN_LOC;
  if (!loc.start) return UNKNOWN_LOC;
  return loc;
}

/**
 * Membuat SourceLocation dari posisi atau token.
 *
 * Menerima dua bentuk input untuk `start` dan `end`:
 * - Position object: `{ line, column }`
 * - Token: `{ baris, kolom }` (alias ID untuk `line`/`column`)
 *
 * Jika `end` tidak diberikan, digunakan `start` sebagai `end`.
 * Jika keduanya tidak ada, kembalikan `UNKNOWN_LOC`.
 *
 * Catatan: parameter `start`/`end` dianotasi `any` (bukan union
 * `Position | Token`) karena TypeScript tidak dapat men-narrow union
 * berdasarkan check `baris !== undefined` — keduanya sah sebagai input
 * tapi akses properti `baris`/`kolom` vs `line`/`column` bergantung pada
 * bentuk runtime.
 *
 * @param {any} start - Posisi awal `{line, column}` atau token `{baris, kolom}`
 * @param {any} [end] - Posisi akhir atau token (opsional)
 * @returns {SourceLocation} SourceLocation yang terbentuk
 */
function buatLoc(start, end) {
  // Jika keduanya tidak ada, kembalikan UNKNOWN_LOC
  if (!start && !end) return UNKNOWN_LOC;

  let s = start;
  let e = end;
  // Jika start adalah token, ambil posisinya
  if (start && start.baris !== undefined) {
    s = { line: start.baris, column: start.kolom };
  }
  if (end && end.baris !== undefined) {
    e = { line: end.baris, column: end.kolom };
  }
  // Jika end tidak diberikan, gunakan start
  if (!e) {
    e = s;
  }
  // Jika start masih tidak valid, kembalikan UNKNOWN_LOC
  if (!s) return UNKNOWN_LOC;
  return {
    start: { line: s.line, column: s.column },
    end: { line: e.line, column: e.column },
  };
}

/**
 * Membuat SourceLocation dari token awal dan token akhir.
 *
 * `end` dihitung dengan menambahkan panjang `endToken.nilai` ke kolom,
 * sehingga lokasi mencakup seluruh rentang token akhir.
 *
 * @param {Token} startToken - Token awal rentang
 * @param {Token} endToken - Token akhir rentang
 * @returns {SourceLocation} SourceLocation yang mencakup kedua token
 */
function locFromTokens(startToken, endToken) {
  return buatLoc(
    { line: startToken.baris, column: startToken.kolom },
    { line: endToken.baris, column: endToken.kolom + (endToken.nilai ? endToken.nilai.length : 1) }
  );
}

/**
 * Menggabungkan dua SourceLocation, mengembalikan rentang terluas yang
 * mencakup keduanya.
 *
 * Berguna saat membuat node yang membungkus beberapa child node — misalnya
 * `BinaryExpression` yang loc-nya mencakup `left` sampai `right`.
 *
 * @param {SourceLocation | null | undefined} locA - Lokasi pertama
 * @param {SourceLocation | null | undefined} locB - Lokasi kedua
 * @returns {SourceLocation | null} Rentang terluas, atau salah satu jika yang lain null
 */
function gabungLoc(locA, locB) {
  if (!locA) return locB;
  if (!locB) return locA;
  return {
    start: {
      line: Math.min(locA.start.line, locB.start.line),
      column: locA.start.line <= locB.start.line ? locA.start.column : locB.start.column,
    },
    end: {
      line: Math.max(locA.end.line, locB.end.line),
      column: locA.end.line >= locB.end.line ? locA.end.column : locB.end.column,
    },
  };
}

// ─── Root Node ─────────────────────────────────────────────

/**
 * Membuat node Program — root AST satu file `.pjs`.
 *
 * @param {ASTNode[]} body - Daftar top-level statement
 * @param {SourceLocation} [loc] - Lokasi seluruh program (fallback: 1:1-1:1)
 * @param {string} [source] - Nama/path file source (opsional, untuk error reporting)
 * @returns {ProgramNode} Node Program
 */
function buatProgramNode(body, loc, source) {
  return {
    type: 'Program',
    loc: ensureLoc(loc) || buatLoc({ line: 1, column: 1 }, { line: 1, column: 1 }),
    body: body || [],
    source: source || undefined,
  };
}

// ─── Declaration Nodes ─────────────────────────────────────

/**
 * Membuat node `DataDeclaration` (keyword `Data`).
 *
 * @param {string} name - Nama variabel
 * @param {string | undefined} typeHint - Type hint opsional (mis. 'angka', 'teks')
 * @param {ASTNode | null} init - Ekspresi inisialisasi (boleh null)
 * @param {SourceLocation} [loc] - Lokasi deklarasi
 * @param {ASTNode} [docstring] - Docstring yang menempel (opsional)
 * @returns {DeclarationNode} Node DataDeclaration
 */
function buatDataDeclaration(name, typeHint, init, loc, docstring) {
  return {
    type: 'DataDeclaration',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    name: name,
    typeHint: typeHint || undefined,
    init: init,
  };
}

/**
 * Membuat node `TetapDeclaration` (keyword `Tetap` / const).
 *
 * @param {string} name - Nama konstanta
 * @param {string | undefined} typeHint - Type hint opsional
 * @param {ASTNode | null} init - Ekspresi inisialisasi wajib
 * @param {SourceLocation} [loc] - Lokasi deklarasi
 * @param {ASTNode} [docstring] - Docstring yang menempel (opsional)
 * @returns {DeclarationNode} Node TetapDeclaration
 */
function buatTetapDeclaration(name, typeHint, init, loc, docstring) {
  return {
    type: 'TetapDeclaration',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    name: name,
    typeHint: typeHint || undefined,
    init: init,
  };
}

/**
 * Membuat node `UbahDeclaration` (keyword `Ubah` / let).
 *
 * @param {string} name - Nama variabel
 * @param {string | undefined} typeHint - Type hint opsional
 * @param {ASTNode | null} init - Ekspresi inisialisasi (boleh null untuk deklarasi tanpa nilai)
 * @param {SourceLocation} [loc] - Lokasi deklarasi
 * @param {ASTNode} [docstring] - Docstring yang menempel (opsional)
 * @returns {DeclarationNode} Node UbahDeclaration
 */
function buatUbahDeclaration(name, typeHint, init, loc, docstring) {
  return {
    type: 'UbahDeclaration',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    name: name,
    typeHint: typeHint || undefined,
    init: init,
  };
}

/**
 * Membuat node `TurunanDeclaration` (keyword `Turunan` / derived/computed).
 *
 * Turunan adalah data reaktif yang nilainya dihitung dari data reaktif lain.
 * Read-only — tidak boleh ditulis langsung (akan memicu `E4004`).
 *
 * @param {string} name - Nama data turunan
 * @param {string | undefined} typeHint - Type hint opsional
 * @param {ASTNode | null} init - Ekspresi yang menghitung nilai turunan
 * @param {SourceLocation} [loc] - Lokasi deklarasi
 * @param {ASTNode} [docstring] - Docstring yang menempel (opsional)
 * @returns {DeclarationNode} Node TurunanDeclaration
 */
function buatTurunanDeclaration(name, typeHint, init, loc, docstring) {
  return {
    type: 'TurunanDeclaration',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    name: name,
    typeHint: typeHint || undefined,
    init: init,
  };
}

/**
 * Membuat node `KomponenDeclaration` (keyword `Komponen` / `Component`).
 *
 * @param {string} name - Nama komponen (PascalCase, mis. 'KartuProduk')
 * @param {ASTNode[]} params - Daftar Parameter node (named props)
 * @param {ASTNode} body - Body komponen (BlockStatement)
 * @param {SourceLocation} [loc] - Lokasi deklarasi
 * @param {ASTNode} [docstring] - Docstring yang menempel (opsional)
 * @param {string} [returnType] - Type hint return value (opsional)
 * @returns {CallableDeclarationNode} Node KomponenDeclaration
 */
function buatKomponenDeclaration(name, params, body, loc, docstring, returnType) {
  return {
    type: 'KomponenDeclaration',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    name: name,
    params: params || [],
    returnType: returnType || undefined,
    body: body,
  };
}

/**
 * Membuat node `FungsiDeclaration` (keyword `Fungsi` / function).
 *
 * @param {string} name - Nama fungsi
 * @param {ASTNode[]} params - Daftar Parameter node
 * @param {ASTNode} body - Body fungsi (BlockStatement)
 * @param {SourceLocation} [loc] - Lokasi deklarasi
 * @param {ASTNode} [docstring] - Docstring yang menempel (opsional)
 * @param {string} [returnType] - Type hint return value (opsional)
 * @returns {CallableDeclarationNode} Node FungsiDeclaration
 */
function buatFungsiDeclaration(name, params, body, loc, docstring, returnType) {
  return {
    type: 'FungsiDeclaration',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    name: name,
    params: params || [],
    returnType: returnType || undefined,
    body: body,
  };
}

// ─── Statement Nodes ───────────────────────────────────────

/**
 * Membuat node `BlockStatement` — blok yang berisi daftar statement.
 *
 * @param {ASTNode[]} body - Daftar statement dalam blok
 * @param {SourceLocation} [loc] - Lokasi blok
 * @returns {Object} & { type: 'BlockStatement', body: ASTNode[] }} Node BlockStatement
 */
function buatBlockStatement(body, loc) {
  return {
    type: 'BlockStatement',
    loc: ensureLoc(loc),
    body: body || [],
  };
}

/**
 * Membuat node `BuatStatement` (keyword `Buat` / `Create`).
 *
 * Membuat elemen DOM. Properti `properties`, `body`, `action` hanya diisi
 * jika diberikan (bukan null/undefined/empty array).
 *
 * Catatan: `properties` dapat berupa array PropertyNode ATAU plain object
 * `{ teks: expr }` (shortcut parser untuk inline text). Anotasi `any`
 * merefleksikan hal ini.
 *
 * @param {Object} selector - Selector node (tag, id, classes, attributes)
 * @param {SourceLocation} [loc] - Lokasi statement
 * @param {Object} [docstring] - Docstring yang menempel (opsional)
 * @param {any} [properties] - Daftar PropertyNode/AttributeNode ATAU plain object `{ teks: expr }`
 * @param {Object} [body] - Body berisi child elements (opsional)
 * @param {Object} [action] - Aksi tunggal via `->` (opsional)
 * @returns {Object} Node BuatStatement
 */
function buatBuatStatement(selector, loc, docstring, properties, body, action) {
  const node = {
    type: 'BuatStatement',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    selector: selector,
  };
  if (properties && properties.length > 0) {
    node.properties = properties;
  }
  if (body) {
    node.body = body;
  }
  if (action) {
    node.action = action;
  }
  return node;
}

/**
 * Membuat node `TampilkanStatement` (keyword `Tampilkan` / show).
 *
 * @param {ASTNode} target - Elemen yang akan ditampilkan
 * @param {SourceLocation} [loc] - Lokasi statement
 * @param {ASTNode} [docstring] - Docstring yang menempel (opsional)
 * @param {ASTNode} [mountTarget] - Target mount (opsional)
 * @param {string} [mode] - Mode tampilkan (mis. 'tambahkan', 'ganti', 'awalan', 'sebelum', 'sesudah')
 * @param {string} [messageKind] - Jenis pesan (untuk mode pesan/alert)
 * @returns {Object}} Node TampilkanStatement
 */
function buatTampilkanStatement(target, loc, docstring, mountTarget, mode, messageKind) {
  const node = {
    type: 'TampilkanStatement',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    target: target,
  };
  if (mountTarget) node.mountTarget = mountTarget;
  if (mode) node.mode = mode;
  if (messageKind) node.messageKind = messageKind;
  return node;
}

/**
 * Membuat node `SembunyikanStatement` (keyword `Sembunyikan` / hide).
 *
 * @param {ASTNode} target - Elemen yang akan disembunyikan
 * @param {SourceLocation} [loc] - Lokasi statement
 * @param {ASTNode} [docstring] - Docstring yang menempel (opsional)
 * @returns {Object}} Node SembunyikanStatement
 */
function buatSembunyikanStatement(target, loc, docstring) {
  return {
    type: 'SembunyikanStatement',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    target: target,
  };
}

/**
 * Membuat node `HapusStatement` (keyword `Hapus` / remove).
 *
 * @param {ASTNode} target - Elemen yang akan dihapus dari DOM
 * @param {SourceLocation} [loc] - Lokasi statement
 * @param {ASTNode} [docstring] - Docstring yang menempel (opsional)
 * @returns {Object}} Node HapusStatement
 */
function buatHapusStatement(target, loc, docstring) {
  return {
    type: 'HapusStatement',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    target: target,
  };
}

/**
 * Membuat node `HapusDariStatement` (keyword `Hapus ... dari ...`).
 *
 * Menghapus item dari array reaktif.
 *
 * @param {ASTNode} item - Item yang akan dihapus
 * @param {ASTNode} fromArray - Array sumber
 * @param {SourceLocation} [loc] - Lokasi statement
 * @param {ASTNode} [docstring] - Docstring yang menempel (opsional)
 * @returns {Object}} Node HapusDariStatement
 */
function buatHapusDariStatement(item, fromArray, loc, docstring) {
  return {
    type: 'HapusDariStatement',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    item: item,
    fromArray: fromArray,
  };
}

/**
 * Membuat node `KosongkanStatement` (keyword `Kosongkan` / clear).
 *
 * @param {ASTNode} target - Elemen yang akan dikosongkan (children dihapus)
 * @param {SourceLocation} [loc] - Lokasi statement
 * @param {ASTNode} [docstring] - Docstring yang menempel (opsional)
 * @returns {Object}} Node KosongkanStatement
 */
function buatKosongkanStatement(target, loc, docstring) {
  return {
    type: 'KosongkanStatement',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    target: target,
  };
}

/**
 * Membuat node `PerbaruiStatement` (keyword `Perbarui` / update).
 *
 * @param {string} property - Nama properti yang diperbarui (mis. 'teks', 'kelas', 'src')
 * @param {ASTNode} target - Elemen target
 * @param {ASTNode} value - Nilai baru
 * @param {SourceLocation} [loc] - Lokasi statement
 * @param {ASTNode} [docstring] - Docstring yang menempel (opsional)
 * @returns {Object}} Node PerbaruiStatement
 */
function buatPerbaruiStatement(property, target, value, loc, docstring) {
  return {
    type: 'PerbaruiStatement',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    property: property,
    target: target,
    value: value,
  };
}

/**
 * Membuat node `KetikaStatement` (keyword `Ketika` / when — event handler).
 *
 * @param {string} event - Nama event (mis. 'diklik', 'diubah', 'click')
 * @param {SourceLocation} [loc] - Lokasi statement
 * @param {ASTNode} [docstring] - Docstring yang menempel (opsional)
 * @param {ASTNode} [target] - Target event (opsional jika di dalam blok Buat/Komponen)
 * @param {ASTNode} [body] - Body handler (opsional)
 * @param {ASTNode} [action] - Aksi tunggal via `->` (opsional)
 * @returns {Object}} Node KetikaStatement
 */
function buatKetikaStatement(event, loc, docstring, target, body, action) {
  const node = {
    type: 'KetikaStatement',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    event: event,
  };
  if (target) node.target = target;
  if (body) node.body = body;
  if (action) node.action = action;
  return node;
}

/**
 * Membuat node `SaatStatement` (keyword `Saat` / watch — reactive watcher).
 *
 * @param {string} target - Nama data reaktif yang di-watch
 * @param {ASTNode} body - Body watcher (BlockStatement)
 * @param {SourceLocation} [loc] - Lokasi statement
 * @param {ASTNode} [docstring] - Docstring yang menempel (opsional)
 * @returns {Object}} Node SaatStatement
 */
function buatSaatStatement(target, body, loc, docstring) {
  return {
    type: 'SaatStatement',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    target: target,
    body: body,
  };
}

/**
 * Membuat node `LifecycleStatement` (keyword `Pasang`/`Lepas`/mount/unmount).
 *
 * @param {string} kind - Jenis lifecycle ('pasang'/'mount', 'lepas'/'unmount')
 * @param {ASTNode} body - Body handler (BlockStatement)
 * @param {SourceLocation} [loc] - Lokasi statement
 * @param {ASTNode} [docstring] - Docstring yang menempel (opsional)
 * @returns {Object}} Node LifecycleStatement
 */
function buatLifecycleStatement(kind, body, loc, docstring) {
  return {
    type: 'LifecycleStatement',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    kind: kind,
    body: body,
  };
}

/**
 * Membuat node `SetelahStatement` (keyword `Setelah` / after).
 *
 * @param {ASTNode} target - Target aksi
 * @param {SourceLocation} [loc] - Lokasi statement
 * @param {ASTNode} [docstring] - Docstring yang menempel (opsional)
 * @param {ASTNode} [body] - Body handler (opsional)
 * @param {ASTNode} [action] - Aksi tunggal via `->` (opsional)
 * @returns {Object}} Node SetelahStatement
 */
function buatSetelahStatement(target, loc, docstring, body, action) {
  const node = {
    type: 'SetelahStatement',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    target: target,
  };
  if (body) node.body = body;
  if (action) node.action = action;
  return node;
}

/**
 * Membuat node `JikaStatement` (keyword `Jika` / if).
 *
 * @param {ASTNode} condition - Ekspresi kondisi
 * @param {ASTNode} consequent - Body yang dijalankan jika kondisi true (BlockStatement)
 * @param {SourceLocation} [loc] - Lokasi statement
 * @param {ASTNode} [docstring] - Docstring yang menempel (opsional)
 * @param {ASTNode} [alternate] - Cabang `Lainnya` / else (opsional)
 * @returns {Object}} Node JikaStatement
 */
function buatJikaStatement(condition, consequent, loc, docstring, alternate) {
  const node = {
    type: 'JikaStatement',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    condition: condition,
    consequent: consequent,
  };
  if (alternate) node.alternate = alternate;
  return node;
}

/**
 * Membuat node `UlangiStatement` (keyword `Ulangi` / loop).
 *
 * Tiga varian loop:
 * - Iterasi array: `Ulangi untuk x dari $items:` (`kind: 'dari'` / `'in'`)
 * - Counted loop: `Ulangi 5 kali:` (`kind: 'kali'`)
 * - Range loop: `Ulangi x dari 1 sampai 10:` (`kind: 'rentang'`)
 *
 * @param {string | undefined} iteratorName - Nama iterator (kosong untuk counted loop)
 * @param {ASTNode} source - Sumber iterasi (array, angka, atau range)
 * @param {ASTNode} body - Body loop (BlockStatement)
 * @param {string} kind - Jenis loop ('dari'/'in', 'kali', 'rentang')
 * @param {SourceLocation} [loc] - Lokasi statement
 * @param {ASTNode} [docstring] - Docstring yang menempel (opsional)
 * @param {ASTNode} [rangeEnd] - Akhir range (hanya untuk `kind: 'rentang'`)
 * @returns {Object}} Node UlangiStatement
 */
function buatUlangiStatement(iteratorName, source, body, kind, loc, docstring, rangeEnd) {
  const node = {
    type: 'UlangiStatement',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    iteratorName: iteratorName,
    source: source,
    body: body,
    kind: kind,
  };
  if (rangeEnd !== undefined && rangeEnd !== null) node.rangeEnd = rangeEnd;
  return node;
}

/**
 * Membuat node `SelamaStatement` (keyword `Selama` / while).
 *
 * @param {ASTNode} condition - Ekspresi kondisi loop
 * @param {ASTNode} body - Body loop (BlockStatement)
 * @param {SourceLocation} [loc] - Lokasi statement
 * @param {ASTNode} [docstring] - Docstring yang menempel (opsional)
 * @returns {Object}} Node SelamaStatement
 */
function buatSelamaStatement(condition, body, loc, docstring) {
  return {
    type: 'SelamaStatement',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    condition: condition,
    body: body,
  };
}

/**
 * Membuat node `BerhentiStatement` (keyword `Berhenti` / break).
 *
 * @param {SourceLocation} [loc] - Lokasi statement
 * @returns {Object}} Node BerhentiStatement
 */
function buatBerhentiStatement(loc) {
  return { type: 'BerhentiStatement', loc: ensureLoc(loc) };
}

/**
 * Membuat node `LewatiStatement` (keyword `lewati` / continue / pass).
 *
 * @param {SourceLocation} [loc] - Lokasi statement
 * @returns {Object}} Node LewatiStatement
 */
function buatLewatiStatement(loc) {
  return { type: 'LewatiStatement', loc: ensureLoc(loc) };
}

/**
 * Membuat node `KembalikanStatement` (keyword `Kembalikan` / return).
 *
 * @param {SourceLocation} [loc] - Lokasi statement
 * @param {ASTNode} [value] - Ekspresi nilai return (opsional untuk bare `return`)
 * @returns {Object}} Node KembalikanStatement
 */
function buatKembalikanStatement(loc, value) {
  const node = { type: 'KembalikanStatement', loc: ensureLoc(loc) };
  if (value) node.value = value;
  return node;
}

/**
 * Membuat node `SimpanStatement` (keyword `Simpan` / save).
 *
 * Menyimpan nilai ke variabel/property reaktif.
 *
 * @param {ASTNode} value - Nilai yang akan disimpan
 * @param {ASTNode} target - Target penyimpanan (Identifier atau MemberExpression)
 * @param {string} kind - Jenis simpan ('simpan' / 'set', 'tambah' / '+=', dll.)
 * @param {SourceLocation} [loc] - Lokasi statement
 * @param {ASTNode} [docstring] - Docstring yang menempel (opsional)
 * @returns {Object}} Node SimpanStatement
 */
function buatSimpanStatement(value, target, kind, loc, docstring) {
  return {
    type: 'SimpanStatement',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    value: value,
    target: target,
    kind: kind,
  };
}

/**
 * Membuat node `TambahkanStatement` (keyword `Tambahkan` / append).
 *
 * @param {ASTNode} value - Nilai yang akan ditambahkan
 * @param {ASTNode} target - Target (biasanya array atau element)
 * @param {SourceLocation} [loc] - Lokasi statement
 * @param {ASTNode} [docstring] - Docstring yang menempel (opsional)
 * @returns {Object}} Node TambahkanStatement
 */
function buatTambahkanStatement(value, target, loc, docstring) {
  return {
    type: 'TambahkanStatement',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    value: value,
    target: target,
  };
}

/**
 * Membuat node `KurangiStatement` (keyword `Kurangi` / remove/decrement).
 *
 * @param {ASTNode} target - Target pengurangan
 * @param {SourceLocation} [loc] - Lokasi statement
 * @param {ASTNode} [docstring] - Docstring yang menempel (opsional)
 * @param {ASTNode} [value] - Nilai yang dikurangkan (opsional, default 1)
 * @returns {Object}} Node KurangiStatement
 */
function buatKurangiStatement(target, loc, docstring, value) {
  const node = {
    type: 'KurangiStatement',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    target: target,
  };
  if (value) node.value = value;
  return node;
}

/**
 * Membuat node `SisipkanStatement` (keyword `Sisipkan` / insert).
 *
 * @param {ASTNode} value - Nilai yang akan disisipkan
 * @param {ASTNode} target - Target penyisipan
 * @param {SourceLocation} [loc] - Lokasi statement
 * @param {ASTNode} [docstring] - Docstring yang menempel (opsional)
 * @returns {Object}} Node SisipkanStatement
 */
function buatSisipkanStatement(value, target, loc, docstring) {
  return {
    type: 'SisipkanStatement',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    value: value,
    target: target,
  };
}

/**
 * Membuat node `AmbilDomStatement` (keyword `Ambil` dari DOM).
 *
 * Mengambil nilai dari elemen DOM (mis. isi input, atribut).
 *
 * @param {string} kind - Jenis ambil ('nilai'/'value', 'atribut'/'attribute', 'teks'/'text')
 * @param {ASTNode} source - Sumber elemen DOM
 * @param {string} target - Nama variabel target penyimpanan
 * @param {SourceLocation} [loc] - Lokasi statement
 * @param {ASTNode} [docstring] - Docstring yang menempel (opsional)
 * @param {string} [attributeName] - Nama atribut (hanya untuk `kind: 'atribut'`)
 * @returns {Object}} Node AmbilDomStatement
 */
function buatAmbilDomStatement(kind, source, target, loc, docstring, attributeName) {
  const node = {
    type: 'AmbilDomStatement',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    kind: kind,
    source: source,
    target: target,
  };
  if (attributeName) node.attributeName = attributeName;
  return node;
}

/**
 * Membuat node `AmbilLuarStatement` (keyword `Ambil` dari URL eksternal / fetch).
 *
 * @param {ASTNode} url - URL eksternal (string literal atau ekspresi)
 * @param {ASTNode[]} branches - Daftar FetchBranch (sukses, error, dll.)
 * @param {SourceLocation} [loc] - Lokasi statement
 * @param {ASTNode} [docstring] - Docstring yang menempel (opsional)
 * @param {ASTNode[]} [options] - Daftar FetchOption (method, headers, body, dll.)
 * @returns {Object}} Node AmbilLuarStatement
 */
function buatAmbilLuarStatement(url, branches, loc, docstring, options) {
  const node = {
    type: 'AmbilLuarStatement',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    url: url,
    branches: branches || [],
  };
  if (options && options.length > 0) node.options = options;
  return node;
}

/**
 * Membuat node `GunakanStatement` (keyword `Gunakan` / use — instantiate component).
 *
 * Catatan: `props` boleh berupa PropertyNode AST atau plain object `{key, value}`
 * karena parser membangun props inline. Anotasi `any[]` merefleksikan hal ini.
 *
 * @param {string} componentName - Nama komponen (PascalCase)
 * @param {SourceLocation} [loc] - Lokasi statement
 * @param {Object} [docstring] - Docstring yang menempel (opsional)
 * @param {any[]} [props] - Daftar properti named (PropertyNode atau `{key, value}` plain object)
 * @param {Object} [mountTarget] - Target mount opsional
 * @returns {Object} Node GunakanStatement
 */
function buatGunakanStatement(componentName, loc, docstring, props, mountTarget) {
  const node = {
    type: 'GunakanStatement',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    componentName: componentName,
  };
  if (props && props.length > 0) node.props = props;
  if (mountTarget) node.mountTarget = mountTarget;
  return node;
}

/**
 * Membuat node `ArahkanStatement` (keyword `Arahkan` / navigate — router redirect).
 *
 * @param {ASTNode} url - URL tujuan
 * @param {SourceLocation} [loc] - Lokasi statement
 * @param {ASTNode} [docstring] - Docstring yang menempel (opsional)
 * @returns {Object}} Node ArahkanStatement
 */
function buatArahkanStatement(url, loc, docstring) {
  return {
    type: 'ArahkanStatement',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    url: url,
  };
}

/**
 * Membuat node `MuatUlangStatement` (keyword `MuatUlang` / reload).
 *
 * @param {SourceLocation} [loc] - Lokasi statement
 * @returns {Object}} Node MuatUlangStatement
 */
function buatMuatUlangStatement(loc) {
  return { type: 'MuatUlangStatement', loc: ensureLoc(loc) };
}

/**
 * Membuat node `KembaliStatement` (keyword `Kembali` / back — browser history back).
 *
 * @param {SourceLocation} [loc] - Lokasi statement
 * @returns {Object}} Node KembaliStatement
 */
function buatKembaliStatement(loc) {
  return { type: 'KembaliStatement', loc: ensureLoc(loc) };
}

/**
 * Membuat node `LangsungBlock` (keyword `Langsung:` / raw JS passthrough).
 *
 * Konten `content` adalah string JavaScript mentah yang akan di-emit apa adanya
 * ke output compiler — tanpa transformasi apa pun.
 *
 * @param {string} content - Kode JavaScript mentah
 * @param {SourceLocation} [loc] - Lokasi blok
 * @returns {Object} & { type: 'LangsungBlock', content: string }} Node LangsungBlock
 */
function buatLangsungBlock(content, loc) {
  return {
    type: 'LangsungBlock',
    loc: ensureLoc(loc),
    content: content,
  };
}

/**
 * Membuat node `JalankanExpression` (keyword `Jalankan` / run — call PromptJS-defined fungsi).
 *
 * @param {ASTNode} callee - Identifier fungsi yang dipanggil
 * @param {string} kind - Jenis pemanggilan ('jalankan' / 'run', 'mulai' / 'start', dll.)
 * @param {SourceLocation} [loc] - Lokasi ekspresi
 * @param {ASTNode} [docstring] - Docstring yang menempel (opsional)
 * @param {ASTNode[]} [arguments_] - Daftar argumen posisional (opsional)
 * @param {ASTNode[]} [withArgs] - Daftar argumen named via `dengan` (opsional)
 * @returns {Object}} Node JalankanExpression
 */
function buatJalankanExpression(callee, kind, loc, docstring, arguments_, withArgs) {
  const node = {
    type: 'JalankanExpression',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    callee: callee,
    kind: kind,
  };
  if (arguments_ && arguments_.length > 0) node.arguments = arguments_;
  if (withArgs && withArgs.length > 0) node.withArgs = withArgs;
  return node;
}

/**
 * Membuat node `PanggilNativeExpression` — panggil JS native function (mis. `Math.max`).
 *
 * @param {ASTNode} callee - Identifier atau MemberExpression fungsi native
 * @param {ASTNode[]} arguments_ - Daftar argumen
 * @param {SourceLocation} [loc] - Lokasi ekspresi
 * @param {ASTNode} [docstring] - Docstring yang menempel (opsional)
 * @returns {Object}} Node PanggilNativeExpression
 */
function buatPanggilNativeExpression(callee, arguments_, loc, docstring) {
  return {
    type: 'PanggilNativeExpression',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    callee: callee,
    arguments: arguments_ || [],
  };
}

/**
 * Membuat node `RantaiAksi` — rantai aksi `aksi1 -> aksi2 -> aksi3`.
 *
 * @param {ASTNode} first - Aksi pertama
 * @param {ASTNode[]} chain - Daftar aksi berikutnya
 * @param {SourceLocation} [loc] - Lokasi rantai
 * @returns {Object}} Node RantaiAksi
 */
function buatRantaiAksi(first, chain, loc) {
  return {
    type: 'RantaiAksi',
    loc: ensureLoc(loc),
    first: first,
    chain: chain,
  };
}

// ─── Expression Nodes ──────────────────────────────────────

/**
 * Membuat node `Literal` — nilai literal (angka, string, boolean, null).
 *
 * @param {*} value - Nilai literal (number, string, boolean, null)
 * @param {string} kind - Jenis literal ('angka'/'number', 'teks'/'string', 'boolean', 'null')
 * @param {SourceLocation} [loc] - Lokasi literal
 * @returns {Object} & { type: 'Literal', value: *, kind: string }} Node Literal
 */
function buatLiteral(value, kind, loc) {
  return {
    type: 'Literal',
    loc: ensureLoc(loc),
    value: value,
    kind: kind,
  };
}

/**
 * Membuat node `Identifier` — referensi ke nama variabel/properti.
 *
 * @param {string} name - Nama identifier
 * @param {SourceLocation} [loc] - Lokasi identifier
 * @returns {Object} & { type: 'Identifier', name: string }} Node Identifier
 */
function buatIdentifier(name, loc) {
  return {
    type: 'Identifier',
    loc: ensureLoc(loc),
    name: name,
  };
}

/**
 * Membuat node `BinaryExpression` — operasi biner (mis. `a + b`, `x > 5`, `nama dan aktif`).
 *
 * @param {string} operator - Operator ('+', '-', '*', '>', 'dan'/'&&', dll.)
 * @param {ASTNode} left - Operan kiri
 * @param {ASTNode} right - Operan kanan
 * @param {SourceLocation} [loc] - Lokasi ekspresi
 * @returns {Object} & { type: 'BinaryExpression', operator: string, left: ASTNode, right: ASTNode }} Node BinaryExpression
 */
function buatBinaryExpression(operator, left, right, loc) {
  return {
    type: 'BinaryExpression',
    loc: ensureLoc(loc),
    operator: operator,
    left: left,
    right: right,
  };
}

/**
 * Membuat node `UnaryExpression` — operasi uner (mis. `-x`, `tidak aktif`).
 *
 * @param {string} operator - Operator ('-', '!', 'tidak'/'not')
 * @param {ASTNode} operand - Operan
 * @param {SourceLocation} [loc] - Lokasi ekspresi
 * @param {boolean} [prefix=true] - Apakah operator prefix (default true)
 * @returns {Object} & { type: 'UnaryExpression', operator: string, operand: ASTNode, prefix: boolean }} Node UnaryExpression
 */
function buatUnaryExpression(operator, operand, loc, prefix) {
  return {
    type: 'UnaryExpression',
    loc: ensureLoc(loc),
    operator: operator,
    operand: operand,
    prefix: prefix !== false,
  };
}

/**
 * Membuat node `ConditionalExpression` — ternary `test ? consequent : alternate`.
 *
 * @param {ASTNode} test - Ekspresi kondisi
 * @param {ASTNode} consequent - Cabang jika true
 * @param {ASTNode} alternate - Cabang jika false
 * @param {SourceLocation} [loc] - Lokasi ekspresi
 * @returns {Object} & { type: 'ConditionalExpression', test: ASTNode, consequent: ASTNode, alternate: ASTNode }} Node ConditionalExpression
 */
function buatConditionalExpression(test, consequent, alternate, loc) {
  return {
    type: 'ConditionalExpression',
    loc: ensureLoc(loc),
    test: test,
    consequent: consequent,
    alternate: alternate,
  };
}

/**
 * Membuat node `MemberExpression` — akses properti (mis. `item.nama`, `arr[0]`).
 *
 * @param {ASTNode} object - Objek owner
 * @param {ASTNode} property - Properti yang diakses (Identifier atau Literal)
 * @param {SourceLocation} [loc] - Lokasi ekspresi
 * @returns {Object} & { type: 'MemberExpression', object: ASTNode, property: ASTNode }} Node MemberExpression
 */
function buatMemberExpression(object, property, loc) {
  return {
    type: 'MemberExpression',
    loc: ensureLoc(loc),
    object: object,
    property: property,
  };
}

/**
 * Membuat node `CallExpression` — pemanggilan fungsi (mis. `hitungTotal(a, b)`).
 *
 * @param {ASTNode} callee - Fungsi yang dipanggil (Identifier atau MemberExpression)
 * @param {ASTNode[]} arguments_ - Daftar argumen
 * @param {SourceLocation} [loc] - Lokasi ekspresi
 * @returns {Object} & { type: 'CallExpression', callee: ASTNode, arguments: ASTNode[] }} Node CallExpression
 */
function buatCallExpression(callee, arguments_, loc) {
  return {
    type: 'CallExpression',
    loc: ensureLoc(loc),
    callee: callee,
    arguments: arguments_ || [],
  };
}

/**
 * Membuat node `ObjectLiteral` — literal objek `{ kunci: nilai, ... }`.
 *
 * @param {ASTNode[]} properties - Daftar PropertyNode
 * @param {SourceLocation} [loc] - Lokasi literal
 * @returns {Object} & { type: 'ObjectLiteral', properties: ASTNode[] }} Node ObjectLiteral
 */
function buatObjectLiteral(properties, loc) {
  return {
    type: 'ObjectLiteral',
    loc: ensureLoc(loc),
    properties: properties || [],
  };
}

/**
 * Membuat node `ArrayLiteral` — literal array `[a, b, c]`.
 *
 * @param {ASTNode[]} elements - Daftar elemen
 * @param {SourceLocation} [loc] - Lokasi literal
 * @returns {Object} & { type: 'ArrayLiteral', elements: ASTNode[] }} Node ArrayLiteral
 */
function buatArrayLiteral(elements, loc) {
  return {
    type: 'ArrayLiteral',
    loc: ensureLoc(loc),
    elements: elements || [],
  };
}

// ─── UI & Selector Nodes ───────────────────────────────────

/**
 * Membuat node `Selector` — selector CSS-style untuk `Buat` (mis. `tombol.cta#daftar`).
 *
 * @param {string} tag - Nama tag (mis. 'tombol', 'div', 'h1')
 * @param {SourceLocation} [loc] - Lokasi selector
 * @param {string} [id] - ID element (mis. 'daftar') — opsional
 * @param {string[]} [classes] - Daftar class CSS — opsional
 * @param {ASTNode[]} [attributes] - Daftar AttributeNode — opsional
 * @returns {Object} & { type: 'Selector', tag: string, id?: string, classes: string[], attributes: ASTNode[] }} Node Selector
 */
function buatSelector(tag, loc, id, classes, attributes) {
  return {
    type: 'Selector',
    loc: ensureLoc(loc),
    tag: tag,
    id: id || undefined,
    classes: classes || [],
    attributes: attributes || [],
  };
}

/**
 * Membuat node `PropertyNode` — pasangan `key: value` di ObjectLiteral.
 *
 * @param {string} key - Nama properti
 * @param {ASTNode} value - Nilai properti
 * @param {SourceLocation} [loc] - Lokasi property
 * @param {boolean} [shorthand=false] - Apakah shorthand (mis. `{ nama }` → `{ nama: nama }`)
 * @returns {Object} & { type: 'PropertyNode', key: string, value: ASTNode, shorthand: boolean }} Node PropertyNode
 */
function buatPropertyNode(key, value, loc, shorthand) {
  return {
    type: 'PropertyNode',
    loc: ensureLoc(loc),
    key: key,
    value: value,
    shorthand: !!shorthand,
  };
}

/**
 * Membuat node `AttributeNode` — pasangan `key = value` di BuatStatement.
 *
 * @param {string} key - Nama atribut (mis. 'src', 'href', 'kelas')
 * @param {ASTNode} value - Nilai atribut
 * @param {SourceLocation} [loc] - Lokasi attribute
 * @returns {Object} & { type: 'AttributeNode', key: string, value: ASTNode }} Node AttributeNode
 */
function buatAttributeNode(key, value, loc) {
  return {
    type: 'AttributeNode',
    loc: ensureLoc(loc),
    key: key,
    value: value,
  };
}

// ─── Special Nodes ─────────────────────────────────────────

/**
 * Membuat node `ErrorNode` — placeholder untuk sub-tree yang gagal di-parse.
 *
 * Parser menghasilkan ErrorNode alih-alih melempar exception, sehingga
 * parsing bisa lanjut dan melaporkan multiple errors dalam satu pass.
 * Field `code`/`kode` dan `message`/`pesan` disediakan dalam alias EN/ID
 * untuk kompatibilitas lintas konsumen.
 *
 * @param {string} code - Kode error (mis. 'E2001')
 * @param {string} message - Pesan error
 * @param {SourceLocation} [loc] - Lokasi error
 * @param {Token} [originalToken] - Token yang memicu error (opsional, untuk debugging)
 * @returns {Object} & { type: 'ErrorNode', code: string, kode: string, message: string, pesan: string, originalToken?: Token }} Node ErrorNode
 */
function buatErrorNode(code, message, loc, originalToken) {
  const node = {
    type: 'ErrorNode',
    loc: ensureLoc(loc),
    code: code,
    kode: code,
    message: message,
    pesan: message,
  };
  if (originalToken) node.originalToken = originalToken;
  return node;
}

// ─── Shared Types ──────────────────────────────────────────

/**
 * Membuat node `Parameter` — parameter fungsi/komponen.
 *
 * @param {string} name - Nama parameter
 * @param {SourceLocation} [loc] - Lokasi parameter
 * @param {string} [typeHint] - Type hint opsional (mis. 'teks', 'angka')
 * @param {ASTNode} [defaultValue] - Ekspresi default value (opsional)
 * @returns {Object} & { type: 'Parameter', name: string, typeHint?: string, defaultValue?: ASTNode }} Node Parameter
 */
function buatParameter(name, loc, typeHint, defaultValue) {
  const param = {
    type: 'Parameter',
    loc: ensureLoc(loc),
    name: name,
  };
  if (typeHint) param.typeHint = typeHint;
  if (defaultValue) param.defaultValue = defaultValue;
  return param;
}

/**
 * Membuat node `FetchBranch` — cabang sukses/error pada `AmbilLuarStatement`.
 *
 * @param {string} kind - Jenis cabang ('sukses'/'success', 'error', 'selesai'/'finally')
 * @param {ASTNode} action - Aksi yang dijalankan (BlockStatement atau expression)
 * @param {SourceLocation} [loc] - Lokasi cabang
 * @returns {Object} & { type: 'FetchBranch', kind: string, action: ASTNode }} Node FetchBranch
 */
function buatFetchBranch(kind, action, loc) {
  return {
    type: 'FetchBranch',
    loc: ensureLoc(loc),
    kind: kind,
    action: action,
  };
}

/**
 * Membuat node `FetchOption` — opsi HTTP pada `AmbilLuarStatement` (method, headers, body).
 *
 * @param {string} key - Nama opsi (mis. 'method', 'headers', 'body')
 * @param {ASTNode} value - Nilai opsi
 * @param {SourceLocation} [loc] - Lokasi opsi
 * @returns {Object} & { type: 'FetchOption', key: string, value: ASTNode }} Node FetchOption
 */
function buatFetchOption(key, value, loc) {
  return {
    type: 'FetchOption',
    key: key,
    value: value,
    loc: ensureLoc(loc),
  };
}

module.exports = {
  UNKNOWN_LOC: UNKNOWN_LOC,
  ensureLoc: ensureLoc,
  buatLoc: buatLoc,
  locFromTokens: locFromTokens,
  gabungLoc: gabungLoc,
  buatProgramNode: buatProgramNode,
  buatDataDeclaration: buatDataDeclaration,
  buatTetapDeclaration: buatTetapDeclaration,
  buatUbahDeclaration: buatUbahDeclaration,
  buatTurunanDeclaration: buatTurunanDeclaration,
  buatKomponenDeclaration: buatKomponenDeclaration,
  buatFungsiDeclaration: buatFungsiDeclaration,
  buatBlockStatement: buatBlockStatement,
  buatBuatStatement: buatBuatStatement,
  buatTampilkanStatement: buatTampilkanStatement,
  buatSembunyikanStatement: buatSembunyikanStatement,
  buatHapusStatement: buatHapusStatement,
  buatHapusDariStatement: buatHapusDariStatement,
  buatKosongkanStatement: buatKosongkanStatement,
  buatPerbaruiStatement: buatPerbaruiStatement,
  buatKetikaStatement: buatKetikaStatement,
  buatSaatStatement: buatSaatStatement,
  buatLifecycleStatement: buatLifecycleStatement,
  buatSetelahStatement: buatSetelahStatement,
  buatJikaStatement: buatJikaStatement,
  buatUlangiStatement: buatUlangiStatement,
  buatSelamaStatement: buatSelamaStatement,
  buatBerhentiStatement: buatBerhentiStatement,
  buatLewatiStatement: buatLewatiStatement,
  buatKembalikanStatement: buatKembalikanStatement,
  buatSimpanStatement: buatSimpanStatement,
  buatTambahkanStatement: buatTambahkanStatement,
  buatKurangiStatement: buatKurangiStatement,
  buatSisipkanStatement: buatSisipkanStatement,
  buatAmbilDomStatement: buatAmbilDomStatement,
  buatAmbilLuarStatement: buatAmbilLuarStatement,
  buatGunakanStatement: buatGunakanStatement,
  buatArahkanStatement: buatArahkanStatement,
  buatMuatUlangStatement: buatMuatUlangStatement,
  buatKembaliStatement: buatKembaliStatement,
  buatLangsungBlock: buatLangsungBlock,
  buatJalankanExpression: buatJalankanExpression,
  buatPanggilNativeExpression: buatPanggilNativeExpression,
  buatRantaiAksi: buatRantaiAksi,
  buatLiteral: buatLiteral,
  buatIdentifier: buatIdentifier,
  buatBinaryExpression: buatBinaryExpression,
  buatUnaryExpression: buatUnaryExpression,
  buatConditionalExpression: buatConditionalExpression,
  buatMemberExpression: buatMemberExpression,
  buatCallExpression: buatCallExpression,
  buatObjectLiteral: buatObjectLiteral,
  buatArrayLiteral: buatArrayLiteral,
  buatSelector: buatSelector,
  buatPropertyNode: buatPropertyNode,
  buatAttributeNode: buatAttributeNode,
  buatErrorNode: buatErrorNode,
  buatParameter: buatParameter,
  buatFetchBranch: buatFetchBranch,
  buatFetchOption: buatFetchOption,
};
