/**
 * Fetch auto-state tracking mixin.
 *
 * _markFetchAutoStateUsed — marks auto-state symbols (target, target_memuat,
 * target_galat) as used (read + write) to prevent W4101/W4102/W4103 false
 * positives for implicit state managed by the emitter.
 */

const fetchAutoState = {
  /**
   * [BUG-3 FIX] Tandai simbol auto-state fetch sebagai dipakai (read + write)
   * agar tidak memicu W4101/W4102/W4103 palsu. Simbol yang tidak dideklarasikan
   * diabaikan diam-diam — emitter sudah men-guard setiap tulisan dengan
   * `typeof ... !== "undefined"`, jadi flag opsional yang tidak ada bukan error.
   *
   * @param {string} name - Nama simbol (mis. `hasil`, `hasil_memuat`, `hasil_galat`)
   * @param {Object} node - AST node fetch untuk referensi
   */
  _markFetchAutoStateUsed: function (name, node) {
    if (!name) return;
    const symbol = this.currentScope.lookup(name);
    if (symbol) {
      symbol.writeCount++;
      symbol.readCount++;
      symbol.references.push(node);
    }
  },
};

module.exports = fetchAutoState;
