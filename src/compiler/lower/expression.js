// @ts-check

/**
 * PromptJS v0.2 — Expression Lowering / Penurunan Ekspresi
 * ============================================================================
 *
 * Expression lowering separated from the main compiler.
 * Expression lowering dipisah dari compiler utama.
 *
 * Lowers AST expressions to JavaScript / Menurunkan ekspresi AST ke JavaScript:
 *   - Built-in function calls (panjang, tipeData, apakahArray, dll.)
 *     diturunkan ke JavaScript yang benar
 *   - Mutating array methods pada variabel reaktif (push, pop, splice, dll.)
 *     sekarang memicu reaktivitas dengan spread assignment
 *   - Alias method Indonesia (untukSetiap, sisip, dll.) diterjemahkan
 *     oleh resolver dan ditangani di sini
 */

'use strict';

/**
 * Method array yang bermutasi (tidak mengubah reference, jadi Proxy setter tidak terpicu).
 * @type {Set<string>}
 */
const MUTATING_ARRAY_METHODS = new Set([
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse',
  'fill',
]);

/**
 * Lower expression AST node menjadi string ekspresi JavaScript.
 *
 * Dispatch berdasarkan `node.type`:
 * - `Literal` → `JSON.stringify(value)`
 * - `Identifier` → `<name>` (atau `<name>.value` jika reaktif)
 * - `BinaryExpression` → `(left op right)` (dengan translasi operator kata ID → simbol JS)
 * - `UnaryExpression` → `(op operand)` (dengan translasi `tidak` → `!`)
 * - `ConditionalExpression` → `(test ? consequent : alternate)`
 * - `MemberExpression` → `object.property`
 * - `CallExpression` → delegate ke `lowerCallExpression`
 * - `ObjectLiteral` → `{ "k1": v1, "k2": v2 }`
 * - `ArrayLiteral` → `[e1, e2, e3]`
 * - `JalankanExpression` / `PanggilNativeExpression` → delegate ke compiler visitor
 * - `Selector` → delegate ke `compiler.resolveTarget`
 * - `PropertyNode` → lower `value`-nya saja
 * - `FetchBranch` / `FetchOption` / `ErrorNode` → `undefined`
 *
 * @param {Object} compiler - Instance PromptJSCompiler (untuk delegasi)
 * @param {Object | null} node - AST node expression
 * @returns {string} Ekspresi JavaScript (atau `'undefined'` jika node null)
 */
function lowerExpression(compiler, node) {
  if (!node) return 'undefined';

  switch (node.type) {
    case 'Literal':
      return JSON.stringify(node.value);
    case 'Identifier':
      if (node.resolved && (node.resolved.kind === 'data' || node.resolved.kind === 'turunan')) {
        return `${node.name}.value`;
      }
      // PromptJS patch: external data reference
      if (node.resolved && node.resolved.kind === 'external') {
        return node.name; // external data is emitted as a top-level const
      }
      if (node._isExternal) {
        return node.name; // fallback for unresolved external
      }
      return node.name;
    case 'BinaryExpression': {
      const ops = {
        'sama dengan': '===',
        'tidak sama dengan': '!==',
        dan: '&&',
        atau: '||',
        'paling sedikit': '>=',
        'paling banyak': '<=',
        'lebih dari': '>',
        'kurang dari': '<',
        tambah: '+',
        kurang: '-',
        kali: '*',
        bagi: '/',
        mod: '%',
        pangkat: '**',
      };
      const op = ops[node.operator] || node.operator;
      return `(${lowerExpression(compiler, node.left)} ${op} ${lowerExpression(compiler, node.right)})`;
    }
    case 'UnaryExpression': {
      const unaryOps = {
        tidak: '!',
        negatif: '-',
      };
      const uop = unaryOps[node.operator] || node.operator;
      if (node.prefix !== false) {
        return `(${uop}${lowerExpression(compiler, node.operand)})`;
      }
      return `(${lowerExpression(compiler, node.operand)}${uop})`;
    }
    case 'ConditionalExpression': {
      const test = lowerExpression(compiler, node.test);
      const cons = lowerExpression(compiler, node.consequent);
      const alt = lowerExpression(compiler, node.alternate);
      return `(${test} ? ${cons} : ${alt})`;
    }
    case 'MemberExpression': {
      const prop = node.property.name;
      const objCode = lowerExpression(compiler, node.object);
      return `${objCode}.${prop}`;
    }
    case 'CallExpression':
      return lowerCallExpression(compiler, node);
    case 'ObjectLiteral':
      if (node.properties && node.properties.length > 0) {
        const pairs = node.properties.map((p) => {
          const val = lowerExpression(compiler, p.value);
          return `"${p.key}": ${val}`;
        });
        return `{ ${pairs.join(', ')} }`;
      }
      return '{}';
    case 'ArrayLiteral':
      if (node.elements && node.elements.length > 0) {
        const elems = node.elements.map((e) => lowerExpression(compiler, e));
        return `[${elems.join(', ')}]`;
      }
      return '[]';
    case 'JalankanExpression': {
      // Lower directly as a function call — avoid infinite recursion via
      // compiler.visitJalankanExpression which would call accept() →
      // visitJalankanExpression → lowerExpression → ...
      const calleeCode = lowerExpression(compiler, node.callee);
      const args = (node.arguments || []).map((a) => lowerExpression(compiler, a)).join(', ');
      return `${calleeCode}(${args})`;
    }
    case 'PanggilNativeExpression':
      return compiler.visitPanggilNativeExpression(node);
    case 'Selector':
      return compiler.resolveTarget(node);
    case 'PropertyNode':
      return lowerExpression(compiler, node.value);
    case 'FetchBranch':
    case 'FetchOption':
      return 'undefined';
    case 'ErrorNode':
      return 'undefined';
    // ─── Wave G: action keywords as expression values ─────────────────
    case 'MuatUlangStatement':
      return 'window.location.reload()';
    case 'KembaliStatement':
      return 'window.history.back()';
    case 'BerhentiStatement':
      return 'break';
    case 'SembunyikanStatement':
      return `${compiler.resolveTarget(node.target)}.style.display = "none"`;
    case 'HapusStatement': {
      // v1.0: Check if target adalah localStorage.x atau sessionStorage.x
      if (
        node.target &&
        node.target.type === 'MemberExpression' &&
        node.target.object &&
        node.target.object.type === 'Identifier'
      ) {
        const objName = node.target.object.name;
        const propName = node.target.property ? node.target.property.name : null;
        if ((objName === 'localStorage' || objName === 'sessionStorage') && propName) {
          return `${objName}.removeItem("${propName}")`;
        }
      }
      return `${compiler.resolveTarget(node.target)}.remove()`;
    }
    case 'HapusDariStatement': {
      const item = lowerExpression(compiler, node.item);
      const isReactive = node.fromArrayReactive;
      let arr;
      if (node.fromArrayResolved) {
        arr = node.fromArrayResolved;
      } else if (node.fromArray && node.fromArray.type === 'Identifier') {
        arr = compiler.resolveTarget(node.fromArray);
      } else {
        arr = lowerExpression(compiler, node.fromArray);
      }
      if (isReactive) {
        return `(${arr}.value = ${arr}.value.filter((__item) => __item !== ${item}), __setState(${arr}, [...${arr}.value]))`;
      }
      return `${arr} = ${arr}.filter((__item) => __item !== ${item})`;
    }
    case 'KosongkanStatement':
      return `${compiler.resolveTarget(node.target)}.innerHTML = ""`;
    case 'TampilkanStatement':
      return `${compiler.resolveTarget(node.target)}.style.display = ""`;
    case 'ArahkanStatement': {
      // node.url (from AST factory) or node.target (fallback)
      const url = node.url || node.target;
      return `window.location.href = ${lowerExpression(compiler, url)}`;
    }
    case 'SimpanStatement': {
      // v1.0: Check if target adalah localStorage.x atau sessionStorage.x
      if (
        node.target &&
        node.target.type === 'MemberExpression' &&
        node.target.object &&
        node.target.object.type === 'Identifier'
      ) {
        const objName = node.target.object.name;
        const propName = node.target.property ? node.target.property.name : null;
        if ((objName === 'localStorage' || objName === 'sessionStorage') && propName) {
          const val = lowerExpression(compiler, node.value);
          return `${objName}.setItem("${propName}", ${val})`;
        }
      }
      const val = lowerExpression(compiler, node.value);
      const tgt = compiler.resolveTarget(node.target);
      // Reactive target (data/turunan) → use __setState to trigger watchers.
      // Plain target (ubah) → direct assignment.
      if (node.targetSymbol && node.targetSymbol.isReactive) {
        return `__setState(${tgt}, ${val})`;
      }
      return `${tgt} = ${val}`;
    }
    case 'TambahkanStatement': {
      const val = lowerExpression(compiler, node.value);
      const tgt = compiler.resolveTarget(node.target);
      // Reactive array (data/turunan) → push to .value then trigger reactivity
      // via __setState with a new array reference (so Proxy setter fires).
      // Plain array (ubah) → push directly.
      if (node.targetSymbol && node.targetSymbol.isReactive) {
        return `(${tgt}.value.push(${val}), __setState(${tgt}, [...${tgt}.value]))`;
      }
      return `${tgt}.push(${val})`;
    }
    case 'KurangiStatement': {
      const tgt = compiler.resolveTarget(node.target);
      const jumlah = node.value ? lowerExpression(compiler, node.value) : '1';
      if (node.targetSymbol && node.targetSymbol.isReactive) {
        return `__setState(${tgt}, ${tgt}.value - ${jumlah})`;
      }
      return `${tgt} = ${tgt} - ${jumlah}`;
    }
    case 'SisipkanStatement': {
      const val = lowerExpression(compiler, node.value);
      const tgt = compiler.resolveTarget(node.target);
      if (node.targetSymbol && node.targetSymbol.isReactive) {
        return `(${tgt}.value.push(${val}), __setState(${tgt}, [...${tgt}.value]))`;
      }
      return `${tgt}.push(${val})`;
    }
    case 'PerbaruiStatement': {
      const tgt = compiler.resolveTarget(node.target);
      const val = lowerExpression(compiler, node.value);
      if (node.property === 'teks') return `${tgt}.innerText = ${val}`;
      if (node.property === 'html') {
        compiler.helpers.add('__sanitizeHTML');
        return `${tgt}.innerHTML = __sanitizeHTML(${val})`;
      }
      if (node.property === 'kelas') return `${tgt}.className = ${val}`;
      if (node.property === 'nilai') return `${tgt}.value = ${val}`;
      return `${tgt}.setAttribute("${node.property}", ${val})`;
    }
    default:
      // Unknown node type — emit warning comment
      console.warn(`[PromptJS Compiler] Unknown expression type: ${node.type}`);
      return 'undefined';
  }
}

/**
 * Lower CallExpression ke JavaScript.
 *
 * Tiga kasus yang ditangani:
 * 1. Fungsi bawaan (builtins, mis. `panjang(arr)` → `arr.length`)
 *    → delegate ke `lowerBuiltinCall`.
 * 2. Method call pada objek reaktif (mis. `arr.push(x)`) → delegate ke
 *    `lowerMethodCall` untuk picu reaktivitas.
 * 3. Panggilan fungsi biasa (`myFunc(args)`) → lower callee + args langsung.
 *
 * @param {Object} compiler - Instance PromptJSCompiler
 * @param {Object} node - AST node CallExpression
 * @returns {string} Ekspresi JavaScript
 */
function lowerCallExpression(compiler, node) {
  // ── Kasus 1: Fungsi bawaan (builtin) ────────────────────────────────────────
  if (node.isBuiltin && node.builtinInfo) {
    return lowerBuiltinCall(compiler, node);
  }

  // ── Kasus 2: Method call pada objek reaktif ─────────────────────────────────
  if (node.callee && node.callee.type === 'MemberExpression') {
    return lowerMethodCall(compiler, node);
  }

  // ── Kasus 3: Panggilan fungsi biasa ──────────────────────────────────────────
  const callArgs = node.arguments.map((a) => lowerExpression(compiler, a)).join(', ');
  const calleeCode = lowerExpression(compiler, node.callee);
  return `${calleeCode}(${callArgs})`;
}

/**
 * Lower panggilan fungsi bawaan (builtin) ke JavaScript.
 *
 * Contoh translasi:
 * - `panjang(arr)` → `arr.length` (unwrap `.value` jika reaktif)
 * - `tipeData(x)` → `typeof x`
 * - `apakahArray(x)` → `Array.isArray(x)`
 * - `apakahKosong(x)` → cek null/undefined/array kosong/string kosong
 * - `gabung(arr, sep)` → `arr.join(sep)`
 * - `saring(arr, fn)` → `arr.filter(fn)`
 * - `pilih(arr, fn)` → `arr.map(fn)`
 * - `urutkan(arr, fn?)` → `[...arr].sort(fn)` (salin agar tidak bermutasi)
 * - `balik(arr)` → `[...arr].reverse()`
 * - `temukan(arr, fn)` → `arr.find(fn)`
 * - `apakahAda(arr, item)` → `arr.includes(item)`
 *
 * @param {Object} compiler - Instance PromptJSCompiler
 * @param {Object} node - AST node CallExpression (dengan `isBuiltin=true` dan `builtinInfo`)
 * @returns {string} Ekspresi JavaScript
 */
function lowerBuiltinCall(compiler, node) {
  const builtin = node.builtinInfo;
  const args = node.arguments.map((a) => lowerExpression(compiler, a));

  // Prefix operator (typeof)
  if (node.isPrefixBuiltin || builtin.prefix) {
    return `${builtin.jsName} ${args[0]}`;
  }

  // Helper functions yang memerlukan runtime helper
  if (builtin.helper) {
    switch (builtin.jsName) {
      case '__promptjs_panjang': {
        // panjang(arr) → arr.length (unwrap .value jika reaktif, arg sudah di-lower)
        return `${args[0]}.length`;
      }
      case '__promptjs_apakahKosong': {
        // apakahKosong(arr) → (Array.isArray(x) ? x.length === 0 : x === null || x === undefined || x === '')
        return `(${args[0]} === null || ${args[0]} === undefined || (Array.isArray(${args[0]}) && ${args[0]}.length === 0) || ${args[0]} === '')`;
      }
      case '__promptjs_gabung': {
        // gabung(arr, pemisah) → arr.join(pemisah)
        const separator = args[1] || '","';
        return `${args[0]}.join(${separator})`;
      }
      case '__promptjs_saring': {
        // saring(arr, fn) → arr.filter(fn)
        return `${args[0]}.filter(${args[1]})`;
      }
      case '__promptjs_pilih': {
        // pilih(arr, fn) → arr.map(fn)
        return `${args[0]}.map(${args[1]})`;
      }
      case '__promptjs_urutkan': {
        // urutkan(arr) → [...arr].sort() (salin dulu agar tidak bermutasi)
        return `[...${args[0]}].sort(${args[1] || ''})`;
      }
      case '__promptjs_balik': {
        // balik(arr) → [...arr].reverse() (salin dulu agar tidak bermutasi)
        return `[...${args[0]}].reverse()`;
      }
      case '__promptjs_temukan': {
        // temukan(arr, fn) → arr.find(fn)
        return `${args[0]}.find(${args[1]})`;
      }
      case '__promptjs_apakahAda': {
        // apakahAda(arr, item) → arr.includes(item)
        return `${args[0]}.includes(${args[1]})`;
      }
      default:
        // Fallback: gunakan jsName langsung
        return `${builtin.jsName}(${args.join(', ')})`;
    }
  }

  // Non-helper builtins (langsung ke JS native)
  // keTeks(x) → String(x), keAngka(x) → Number(x), dll.
  return `${builtin.jsName}(${args.join(', ')})`;
}

/**
 * Lower method call pada objek (`obj.method(args)`).
 *
 * Kasus khusus: jika method ada di `MUTATING_ARRAY_METHODS` dan objek
 * adalah variabel reaktif, bungkus dalam IIFE yang melakukan:
 * 1. Panggil method (mis. `arr.value.push(x)`).
 * 2. Setelah itu, assign ulang dengan spread (`arr.value = [...arr.value]`)
 *    untuk memicu Proxy setter sehingga subscriber reaktif ter-update.
 * 3. Return hasil method asli via variabel temp `__r`.
 *
 * Jika tidak mutating atau tidak reaktif, panggil method secara langsung.
 *
 * @param {Object} compiler - Instance PromptJSCompiler
 * @param {Object} node - AST node CallExpression (callee adalah MemberExpression)
 * @returns {string} Ekspresi JavaScript
 */
function lowerMethodCall(compiler, node) {
  const callArgs = node.arguments.map((a) => lowerExpression(compiler, a)).join(', ');
  const calleeCode = lowerExpression(compiler, node.callee);
  const methodName = node.callee.property.name;

  // Cek apakah ini mutating method pada variabel reaktif
  const isMutating = MUTATING_ARRAY_METHODS.has(methodName);
  const objectIsReactive = isObjectReactive(node.callee.object);

  if (isMutating && objectIsReactive) {
    // Method yang bermutasi array pada variabel reaktif
    // harus memicu Proxy setter dengan assignment baru.
    // arr.value.push(x) → (arr.value.push(x), arr.value = [...arr.value])
    // Menggunakan comma operator agar ekspresi mengembalikan hasil push
    // sekaligus memicu reaktivitas.
    const objExpr = lowerExpression(compiler, node.callee.object);
    return `(function() { var __r = ${calleeCode}(${callArgs}); ${objExpr} = [...${objExpr}]; return __r; })()`;
  }

  // Non-mutating atau non-reaktif: panggil biasa
  return `${calleeCode}(${callArgs})`;
}

/**
 * Cek apakah objek ekspresi adalah variabel reaktif (data/turunan).
 *
 * Memeriksa metadata `resolved` yang dilampirkan resolver ke Identifier node.
 * Untuk MemberExpression yang mengakses `.value` dari reaktif, recurse ke `.object`.
 *
 * @param {Object | null} objectNode - AST node expression objek
 * @returns {boolean} `true` jika objek adalah variabel reaktif
 */
function isObjectReactive(objectNode) {
  if (!objectNode) return false;

  // Jika node adalah Identifier, cek metadata resolved
  if (objectNode.type === 'Identifier' && objectNode.resolved) {
    return objectNode.resolved.kind === 'data' || objectNode.resolved.kind === 'turunan';
  }

  // Jika node adalah MemberExpression yang mengakses .value dari reaktif,
  // maka .object dari MemberExpression parent adalah reaktif
  if (objectNode.type === 'MemberExpression') {
    return isObjectReactive(objectNode.object);
  }

  // Default: anggap tidak reaktif
  return false;
}

module.exports = { lowerExpression };
