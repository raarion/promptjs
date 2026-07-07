import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { parse } = require('../src/parser/promptjs-parser');
const { tokenize } = require('../src/lexer/promptjs-lexer');

describe('Micro-audit parser this._pos', () => {
  it('correctly backtracks when parsing a parenthesized expression instead of an arrow function', () => {
    const code = `
komponen Contoh():
  fungsi foo():
    kembalikan (a + b)
    `;

    const tokensResult = tokenize(code);
    const tokens = tokensResult.tokens;
    
    // Parse should succeed and not throw due to bad backtracking
    const result = parse(tokens, code);
    
    expect(result.ast).toBeDefined();
    
    // The first several items are TetapDeclarations for external code, find the KomponenDeclaration
    const component = result.ast.body.find(n => n.type === 'KomponenDeclaration');
    expect(component).toBeDefined();
    
    const fungsiFoo = component.body.body[0];
    expect(fungsiFoo.type).toBe('FungsiDeclaration');
    
    const returnStmt = fungsiFoo.body.body[0];
    expect(returnStmt.type).toBe('KembalikanStatement');
    
    const binExpr = returnStmt.value;
    expect(binExpr.type).toBe('BinaryExpression');
    expect(binExpr.operator).toBe('+');
    expect(binExpr.left.name).toBe('a');
    expect(binExpr.right.name).toBe('b');
  });
});
