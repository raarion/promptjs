// @ts-check

/**
 * PromptJS v0.2 — Visitor Pattern / Pola Visitor
 * ============================================================================
 *
 * Implements the visitor pattern for AST traversal.
 * Implementasi pola visitor untuk traversing AST PromptJS.
 *
 * Based on / Berdasarkan: RFC-PARSER-001 §8
 */

/**
 * Lokasi source dalam source code PromptJS.
 *
 * @typedef {Object} SourceLocation
 * @property {{ line: number, column: number }} start - Posisi awal / Start position (1-indexed line, 0-indexed column)
 * @property {{ line: number, column: number }} end - Posisi akhir / End position
 * @property {string} [source] - Nama file source / Source filename (opsional, hanya ada di node Program)
 */

/**
 * Node AST generik. Setiap node memiliki properti `type` string; properti
 * lainnya bergantung pada jenis node (lihat `getChildKeys` untuk daftar
 * properti anak yang dapat di-traverse).
 *
 * @typedef {Object} ASTNode
 * @property {string} type - Jenis node / Node type (mis. 'Program', 'BuatStatement', 'Identifier')
 * @property {SourceLocation} [loc] - Lokasi source / Source location (opsional pada node sintetis)
 */

/**
 * Objek visitor. Kontrak:
 * - Untuk setiap AST node type T, visitor boleh mendefinisikan metode
 *   `visit<T>(node)` yang dipanggil saat node T dikunjungi (mis. `visitProgram`,
 *   `visitBuatStatement`). Daftar lengkap tipe yang didukung: lihat `nodeTypes`.
 * - Jika metode `visit<T>` tidak ada, dispatch fallback ke `genericVisit`.
 *
 * Type ini sengaja longgar (`any`) karena dispatch `visit<NodeType>` bersifat
 * dinamis berdasarkan string concatenation (`'visit' + node.type`). Type system
 * tidak dapat menyatakan union dari 50+ nama metode yang mungkin secara efisien;
 * validasi runtime (`typeof visitor[methodName] === 'function'`) adalah
 * sumber kebenaran sebenarnya.
 *
 * @typedef {Object} Visitor
 * @property {(node: ASTNode) => any} [genericVisit] - Default handler bila `visit<NodeType>` tidak didefinisikan
 * @property {(node: ASTNode) => any} [visitProgram] - Handler untuk node Program
 * @property {(node: ASTNode) => any} [visitBuatStatement] - Handler untuk BuatStatement
 * @property {(node: ASTNode) => any} [visitJikaStatement] - Handler untuk JikaStatement
 * @property {(node: ASTNode) => any} [visitUlangiStatement] - Handler untuk UlangiStatement
 * @property {(node: ASTNode) => any} [visitKetikaStatement] - Handler untuk KetikaStatement
 * @property {(node: ASTNode) => any} [visitBinaryExpression] - Handler untuk BinaryExpression
 * @property {(node: ASTNode) => any} [visitCallExpression] - Handler untuk CallExpression
 * @property {(node: ASTNode) => any} [visitIdentifier] - Handler untuk Identifier
 * @property {(node: ASTNode) => any} [visitLiteral] - Handler untuk Literal
 * @property {(node: ASTNode) => any} [visitMemberExpression] - Handler untuk MemberExpression
 */

/**
 * Dispatch otomatis ke metode `visit*` yang sesuai berdasarkan `node.type`.
 *
 * Algoritma:
 * 1. Jika `node` falsy atau tidak punya `type`, kembalikan `undefined`.
 * 2. Cari metode `visit<NodeType>` pada `visitor`.
 * 3. Jika ada, panggil dan kembalikan hasilnya.
 * 4. Jika tidak, fallback ke `visitor.genericVisit` (jika ada).
 * 5. Jika tidak ada keduanya, kembalikan `undefined`.
 *
 * Catatan: fungsi ini tidak melakukan recursi ke anak node — itu tanggung
 * jawab `genericVisit` (atau handler kustom yang memanggilnya).
 *
 * @param {ASTNode} node - Node AST yang akan dikunjungi
 * @param {Visitor | BaseVisitor | CollectingVisitorInstance} visitor - Objek visitor dengan metode `visit*`
 * @returns {any} Hasil dari metode visit, atau `undefined` jika tidak ada handler
 */
function accept(node, visitor) {
  if (!node || !node.type) return undefined;

  const methodName = 'visit' + node.type;

  if (typeof visitor[methodName] === 'function') {
    return visitor[methodName](node);
  }

  // Fallback: genericVisit
  if (typeof visitor.genericVisit === 'function') {
    return visitor.genericVisit(node);
  }

  return undefined;
}

/**
 * Traverse node dan dispatch ke visitor. Convenience wrapper untuk `accept`
 * — disediakan agar call site membaca "akar traversal" lebih jelas.
 *
 * @param {ASTNode} node - Node AST yang akan di-traverse
 * @param {Visitor | BaseVisitor | CollectingVisitorInstance} visitor - Objek visitor
 * @returns {void}
 */
function traverse(node, visitor) {
  if (!node) return;

  // Hanya dispatch ke metode visit; genericVisit yang menangani traversing anak
  accept(node, visitor);
}

/**
 * Mendapatkan nama properti anak yang dapat di-traverse untuk setiap tipe node.
 *
 * Hanya properti yang dikembalikan oleh fungsi ini yang akan dikunjungi saat
 * traversing depth-first (lihat `BaseVisitor#genericVisit`). Properti skalar
 * (mis. `node.value`, `node.name`) tidak termasuk.
 *
 * @param {string} nodeType - Tipe node AST (mis. 'Program', 'BuatStatement')
 * @returns {string[]} Daftar nama properti yang berisi child node
 */
function getChildKeys(nodeType) {
  switch (nodeType) {
    case 'Program':
      return ['body'];
    case 'BlockStatement':
      return ['body'];
    case 'BuatStatement':
      return ['selector', 'properties', 'docstring', 'body', 'action'];
    case 'TampilkanStatement':
      return ['target', 'mountTarget'];
    case 'SembunyikanStatement':
      return ['target'];
    case 'HapusStatement':
      return ['target'];
    case 'KosongkanStatement':
      return ['target'];
    case 'PerbaruiStatement':
      return ['target', 'value'];
    case 'KetikaStatement':
      return ['target', 'body', 'action'];
    case 'SaatStatement':
      return ['body'];
    case 'LifecycleStatement':
      return ['body'];
    case 'SetelahStatement':
      return ['body', 'action'];
    case 'JikaStatement':
      return ['condition', 'consequent', 'alternate'];
    case 'UlangiStatement':
      return ['source', 'body', 'rangeEnd'];
    case 'SelamaStatement':
      return ['condition', 'body'];
    case 'KembalikanStatement':
      return ['value'];
    case 'SimpanStatement':
      return ['target', 'value'];
    case 'TambahkanStatement':
      return ['target', 'value'];
    case 'KurangiStatement':
      return ['target', 'value'];
    case 'SisipkanStatement':
      return ['target', 'value'];
    case 'AmbilDomStatement':
      return ['source'];
    case 'AmbilLuarStatement':
      return ['url', 'options', 'branches'];
    case 'KomponenDeclaration':
      return ['params', 'body'];
    case 'FungsiDeclaration':
      return ['params', 'body'];
    case 'GunakanStatement':
      return ['props', 'mountTarget'];
    case 'JalankanExpression':
      return ['arguments', 'withArgs'];
    case 'RantaiAksi':
      return ['first', 'chain'];
    case 'BinaryExpression':
      return ['left', 'right'];
    case 'UnaryExpression':
      return ['operand'];
    case 'ConditionalExpression':
      return ['test', 'consequent', 'alternate'];
    case 'MemberExpression':
      return ['object', 'property'];
    case 'CallExpression':
      return ['callee', 'arguments'];
    case 'PanggilNativeExpression':
      return ['callee', 'arguments'];
    case 'ObjectLiteral':
      return ['properties'];
    case 'ArrayLiteral':
      return ['elements'];
    case 'Selector':
      return ['attributes'];
    case 'PropertyNode':
      return ['value'];
    case 'AttributeNode':
      return ['value'];
    case 'Parameter':
      return ['defaultValue'];
    case 'SelfReference':
      return [];
    case 'DataDeclaration':
      return ['init'];
    case 'TetapDeclaration':
      return ['init'];
    case 'UbahDeclaration':
      return ['init'];
    case 'TurunanDeclaration':
      return ['init'];
    case 'ArahkanStatement':
      return ['url'];
    case 'FetchBranch':
      return ['action'];
    case 'FetchOption':
      return ['value'];
    case 'TextNode':
      return []; // PromptJS: no child keys, value is a string
    default:
      return [];
  }
}

/**
 * BaseVisitor: implementasi default yang melakukan traversing depth-first.
 *
 * Subclass dapat meng-extend ini (via `Object.create(BaseVisitor.prototype)`)
 * dan meng-override metode `visit<NodeType>` tertentu untuk menambahkan logika
 * kustom. Handler override dapat memanggil `this.genericVisit(node)` untuk
 * melanjutkan traversing ke anak node.
 *
 * @constructor
 */
function BaseVisitor() {}

/**
 * Traverse semua anak node secara depth-first.
 *
 * Untuk setiap key yang dikembalikan oleh `getChildKeys(node.type)`:
 * - Jika anak adalah array, traverse setiap element yang merupakan AST node.
 * - Jika anak adalah AST node langsung, traverse node tersebut.
 * - Jika anak adalah container object (mis. `docstring: { teks: <ASTNode> }`),
 *   traverse setiap value yang merupakan AST node.
 *
 * @param {ASTNode} node - Node AST yang anaknya akan di-traverse
 * @returns {void}
 */
BaseVisitor.prototype.genericVisit = function (node) {
  const childKeys = getChildKeys(node.type);
  for (let i = 0; i < childKeys.length; i++) {
    const key = childKeys[i];
    const child = node[key];
    if (Array.isArray(child)) {
      for (let j = 0; j < child.length; j++) {
        if (child[j] && typeof child[j] === 'object' && child[j].type) {
          accept(child[j], this);
        }
      }
    } else if (child && typeof child === 'object' && child.type) {
      // Direct AST child node
      accept(child, this);
    } else if (child && typeof child === 'object' && !child.type) {
      // Container object (e.g. docstring: { teks: <AST node> })
      // Traverse its values to find AST child nodes
      for (const subKey in child) {
        if (Object.prototype.hasOwnProperty.call(child, subKey)) {
          const subChild = child[subKey];
          if (subChild && typeof subChild === 'object' && subChild.type) {
            accept(subChild, this);
          }
        }
      }
    }
  }
};

/**
 * Daftar semua tipe node AST yang dikenal oleh visitor. Setiap entry akan
 * menghasilkan metode `visit<Type>` di `BaseVisitor.prototype` yang
 * mendelegasikan ke `genericVisit`.
 *
 * @type {string[]}
 */
const nodeTypes = [
  'Program',
  'BlockStatement',
  'DataDeclaration',
  'TetapDeclaration',
  'UbahDeclaration',
  'TurunanDeclaration',
  'KomponenDeclaration',
  'FungsiDeclaration',
  'BuatStatement',
  'TampilkanStatement',
  'SembunyikanStatement',
  'HapusStatement',
  'KosongkanStatement',
  'PerbaruiStatement',
  'KetikaStatement',
  'SaatStatement',
  'LifecycleStatement',
  'SetelahStatement',
  'JikaStatement',
  'UlangiStatement',
  'SelamaStatement',
  'BerhentiStatement',
  'LewatiStatement',
  'KembalikanStatement',
  'SimpanStatement',
  'TambahkanStatement',
  'KurangiStatement',
  'SisipkanStatement',
  'AmbilDomStatement',
  'AmbilLuarStatement',
  'GunakanStatement',
  'ArahkanStatement',
  'MuatUlangStatement',
  'KembaliStatement',
  'LangsungBlock',
  'JalankanExpression',
  'PanggilNativeExpression',
  'RantaiAksi',
  'Literal',
  'Identifier',
  'BinaryExpression',
  'UnaryExpression',
  'ConditionalExpression',
  'MemberExpression',
  'CallExpression',
  'ObjectLiteral',
  'ArrayLiteral',
  'Selector',
  'PropertyNode',
  'AttributeNode',
  'Parameter',
  'TextNode',
  'FetchBranch',
  'FetchOption',
  'SelfReference',
  'ErrorNode',
];

nodeTypes.forEach(function (type) {
  BaseVisitor.prototype['visit' + type] = function (node) {
    return this.genericVisit(node);
  };
});

/**
 * @typedef {Object} CollectingVisitorInstance
 * @property {string} targetType - Tipe node yang akan dikumpulkan
 * @property {ASTNode[]} results - Hasil pengumpulan node (terisi selama traversal)
 * @property {(node: ASTNode) => void} genericVisit - Override untuk mengumpulkan node bertipe `targetType`
 */

/**
 * CollectingVisitor: visitor yang mengumpulkan semua node bertipe tertentu
 * ke array `this.results`. Traversal tetap dilanjutkan ke anak-anak node
 * yang cocok, sehingga node bertipe sama di dalam juga ikut terkumpul.
 *
 * Dipanggil dengan `new CollectingVisitor(targetType)`. Instance yang dibuat
 * mengikuti typedef {@link CollectingVisitorInstance} di atas.
 *
 * @constructor
 * @param {string} targetType - Tipe node yang akan dikumpulkan (mis. 'Identifier')
 * @this {CollectingVisitorInstance}
 */
function CollectingVisitor(targetType) {
  this.targetType = targetType;
  this.results = [];
}

CollectingVisitor.prototype = Object.create(BaseVisitor.prototype);
CollectingVisitor.prototype.constructor = CollectingVisitor;

/**
 * Override `genericVisit` untuk mengumpulkan node yang bertipe `targetType`
 * ke `this.results`, lalu lanjutkan traversal ke anak-anaknya.
 *
 * @param {ASTNode} node - Node AST yang sedang dikunjungi
 * @returns {void}
 */
CollectingVisitor.prototype.genericVisit = function (node) {
  if (node.type === this.targetType) {
    this.results.push(node);
  }
  // Jangan traverse lagi — BaseVisitor.prototype.genericVisit sudah dipanggil
  // oleh metode visit* yang mewarisi dari BaseVisitor
  const childKeys = getChildKeys(node.type);
  for (let i = 0; i < childKeys.length; i++) {
    const key = childKeys[i];
    const child = node[key];
    if (Array.isArray(child)) {
      for (let j = 0; j < child.length; j++) {
        if (child[j] && typeof child[j] === 'object' && child[j].type) {
          accept(child[j], this);
        }
      }
    } else if (child && typeof child === 'object' && child.type) {
      accept(child, this);
    }
  }
};

/**
 * Format AST menjadi string yang dapat dibaca manusia. Berguna untuk
 * debugging dan snapshot testing.
 *
 * Format per node (contoh):
 * ```
 * Type @line:col (scalarProp1: "val1", scalarProp2: 42)
 *   child1
 *   child2
 * ```
 *
 * @param {ASTNode | null | undefined} node - Node AST yang akan di-format
 * @param {number} [indent=0] - Level indent awal (2 spasi per level)
 * @returns {string} Representasi string AST yang terformat
 */
function formatAST(node, indent) {
  if (!indent) indent = 0;
  if (!node) return 'null';

  let pad = '';
  for (let i = 0; i < indent; i++) pad += '  ';

  if (typeof node !== 'object') return String(node);

  let result = pad + node.type;
  if (node.loc) {
    result += ' @' + node.loc.start.line + ':' + node.loc.start.column;
  }

  const childKeys = getChildKeys(node.type);
  const scalarProps = [];

  // Tampilkan properti skalar
  for (const key in node) {
    if (
      Object.prototype.hasOwnProperty.call(node, key) &&
      key !== 'type' &&
      key !== 'loc' &&
      key !== 'docstring' &&
      childKeys.indexOf(key) === -1 &&
      typeof node[key] !== 'object'
    ) {
      scalarProps.push(key + ': ' + JSON.stringify(node[key]));
    }
  }

  if (scalarProps.length > 0) {
    result += ' (' + scalarProps.join(', ') + ')';
  }

  result += '\n';

  // Tampilkan anak-anak
  for (let c = 0; c < childKeys.length; c++) {
    const ckey = childKeys[c];
    const child = node[ckey];
    if (Array.isArray(child)) {
      for (let j = 0; j < child.length; j++) {
        result += formatAST(child[j], indent + 1);
      }
    } else if (child && typeof child === 'object') {
      result += formatAST(child, indent + 1);
    }
  }

  return result;
}

module.exports = {
  accept: accept,
  traverse: traverse,
  getChildKeys: getChildKeys,
  BaseVisitor: BaseVisitor,
  CollectingVisitor: CollectingVisitor,
  formatAST: formatAST,
  nodeTypes: nodeTypes,
};
