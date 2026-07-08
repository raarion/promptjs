'use strict';

/**
 * Data mutation emitters: Simpan / Tambahkan / Kurangi / Sisipkan / Hapus / HapusDari / Kosongkan + reactive target check.
 *
 * This module is a behavior-preserving extraction from the former monolithic
 * `src/compiler/emitters/statements.js`. Every visitor is installed onto
 * `PromptJSCompiler.prototype` exactly as before; only the file layout changed.
 */

/**
 * Pasang visitor untuk modul ini ke `PromptJSCompiler.prototype`.
 *
 * @param {Function} PromptJSCompiler - Constructor PromptJSCompiler
 * @param {Function} accept - Fungsi `accept` dari `utils/visitor` (dispatch visitor)
 * @returns {void}
 */
function install(PromptJSCompiler, _accept) {
  PromptJSCompiler.prototype._isTargetReactive = function (node) {
    if (node.targetSymbol) {
      return node.targetSymbol.isReactive === true;
    }
    // Fallback: jika tidak ada metadata resolver, anggap reaktif
    // (lebih aman karena __setState bekerja dengan Proxy)
    return true;
  };

  PromptJSCompiler.prototype.visitSimpanStatement = function (node) {
    // v1.0: Check if target adalah localStorage.x atau sessionStorage.x
    if (
      node.target &&
      node.target.type === 'MemberExpression' &&
      node.target.object &&
      node.target.object.type === 'Identifier'
    ) {
      const objName = node.target.object.name; // localStorage atau sessionStorage
      const propName = node.target.property ? node.target.property.name : null;

      if ((objName === 'localStorage' || objName === 'sessionStorage') && propName) {
        // Emit: localStorage.setItem("propertyName", value)
        const val = this.lowerExpression(node.value);
        this.emit(`${objName}.setItem("${propName}", ${val});`);
        return;
      }
    }

    const tgt = this.resolveTarget(node.target);
    const val = this.lowerExpression(node.value);
    if (this._isTargetReactive(node)) {
      // data/turunan → Proxy, gunakan __setState
      // resolveTarget returns name.value but __setState needs the proxy object itself
      // [BUG-12 FIX] When target is a MemberExpression (e.g. item.aktif inside
      // a loop), the root variable may not be reactive. Check target type to
      // determine the correct tgtName for __setState.
      let tgtName;
      if (node.target && node.target.type === 'Identifier') {
        tgtName = node.target.name;
      } else if (node.target && node.target.type === 'MemberExpression') {
        // For MemberExpression targets on reactive arrays, we need the array
        // proxy name, not the member path. Find the root identifier.
        let root = node.target.object;
        while (root && root.type === 'MemberExpression') {
          root = root.object;
        }
        tgtName = root ? root.name : tgt.split('.')[0];
      } else {
        tgtName = tgt.split('.')[0];
      }
      this.helpers.add('__setState');
      this.emit(`__setState(${tgtName}, ${val});`);
    } else {
      // ubah → plain variable, assignment langsung
      // [BUG-12 FIX] tgt is now correctly resolved for MemberExpression targets
      // (e.g. "item.aktif" instead of "null")
      this.emit(`${tgt} = ${val};`);
    }
  };

  PromptJSCompiler.prototype.visitTambahkanStatement = function (node) {
    const tgt = this.resolveTarget(node.target);
    const val = this.lowerExpression(node.value);
    if (this._isTargetReactive(node)) {
      // [BUG-01 FIX] Register __setState helper — previously missing, causing
      // ReferenceError at runtime when tambahkan was used without simpan.
      this.helpers.add('__setState');

      // Heuristic: if value lowers to a string literal or the target is
      // initialized as an array, treat as array push. Otherwise numeric add.
      // Safer: always emit array-push form when target init was an array.
      const sym = node.targetSymbol;
      const initIsArray =
        sym &&
        sym.declarationNode &&
        sym.declarationNode.init &&
        (sym.declarationNode.init.type === 'ArrayLiteral' ||
          Array.isArray(sym.declarationNode.init.value));
      if (initIsArray) {
        this.emit(
          `${tgt}.value.push(${val}); __setState(${tgt.split('.')[0]}, [...${tgt}.value]);`
        );
      } else {
        // Numeric/string add for reactive scalar. The read side MUST unwrap the
        // reactive Proxy via `.value` (S2-BUG-1c: `${tgt} + ${val}` emitted
        // `hitung + 3` — Proxy coercion → "[object Object]3" at runtime). We are
        // in the reactive branch, so the state variable is `tgt.split('.')[0]`;
        // read it as `<name>.value` to match __setState's write side.
        const stateName = tgt.split('.')[0];
        const readExpr = tgt.endsWith('.value') ? tgt : `${stateName}.value`;
        this.emit(`__setState(${stateName}, ${readExpr} + ${val});`);
      }
    } else {
      // [BUG-06 FIX] Check if target is a numeric ubah variable — previously
      // always emitted .push() which causes TypeError for non-array variables.
      // Heuristic: if the ubah variable is not initialized as an array, emit
      // increment instead of push.
      const sym = node.targetSymbol;
      const initIsArray =
        sym &&
        sym.declarationNode &&
        sym.declarationNode.init &&
        (sym.declarationNode.init.type === 'ArrayLiteral' ||
          Array.isArray(sym.declarationNode.init.value));
      if (initIsArray) {
        this.emit(`${tgt}.push(${val});`);
      } else {
        // Numeric increment for ubah scalar variable
        this.emit(`${tgt} = ${tgt} + ${val};`);
      }
    }
  };

  PromptJSCompiler.prototype.visitKurangiStatement = function (node) {
    const tgtRaw = this.resolveTarget(node.target);
    // Default ke 1 jika tidak ada value (kurangi counter → counter - 1)
    const jumlah = node.value ? this.lowerExpression(node.value) : '1';
    if (this._isTargetReactive(node)) {
      // [BUG-01 FIX] Register __setState helper — previously missing.
      this.helpers.add('__setState');

      // data/turunan → Proxy, akses via .value
      const tgtName = tgtRaw.split('.')[0];
      const valExpr = this.lowerExpression(node.target);
      this.emit(`__setState(${tgtName}, ${valExpr} - ${jumlah});`);
    } else {
      // ubah → plain variable, assignment langsung
      this.emit(`${tgtRaw} = ${tgtRaw} - ${jumlah};`);
    }
  };

  PromptJSCompiler.prototype.visitSisipkanStatement = function (node) {
    const val = this.lowerExpression(node.value);
    const tgt = this.resolveTarget(node.target);
    if (this._isTargetReactive(node)) {
      // [BUG-01 FIX] Register __setState helper — previously missing.
      this.helpers.add('__setState');

      // data/turunan → Proxy, push lalu trigger reaktivitas via spread assignment
      this.emit(`${tgt}.value.push(${val}); __setState(${tgt.split('.')[0]}, [...${tgt}.value]);`);
    } else {
      // ubah → plain array, push langsung
      this.emit(`${tgt}.push(${val});`);
    }
  };

  PromptJSCompiler.prototype.visitHapusStatement = function (node) {
    // v0.9: Check if target adalah localStorage.x atau sessionStorage.x
    if (
      node.target &&
      node.target.type === 'MemberExpression' &&
      node.target.object &&
      node.target.object.type === 'Identifier'
    ) {
      const objName = node.target.object.name; // localStorage atau sessionStorage
      const propName = node.target.property ? node.target.property.name : null;

      if ((objName === 'localStorage' || objName === 'sessionStorage') && propName) {
        // Emit: localStorage.removeItem("propertyName")
        this.emit(`${objName}.removeItem("${propName}");`);
        return;
      }
    }

    // Default behavior: remove DOM element
    const target = this.resolveTarget(node.target);
    this.emit(
      `{ const __el = ${target}; if (__el && __el.parentElement) __el.parentElement.removeChild(__el); };`
    );
  };

  PromptJSCompiler.prototype.visitHapusDariStatement = function (node) {
    const item = this.lowerExpression(node.item);
    const isReactive = node.fromArrayReactive;

    // BUG-07 FIX: Use deep equality for object removal instead of reference equality
    // When removing an object literal like `hapus {id: "1"} dari catatan`,
    // referential equality (`__item !== {id: "1"}`) always returns true,
    // so the filter never removes the matching object.
    const isObjectItem = node.item && node.item.type === 'ObjectLiteral';
    const compareOp = isObjectItem
      ? `!__promptjs_deepEqual(__item, ${item})`
      : `__item !== ${item}`;
    if (isObjectItem) {
      this.helpers.add('__promptjs_deepEqual');
    }

    // Resolve the array expression — prefer resolver-attached name, else lower the expression
    let arr;
    if (node.fromArrayResolved) {
      arr = node.fromArrayResolved;
    } else if (node.fromArray && node.fromArray.type === 'Identifier') {
      arr = this.resolveTarget(node.fromArray);
    } else {
      arr = this.lowerExpression(node.fromArray);
    }

    if (isReactive) {
      // Reactive array: use filter to remove item and trigger Proxy setter
      this.helpers.add('__setState');
      this.emit(`${arr}.value = ${arr}.value.filter((__item) => ${compareOp});`);
      this.emit(`__setState(${arr}, [...${arr}.value]);`);
    } else {
      // Non-reactive array: use filter with assignment
      this.emit(`${arr} = ${arr}.filter((__item) => ${compareOp});`);
    }
  };

  PromptJSCompiler.prototype.visitKosongkanStatement = function (node) {
    const target = this.resolveTarget(node.target);
    this.emit(`{ const __el = ${target}; if (__el) __el.innerHTML = ''; };`);
  };
}

module.exports = { install };
