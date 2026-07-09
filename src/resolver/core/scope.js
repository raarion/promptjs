/**
 * Constructor Scope — representasi satu scope dalam scope chain.
 *
 * @constructor
 * @param {string} type - Jenis scope ('global','blok','komponen','iterasi','watcher','arrow')
 * @param {Scope | null} parent - Scope parent (null untuk global scope)
 * @this {Scope}
 */
function Scope(type, parent) {
  this.id = 'scope_' + ++Scope._nextId;
  this.type = type;
  this.parent = parent;
  this.symbols = new Map();
}
Scope._nextId = 0;

/**
 * Definisikan simbol dalam scope ini.
 *
 * @param {string} name - Nama simbol
 * @param {import('./symbol').SemanticSymbol} symbol - Objek simbol
 * @returns {void}
 */
Scope.prototype.define = function (name, symbol) {
  this.symbols.set(name, symbol);
};

/**
 * Cari simbol di scope ini atau parent scope (recursive).
 *
 * @param {string} name - Nama simbol yang dicari
 * @returns {import('./symbol').SemanticSymbol | null} Simbol jika ditemukan, null jika tidak
 */
Scope.prototype.lookup = function (name) {
  if (this.symbols.has(name)) return this.symbols.get(name);
  if (this.parent) return this.parent.lookup(name);
  return null;
};

module.exports = { Scope };
