/**
 * D3 — Coverage tests for visitor.js helpers.
 */
import { describe, it, expect } from 'vitest';
import {
  CollectingVisitor,
  formatAST,
  accept,
  traverse,
  getChildKeys,
} from '../src/utils/visitor.js';

describe('D3 — Visitor.js coverage', () => {
  describe('getChildKeys', () => {
    it('returns body for Program', () => {
      expect(getChildKeys('Program')).toEqual(['body']);
    });
    it('returns empty for unknown type', () => {
      expect(getChildKeys('NonExistent')).toEqual([]);
    });
    it('returns correct keys for BuatStatement', () => {
      expect(getChildKeys('BuatStatement')).toContain('selector');
    });
    it('returns correct keys for JikaStatement', () => {
      expect(getChildKeys('JikaStatement')).toContain('condition');
    });
    it('returns correct keys for BinaryExpression', () => {
      expect(getChildKeys('BinaryExpression')).toEqual(['left', 'right']);
    });
  });

  describe('accept', () => {
    it('returns undefined for null node', () => {
      expect(accept(null, {})).toBeUndefined();
    });
    it('returns undefined for node without type', () => {
      expect(accept({}, {})).toBeUndefined();
    });
    it('dispatches to visit method', () => {
      expect(accept({ type: 'Program' }, { visitProgram: (_node) => 'visited' })).toBe('visited');
    });
    it('falls back to genericVisit', () => {
      expect(accept({ type: 'Unknown' }, { genericVisit: () => 'generic' })).toBe('generic');
    });
    it('returns undefined when no handler', () => {
      expect(accept({ type: 'Unknown' }, {})).toBeUndefined();
    });
  });

  describe('traverse', () => {
    it('does nothing for null node', () => {
      traverse(null, {});
      expect(true).toBe(true);
    });
    it('dispatches to visitor', () => {
      traverse({ type: 'Program', body: [], loc: null }, { visitProgram: () => {} });
      expect(true).toBe(true);
    });
  });

  describe('CollectingVisitor', () => {
    it('collects nodes of matching type', () => {
      const visitor = new CollectingVisitor('Identifier');
      accept(
        {
          type: 'Program',
          body: [
            { type: 'Identifier', name: 'x', loc: null },
            { type: 'Literal', value: 5, loc: null },
            { type: 'Identifier', name: 'y', loc: null },
          ],
          loc: null,
        },
        visitor
      );
      expect(visitor.results.length).toBe(2);
    });
    it('collects nested nodes', () => {
      const visitor = new CollectingVisitor('Identifier');
      accept(
        {
          type: 'Program',
          body: [
            {
              type: 'BuatStatement',
              selector: { type: 'Identifier', name: 'div', loc: null },
              body: {
                type: 'BlockStatement',
                body: [{ type: 'Identifier', name: 'x', loc: null }],
                loc: null,
              },
              loc: null,
            },
          ],
          loc: null,
        },
        visitor
      );
      expect(visitor.results.length).toBe(2);
    });
    it('returns empty for no matching nodes', () => {
      const visitor = new CollectingVisitor('NonExistent');
      accept({ type: 'Program', body: [], loc: null }, visitor);
      expect(visitor.results.length).toBe(0);
    });
  });

  describe('formatAST', () => {
    it('returns "null" for null node', () => {
      expect(formatAST(null)).toBe('null');
    });
    it('formats simple node', () => {
      expect(formatAST({ type: 'Literal', value: 42, loc: null })).toContain('Literal');
    });
    it('formats node with location', () => {
      expect(
        formatAST({
          type: 'Identifier',
          name: 'x',
          loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 1 } },
        })
      ).toContain('1:0');
    });
    it('formats with indentation', () => {
      expect(
        formatAST(
          { type: 'Program', body: [{ type: 'Literal', value: 1, loc: null }], loc: null },
          2
        )
      ).toContain('Program');
    });
    it('handles non-object input', () => {
      expect(formatAST('hello')).toBe('hello');
      expect(formatAST(42)).toBe('42');
    });
    it('formats node with scalar properties', () => {
      const result = formatAST({
        type: 'BinaryExpression',
        operator: '+',
        left: { type: 'Identifier', name: 'x', loc: null },
        right: { type: 'Literal', value: 1, loc: null },
        loc: null,
      });
      expect(result).toContain('operator');
      expect(result).toContain('+');
    });
  });
});
