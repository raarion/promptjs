// @ts-check

/**
 * Word operators (bilingual prose operators → token type + JS symbol).
 * Ordered longest-first so multi-word phrases win over their prefixes.
 * Recognized only inside expression tokenization.
 *
 * @module lexer/maps/operators
 */

'use strict';

const TT = require('../core/token').TT;

const WORD_OPERATORS = [
  { phrase: 'tidak sama dengan', type: TT.TK_NEQ, symbol: '!==' },
  { phrase: 'sama dengan', type: TT.TK_EQ, symbol: '===' },
  // String/collection membership — multi-word English phrases first so they
  // win over any single-word prefix; `symbol` is the operator name the parser
  // stores on the BinaryExpression (lowered to a method call, not an infix op).
  { phrase: 'starts with', type: TT.TK_DIAWALI, symbol: 'diawali' },
  { phrase: 'ends with', type: TT.TK_DIAKHIRI, symbol: 'diakhiri' },
  { phrase: 'diawali', type: TT.TK_DIAWALI, symbol: 'diawali' },
  { phrase: 'diakhiri', type: TT.TK_DIAKHIRI, symbol: 'diakhiri' },
  { phrase: 'berisi', type: TT.TK_BERISI, symbol: 'berisi' },
  { phrase: 'contains', type: TT.TK_BERISI, symbol: 'berisi' },
  { phrase: 'paling sedikit', type: TT.TK_GTE, symbol: '>=' },
  { phrase: 'paling banyak', type: TT.TK_LTE, symbol: '<=' },
  { phrase: 'lebih dari', type: TT.TK_GT, symbol: '>' },
  { phrase: 'kurang dari', type: TT.TK_LT, symbol: '<' },
  { phrase: 'dan', type: TT.TK_AND, symbol: '&&' },
  { phrase: 'atau', type: TT.TK_OR, symbol: '||' },
  { phrase: 'tidak', type: TT.TK_NOT, symbol: '!' },
  { phrase: 'negatif', type: TT.TK_MINUS, symbol: '-' },
  { phrase: 'tambah', type: TT.TK_PLUS, symbol: '+' },
  { phrase: 'kurang', type: TT.TK_MINUS, symbol: '-' },
  { phrase: 'kali', type: TT.TK_STAR, symbol: '*' },
  { phrase: 'bagi', type: TT.TK_SLASH, symbol: '/' },
  { phrase: 'mod', type: TT.TK_MOD, symbol: '%' },
  { phrase: 'pangkat', type: TT.TK_POW, symbol: '**' },
].map(function (w) {
  return {
    type: w.type,
    symbol: w.symbol,
    re: new RegExp('^' + w.phrase.replace(/ /g, '\\s+') + '(?![A-Za-z0-9_])', 'i'),
  };
});

module.exports = WORD_OPERATORS;
