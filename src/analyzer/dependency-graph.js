// @ts-check

/**
 * PromptJS v1.0.0 — Dependency Graph Utilities / Utilitas Dependency Graph
 * ============================================================================
 *
 * Builds a simple static dependency graph from resolver metadata,
 * Membangun dependency graph statik sederhana dari metadata resolver,
 * terutama untuk `turunan` dan watcher `saat`.
 *
 * Berguna untuk deteksi dependency cycle (E4201) dan analisis reaktivitas.
 */

'use strict';

/**
 * Generate key string unik untuk SourceLocation (untuk dipakai sebagai Map key).
 *
 * @param {Object | null | undefined} loc - Source location
 * @returns {string} Key berformat `"line:column"`, atau `'unknown'` jika loc invalid
 */
function locKey(loc) {
  if (!loc || !loc.start) return 'unknown';
  return String(loc.start.line) + ':' + String(loc.start.column);
}

/**
 * Cek apakah value adalah AST node (objek dengan `type` string).
 *
 * @param {*} value - Value yang akan dicek
 * @returns {boolean} `true` jika value adalah AST node
 */
function isAstNode(value) {
  return value && typeof value === 'object' && typeof value.type === 'string';
}

/**
 * Kumpulkan semua referensi Identifier dari sub-tree AST.
 *
 * Traverse node secara rekursif (dengan cycle detection via `seen` Set),
 * dan untuk setiap Identifier yang memiliki metadata `resolved`, tambahkan
 * ke array `out` dengan informasi `{ name, symbol, loc }`.
 *
 * Props yang di-skip (untuk hindari circular): `loc`, `symbol`, `resolved`,
 * `semantic`, `targetSymbol`, `declarationNode`, `shadowedSymbol`,
 * `references`, `scope`, `parent`.
 *
 * @param {Object | null} node - AST node akar traversal
 * @param {Object[]} [out=[]] - Array output (akan diisi)
 * @param {Set} [seen] - Set untuk cycle detection (internal)
 * @returns {Object[]} Array referensi `{ name, symbol, loc }`
 */
function collectIdentifierReferences(node, out, seen) {
  if (!node || typeof node !== 'object') return out;
  if (!seen) seen = new Set();
  if (seen.has(node)) return out;
  seen.add(node);

  if (node.type === 'Identifier' && node.resolved) {
    out.push({
      name: node.name,
      symbol: node.resolved,
      loc: node.loc || null,
    });
    return out;
  }

  Object.keys(node).forEach(function (key) {
    // Hindari circular/internal metadata.
    if (
      key === 'loc' ||
      key === 'symbol' ||
      key === 'resolved' ||
      key === 'semantic' ||
      key === 'targetSymbol' ||
      key === 'declarationNode' ||
      key === 'shadowedSymbol' ||
      key === 'references' ||
      key === 'scope' ||
      key === 'parent'
    ) {
      return;
    }
    const value = node[key];
    if (Array.isArray(value)) {
      value.forEach(function (item) {
        if (isAstNode(item) || (item && typeof item === 'object'))
          collectIdentifierReferences(item, out, seen);
      });
    } else if (
      isAstNode(value) ||
      (value && typeof value === 'object' && !value.start && !value.end)
    ) {
      collectIdentifierReferences(value, out, seen);
    }
  });

  return out;
}

/**
 * Traverse AST secara rekursif dengan callback `visit(node)`.
 *
 * Cycle-safe via `seen` Set. Skip props metadata sama seperti `collectIdentifierReferences`.
 *
 * @param {Object | null} node - AST node akar traversal
 * @param {(node: Object) => void} visit - Callback dipanggil untuk setiap AST node
 * @param {Set} [seen] - Set untuk cycle detection (internal)
 * @returns {void}
 */
function traverseAst(node, visit, seen) {
  if (!node || typeof node !== 'object') return;
  if (!seen) seen = new Set();
  if (seen.has(node)) return;
  seen.add(node);

  if (node.type) visit(node);

  Object.keys(node).forEach(function (key) {
    if (
      key === 'loc' ||
      key === 'symbol' ||
      key === 'resolved' ||
      key === 'semantic' ||
      key === 'targetSymbol' ||
      key === 'declarationNode' ||
      key === 'shadowedSymbol' ||
      key === 'references' ||
      key === 'scope' ||
      key === 'parent'
    ) {
      return;
    }
    const value = node[key];
    if (Array.isArray(value))
      value.forEach(function (item) {
        traverseAst(item, visit, seen);
      });
    else if (value && typeof value === 'object') traverseAst(value, visit, seen);
  });
}

/**
 * Bangun dependency graph dari AST yang sudah di-resolve.
 *
 * Ekstrak metadata `ast.semantic.symbols` (diisi oleh resolver), lalu untuk
 * setiap simbol `turunan`, kumpulkan referensi Identifier dari `init`-nya
 * dan catat edge dependency `from → to`.
 *
 * Hasil: `{ dependencies, cycles }`.
 *
 * @param {Object} ast - Root AST node (Program) dengan metadata `semantic`
 * @returns {{ dependencies: Object[], cycles: Object[] }} Graph dependency + cycle yang terdeteksi
 */
function buildDependencyGraph(ast) {
  const semantic = ast && ast.semantic ? ast.semantic : null;
  const symbols = semantic && semantic.symbols ? semantic.symbols : [];
  const dependencies = [];

  symbols.forEach(function (sym) {
    if (!sym || sym.kind !== 'turunan' || !sym.declarationNode) return;
    const init = sym.declarationNode.init;
    const refs = collectIdentifierReferences(init, []);
    refs.forEach(function (ref) {
      if (!ref.symbol || !ref.symbol.id || ref.symbol.id === sym.id) return;
      dependencies.push({
        from: sym.name,
        fromSymbolId: sym.id || null,
        to: ref.symbol.name,
        toSymbolId: ref.symbol.id || null,
        kind: 'computed',
        loc: ref.loc,
      });
    });
  });

  traverseAst(ast, function (node) {
    if (node.type !== 'SaatStatement') return;
    let targetSymbol = null;
    if (node.target && typeof node.target === 'string') {
      for (let i = 0; i < symbols.length; i++) {
        if (symbols[i].name === node.target) {
          targetSymbol = symbols[i];
          break;
        }
      }
    }
    if (targetSymbol) {
      dependencies.push({
        from: 'watcher@' + locKey(node.loc),
        fromSymbolId: null,
        to: targetSymbol.name,
        toSymbolId: targetSymbol.id || null,
        kind: 'watcher-target',
        loc: node.loc || null,
      });
    }

    const bodyRefs = collectIdentifierReferences(node.body, []);
    bodyRefs.forEach(function (ref) {
      if (!ref.symbol) return;
      dependencies.push({
        from: 'watcher@' + locKey(node.loc),
        fromSymbolId: null,
        to: ref.symbol.name,
        toSymbolId: ref.symbol.id || null,
        kind: 'watcher-body-read',
        loc: ref.loc,
      });
    });
  });

  const cycles = detectCycles(dependencies);
  return {
    dependencies: dependencies,
    cycles: cycles,
  };
}

/**
 * Deteksi cycle dalam dependency graph menggunakan DFS.
 *
 * Algoritma: untuk setiap node, traverse edges; jika menemukan node yang
 * sudah ada di current path, catat sebagai cycle.
 *
 * @param {Object[]} edges - Daftar edge `{ from, to, ... }`
 * @returns {Object[]} Daftar cycle yang terdeteksi (setiap cycle adalah array node)
 */
function detectCycles(edges) {
  const graph = new Map();
  edges.forEach(function (edge) {
    // Cycle detection hanya untuk symbol-to-symbol computed dependencies.
    if (edge.kind !== 'computed' || !edge.fromSymbolId || !edge.toSymbolId) return;
    if (!graph.has(edge.fromSymbolId)) graph.set(edge.fromSymbolId, []);
    graph.get(edge.fromSymbolId).push(edge.toSymbolId);
  });

  const visited = new Set();
  const active = new Set();
  const stack = [];
  const cycles = [];
  const seenCycleKeys = new Set();

  function dfs(node) {
    visited.add(node);
    active.add(node);
    stack.push(node);

    const nexts = graph.get(node) || [];
    for (let i = 0; i < nexts.length; i++) {
      const next = nexts[i];
      if (!visited.has(next)) {
        dfs(next);
      } else if (active.has(next)) {
        const startIndex = stack.indexOf(next);
        const cycle = stack.slice(startIndex).concat([next]);
        const key = cycle.join('>');
        if (!seenCycleKeys.has(key)) {
          seenCycleKeys.add(key);
          cycles.push({ symbolIds: cycle });
        }
      }
    }

    stack.pop();
    active.delete(node);
  }

  Array.from(graph.keys()).forEach(function (node) {
    if (!visited.has(node)) dfs(node);
  });

  return cycles;
}

/**
 * Normalisasi struktur semantic AST menjadi format yang konsisten.
 *
 * Memastikan `ast.semantic` ada dan memiliki field `symbols` (array) dan
 * `dependencies` (array). Jika tidak ada, inisialisasi dengan default.
 *
 * @param {Object} ast - Root AST node (Program)
 * @returns {Object} Semantic yang sudah dinormalisasi
 */
function normalizeSemantic(ast) {
  const semantic = ast && ast.semantic ? ast.semantic : null;
  const symbols = semantic && semantic.symbols ? semantic.symbols : [];
  const deps = semantic && semantic.dependencies ? semantic.dependencies : [];
  const cycles = semantic && semantic.dependencyCycles ? semantic.dependencyCycles : [];

  const publicSymbols = symbols.map(function (sym) {
    return {
      id: sym.id || null,
      name: sym.name,
      kind: sym.kind,
      loc: sym.declarationNode && sym.declarationNode.loc ? sym.declarationNode.loc : null,
      scope: sym.scope || null,
      scopeId: sym.scopeId || null,
      isReactive: !!sym.isReactive,
      isWritable: !!sym.isWritable,
      isComputed: !!sym.isComputed,
      isParameter: !!sym.isParameter,
      isComponent: !!sym.isComponent,
      isFunction: !!sym.isFunction,
      readCount: sym.readCount || 0,
      writeCount: sym.writeCount || 0,
      shadowedSymbolId: sym.shadowedSymbol ? sym.shadowedSymbol.id || null : null,
    };
  });

  const references = [];
  symbols.forEach(function (sym) {
    (sym.references || []).forEach(function (ref) {
      references.push({
        symbolId: sym.id || null,
        name: sym.name,
        loc: ref.loc || null,
      });
    });
  });

  return {
    symbols: publicSymbols,
    references: references,
    dependencies: deps.map(function (dep) {
      return {
        from: dep.from,
        fromSymbolId: dep.fromSymbolId || null,
        to: dep.to,
        toSymbolId: dep.toSymbolId || null,
        kind: dep.kind,
        loc: dep.loc || null,
      };
    }),
    cycles: cycles.map(function (cycle) {
      return { symbolIds: cycle.symbolIds ? cycle.symbolIds.slice() : [] };
    }),
  };
}

module.exports = {
  collectIdentifierReferences: collectIdentifierReferences,
  buildDependencyGraph: buildDependencyGraph,
  detectCycles: detectCycles,
  normalizeSemantic: normalizeSemantic,
};
