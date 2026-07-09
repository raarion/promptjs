/**
 * Constructor SemanticSymbol — representasi simbol dalam symbol table.
 *
 * @constructor
 * @param {string} name - Nama simbol
 * @param {string} kind - Jenis simbol ('data','tetap','ubah','turunan','fungsi','komponen','parameter')
 * @param {Object} node - AST node deklarasi
 * @param {string} scopeType - Tipe scope tempat simbol didefinisikan
 * @param {Object} [metadata] - Metadata tambahan (isReactive, isWritable, id, scopeId, shadowedSymbol)
 * @this {SemanticSymbol}
 */
function SemanticSymbol(name, kind, node, scopeType, metadata = {}) {
  this.name = name;
  this.kind = kind;
  this.id = metadata.id || null;
  this.declarationNode = node;
  this.scope = scopeType;
  this.scopeId = metadata.scopeId || null;

  this.isReactive = metadata.isReactive || false;
  this.isWritable = metadata.isWritable || false;
  this.isComputed = kind === 'turunan';
  this.isParameter = kind === 'parameter';
  this.isComponent = kind === 'komponen';
  this.isFunction = kind === 'fungsi';
  this.isExternal = metadata.isExternal || false;

  this.shadowedSymbol = metadata.shadowedSymbol || null;

  // Usage tracking
  this.references = [];
  this.readCount = 0;
  this.writeCount = 0;
}

module.exports = { SemanticSymbol };
