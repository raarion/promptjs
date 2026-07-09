/**
 * Global hoisting mixin.
 *
 * gatherGlobals — pre-scan top-level AST untuk mengumpulkan deklarasi global
 * sebelum traverse dimulai, sehingga forward reference tetap valid.
 */

const gatherGlobals = {
  /**
   * Pre-scan top-level AST untuk mengumpulkan deklarasi global.
   *
   * @param {Object} ast - Root AST node
   */
  gatherGlobals: function (ast) {
    if (!ast.body) return;
    const kindMap = {
      DataDeclaration: 'data',
      TetapDeclaration: 'tetap',
      UbahDeclaration: 'ubah',
      TurunanDeclaration: 'turunan',
      FungsiDeclaration: 'fungsi',
      KomponenDeclaration: 'komponen',
    };
    const kindMeta = {
      data: { isReactive: true, isWritable: true },
      tetap: { isWritable: false },
      ubah: { isWritable: true },
      turunan: { isReactive: true, isWritable: false },
      fungsi: { isWritable: false },
      komponen: { isWritable: false },
    };

    ast.body.forEach((node) => {
      const kind = kindMap[node.type];
      if (kind) {
        const meta = { ...kindMeta[kind] };
        if (node.type === 'TetapDeclaration' && node._isExternal) {
          meta.isExternal = true;
        }
        this.addSymbol(node.name, kind, node, meta);
      }
    });
  },
};

module.exports = gatherGlobals;
