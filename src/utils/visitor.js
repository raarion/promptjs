/**
 * PromptJS v0.2 — Visitor Pattern
 * ============================================================================
 *
 * Implementasi visitor untuk traversing AST PromptJS.
 * Berdasarkan: RFC-PARSER-001 §8
 */

/**
 * Dispatch otomatis ke metode visit yang sesuai berdasarkan node.type.
 *
 * @param {object} node - Node AST
 * @param {object} visitor - Objek visitor dengan metode visit*
 * @returns {*} Hasil dari metode visit
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
 * Melakukan traversing depth-first ke semua anak node.
 *
 * @param {object} node - Node AST
 * @param {object} visitor - Objek visitor
 */
function traverse(node, visitor) {
  if (!node) return;

  // Hanya dispatch ke metode visit; genericVisit yang menangani traversing anak
  accept(node, visitor);
}

/**
 * Mendapatkan nama properti anak untuk setiap tipe node.
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
      return ['value'];
    case 'TambahkanStatement':
      return ['value'];
    case 'KurangiStatement':
      return ['value'];
    case 'SisipkanStatement':
      return ['value'];
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
 * Base Visitor: implementasi default yang melakukan traversing depth-first.
 * Visitor kustom bisa meng-extend ini dan meng-override metode tertentu.
 */
function BaseVisitor() {}

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

// Buat metode visit untuk setiap tipe node yang meneruskan ke genericVisit
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
 * CollectingVisitor: mengumpulkan semua node bertipe tertentu.
 */
function CollectingVisitor(targetType) {
  this.targetType = targetType;
  this.results = [];
}

CollectingVisitor.prototype = Object.create(BaseVisitor.prototype);
CollectingVisitor.prototype.constructor = CollectingVisitor;

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
 * Format AST menjadi string yang bisa dibaca.
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
