// @ts-check

/**
 * v2 Edge-Case Suite — AST Visitor Traversal (src/utils/visitor.js)
 * =================================================================
 *
 * Targets the under-covered traversal branches (baseline 66% lines):
 *   - BaseVisitor.genericVisit walking array children + single-object
 *     children + skipping null/scalar entries
 *   - A subclass overriding a visit* method and delegating to
 *     this.genericVisit to keep descending
 *   - CollectingVisitor descending through arrays and nested objects
 *   - formatAST rendering nested arrays of children
 */

import { describe, it, expect } from 'vitest';

const {
  BaseVisitor,
  CollectingVisitor,
  accept,
  traverse,
  formatAST,
  getChildKeys,
} = require('../src/utils/visitor.js');

const idNode = (name) => ({ type: 'Identifier', name, loc: null });

describe('v2 — BaseVisitor.genericVisit deep traversal', () => {
  it('descends into array children and visits each element', () => {
    const seen = [];
    const v = Object.create(BaseVisitor.prototype);
    v.visitIdentifier = function (node) {
      seen.push(node.name);
    };
    const program = {
      type: 'Program',
      body: [idNode('a'), idNode('b'), idNode('c')],
      loc: null,
    };
    accept(program, v);
    expect(seen).toEqual(['a', 'b', 'c']);
  });

  it('skips null and scalar entries inside child arrays without crashing', () => {
    const seen = [];
    const v = Object.create(BaseVisitor.prototype);
    v.visitIdentifier = function (node) {
      seen.push(node.name);
    };
    // body intentionally mixes a real node with null + a scalar
    const program = { type: 'Program', body: [idNode('only'), null], loc: null };
    expect(() => accept(program, v)).not.toThrow();
    expect(seen).toEqual(['only']);
  });

  it('an overriding visit* method can call this.genericVisit to keep descending', () => {
    const order = [];
    const v = Object.create(BaseVisitor.prototype);
    v.visitBuatStatement = function (node) {
      order.push('enter-buat');
      this.genericVisit(node); // continue into children
      order.push('exit-buat');
    };
    v.visitIdentifier = function (node) {
      order.push('id:' + node.name);
    };
    const tree = {
      type: 'BuatStatement',
      selector: idNode('div'),
      body: { type: 'BlockStatement', body: [idNode('child')], loc: null },
      loc: null,
    };
    accept(tree, v);
    expect(order[0]).toBe('enter-buat');
    expect(order[order.length - 1]).toBe('exit-buat');
    expect(order).toContain('id:div');
    expect(order).toContain('id:child');
  });
});

describe('v2 — CollectingVisitor', () => {
  it('collects every matching node across arrays and nested objects', () => {
    const v = new CollectingVisitor('Identifier');
    const tree = {
      type: 'Program',
      body: [
        {
          type: 'BinaryExpression',
          left: idNode('x'),
          right: idNode('y'),
          loc: null,
        },
        idNode('z'),
      ],
      loc: null,
    };
    accept(tree, v);
    expect(v.results.map((n) => n.name).sort()).toEqual(['x', 'y', 'z']);
  });

  it('returns an empty result set when nothing matches', () => {
    const v = new CollectingVisitor('Literal');
    accept({ type: 'Program', body: [idNode('a')], loc: null }, v);
    expect(v.results).toEqual([]);
  });
});

describe('v2 — traverse / accept guards', () => {
  it('traverse(null) is a no-op (no throw)', () => {
    expect(() => traverse(null, {})).not.toThrow();
  });

  it('accept on a node whose type has no child keys still dispatches the visit method', () => {
    const out = accept(idNode('solo'), { visitIdentifier: () => 'hit' });
    expect(out).toBe('hit');
    expect(getChildKeys('Identifier')).not.toContain('nonexistent');
  });
});

describe('v2 — formatAST nested rendering', () => {
  it('renders an array of children indented under the parent', () => {
    const out = formatAST({
      type: 'Program',
      body: [idNode('a'), idNode('b')],
      loc: null,
    });
    expect(out).toContain('Program');
    // both identifiers should appear in the rendered tree
    expect(out).toContain('Identifier');
    const idCount = (out.match(/Identifier/g) || []).length;
    expect(idCount).toBe(2);
  });

  it('renders a single nested object child', () => {
    const out = formatAST({
      type: 'BuatStatement',
      selector: idNode('div'),
      body: null,
      loc: null,
    });
    expect(out).toContain('BuatStatement');
    expect(out).toContain('Identifier');
  });
});
