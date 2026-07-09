const Err = require('../../parser/error-codes');

/**
 * Write-tracking mixin.
 *
 * _trackWrite — increment writeCount pada symbol, attach targetSymbol ke node,
 * dan emit E3003 bila menulis ke variabel tetap (const).
 */

const writeTracking = {
  /**
   * Track write ke simbol — increment writeCount dan tambahkan ke references.
   *
   * @param {string} targetName - Nama simbol target
   * @param {Object} node - AST node write
   */
  _trackWrite: function (targetName, node) {
    if (!targetName) return;
    const symbol = this.currentScope.lookup(targetName);
    if (symbol) {
      symbol.writeCount++;
      node.targetSymbol = symbol;

      if (!symbol.isWritable) {
        this.errors.push(
          Err.createError('E3003', node.loc, {
            message: `Variabel tetap "${targetName}" tidak dapat diubah setelah inisialisasi.`,
            suggestion: 'Gunakan "ubah" jika variabel perlu diubah, bukan "tetap".',
          })
        );
      }
    }
  },
};

module.exports = writeTracking;
