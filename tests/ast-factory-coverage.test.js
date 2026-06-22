/**
 * D3 — Coverage tests for AST factory functions.
 */
import { describe, it, expect } from 'vitest';
const AST = require('../src/parser/ast-factory.js');

describe('D3 — AST factory coverage', () => {
  describe('Location helpers', () => {
    it('ensureLoc returns UNKNOWN_LOC for null', () => {
      const loc = AST.ensureLoc(null);
      expect(loc.start.line).toBe(0);
    });
    it('ensureLoc returns loc if valid', () => {
      const input = { start: { line: 1, column: 0 }, end: { line: 1, column: 5 } };
      expect(AST.ensureLoc(input)).toBe(input);
    });
    it('buatLoc from positions', () => {
      const loc = AST.buatLoc({ line: 1, column: 0 }, { line: 1, column: 5 });
      expect(loc.start.line).toBe(1);
    });
    it('buatLoc returns UNKNOWN_LOC for null', () => {
      expect(AST.buatLoc(null, null)).toBe(AST.UNKNOWN_LOC);
    });
    it('buatLoc from token', () => {
      const loc = AST.buatLoc({ baris: 3, kolom: 5 }, { baris: 3, kolom: 10 });
      expect(loc.start.line).toBe(3);
    });
    it('locFromTokens', () => {
      const loc = AST.locFromTokens(
        { baris: 1, kolom: 0, nilai: 'x' },
        { baris: 1, kolom: 5, nilai: 'hello' }
      );
      expect(loc.start.line).toBe(1);
    });
    it('gabungLoc merges two locations', () => {
      const merged = AST.gabungLoc(
        { start: { line: 1, column: 0 }, end: { line: 2, column: 5 } },
        { start: { line: 2, column: 0 }, end: { line: 3, column: 10 } }
      );
      expect(merged.start.line).toBe(1);
      expect(merged.end.line).toBe(3);
    });
  });

  describe('Declaration nodes', () => {
    it('buatProgramNode', () => {
      expect(AST.buatProgramNode([], null, 'test.pjs').type).toBe('Program');
    });
    it('buatDataDeclaration', () => {
      expect(AST.buatDataDeclaration('x', 'angka', null, null).type).toBe('DataDeclaration');
    });
    it('buatTetapDeclaration', () => {
      expect(AST.buatTetapDeclaration('PI', null, null, null).type).toBe('TetapDeclaration');
    });
    it('buatUbahDeclaration', () => {
      expect(AST.buatUbahDeclaration('y', null, null, null).type).toBe('UbahDeclaration');
    });
    it('buatTurunanDeclaration', () => {
      expect(AST.buatTurunanDeclaration('total', null, null, null).type).toBe('TurunanDeclaration');
    });
    it('buatKomponenDeclaration', () => {
      expect(AST.buatKomponenDeclaration('Kartu', [], null, null, null).type).toBe(
        'KomponenDeclaration'
      );
    });
    it('buatFungsiDeclaration', () => {
      expect(AST.buatFungsiDeclaration('halo', [], null, null, null).type).toBe(
        'FungsiDeclaration'
      );
    });
  });

  describe('Statement nodes', () => {
    it('buatBlockStatement', () => {
      expect(AST.buatBlockStatement([], null).type).toBe('BlockStatement');
    });
    it('buatBuatStatement with props', () => {
      const sel = AST.buatSelector('div', null);
      expect(AST.buatBuatStatement(sel, null, null, [{ key: 'teks', value: null }]).type).toBe(
        'BuatStatement'
      );
    });
    it('buatJikaStatement with alternate', () => {
      expect(
        AST.buatJikaStatement(null, null, null, null, AST.buatBlockStatement([], null)).alternate
      ).toBeDefined();
    });
    it('buatUlangiStatement with rangeEnd', () => {
      expect(
        AST.buatUlangiStatement(
          'i',
          null,
          null,
          'rentang',
          null,
          null,
          AST.buatLiteral(10, 'number', null)
        ).rangeEnd
      ).toBeDefined();
    });
    it('buatKembalikanStatement with value', () => {
      expect(
        AST.buatKembalikanStatement(null, AST.buatLiteral(5, 'number', null)).value
      ).toBeDefined();
    });
    it('buatAmbilDomStatement with attributeName', () => {
      expect(
        AST.buatAmbilDomStatement('atribut', null, 'x', null, null, 'href').attributeName
      ).toBe('href');
    });
    it('buatAmbilLuarStatement with options', () => {
      expect(
        AST.buatAmbilLuarStatement(null, [], null, null, [
          AST.buatFetchOption('method', null, null),
        ]).options
      ).toBeDefined();
    });
    it('buatGunakanStatement with props', () => {
      expect(
        AST.buatGunakanStatement('Kartu', null, null, [{ key: 'judul', value: null }]).props
      ).toBeDefined();
    });
    it('buatKetikaStatement with body', () => {
      expect(
        AST.buatKetikaStatement('diklik', null, null, null, AST.buatBlockStatement([], null)).body
      ).toBeDefined();
    });
    it('buatSimpanStatement', () => {
      expect(AST.buatSimpanStatement(null, null, 'simpan', null).kind).toBe('simpan');
    });
    it('buatLangsungBlock', () => {
      expect(AST.buatLangsungBlock('console.log("hi")', null).content).toBe('console.log("hi")');
    });
  });

  describe('Expression nodes', () => {
    it('buatLiteral', () => {
      expect(AST.buatLiteral(42, 'number', null).value).toBe(42);
    });
    it('buatIdentifier', () => {
      expect(AST.buatIdentifier('x', null).name).toBe('x');
    });
    it('buatBinaryExpression', () => {
      expect(AST.buatBinaryExpression('+', null, null, null).operator).toBe('+');
    });
    it('buatUnaryExpression prefix=false', () => {
      expect(AST.buatUnaryExpression('!', null, null, false).prefix).toBe(false);
    });
    it('buatConditionalExpression', () => {
      expect(AST.buatConditionalExpression(null, null, null, null).type).toBe(
        'ConditionalExpression'
      );
    });
    it('buatMemberExpression', () => {
      expect(AST.buatMemberExpression(null, null, null).type).toBe('MemberExpression');
    });
    it('buatCallExpression', () => {
      expect(AST.buatCallExpression(null, [], null).type).toBe('CallExpression');
    });
    it('buatObjectLiteral', () => {
      expect(AST.buatObjectLiteral([], null).type).toBe('ObjectLiteral');
    });
    it('buatArrayLiteral', () => {
      expect(AST.buatArrayLiteral([], null).type).toBe('ArrayLiteral');
    });
  });

  describe('UI & Selector', () => {
    it('buatSelector with id and classes', () => {
      const node = AST.buatSelector('div', null, 'main', ['box', 'red']);
      expect(node.id).toBe('main');
      expect(node.classes).toEqual(['box', 'red']);
    });
    it('buatPropertyNode shorthand', () => {
      expect(AST.buatPropertyNode('x', null, null, true).shorthand).toBe(true);
    });
    it('buatAttributeNode', () => {
      expect(AST.buatAttributeNode('href', null, null).key).toBe('href');
    });
  });

  describe('Special & Shared', () => {
    it('buatErrorNode with originalToken', () => {
      const node = AST.buatErrorNode('E2001', 'msg', null, { baris: 1, kolom: 0 });
      expect(node.kode).toBe('E2001');
      expect(node.pesan).toBe('msg');
      expect(node.originalToken).toBeDefined();
    });
    it('buatParameter with typeHint and defaultValue', () => {
      const node = AST.buatParameter('x', null, 'angka', AST.buatLiteral(0, 'number', null));
      expect(node.typeHint).toBe('angka');
      expect(node.defaultValue).toBeDefined();
    });
    it('buatFetchBranch', () => {
      expect(AST.buatFetchBranch('sukses', null, null).kind).toBe('sukses');
    });
    it('buatFetchOption', () => {
      expect(AST.buatFetchOption('method', null, null).key).toBe('method');
    });
    it('buatBerhentiStatement', () => {
      expect(AST.buatBerhentiStatement(null).type).toBe('BerhentiStatement');
    });
    it('buatLewatiStatement', () => {
      expect(AST.buatLewatiStatement(null).type).toBe('LewatiStatement');
    });
    it('buatTampilkanStatement with mode', () => {
      expect(AST.buatTampilkanStatement(null, null, null, null, 'tambahkan', 'pesan').mode).toBe(
        'tambahkan'
      );
    });
    it('buatSembunyikanStatement', () => {
      expect(AST.buatSembunyikanStatement(null, null, null).type).toBe('SembunyikanStatement');
    });
    it('buatHapusStatement', () => {
      expect(AST.buatHapusStatement(null, null, null).type).toBe('HapusStatement');
    });
    it('buatHapusDariStatement', () => {
      expect(AST.buatHapusDariStatement(null, null, null, null).type).toBe('HapusDariStatement');
    });
    it('buatKosongkanStatement', () => {
      expect(AST.buatKosongkanStatement(null, null, null).type).toBe('KosongkanStatement');
    });
    it('buatPerbaruiStatement', () => {
      expect(AST.buatPerbaruiStatement('teks', null, null, null, null).property).toBe('teks');
    });
    it('buatSaatStatement', () => {
      expect(AST.buatSaatStatement(null, null, null, null).type).toBe('SaatStatement');
    });
    it('buatLifecycleStatement', () => {
      expect(AST.buatLifecycleStatement('dipasang', null, null, null).kind).toBe('dipasang');
    });
    it('buatSetelahStatement with body', () => {
      expect(
        AST.buatSetelahStatement(null, null, null, AST.buatBlockStatement([], null)).body
      ).toBeDefined();
    });
    it('buatSelamaStatement', () => {
      expect(AST.buatSelamaStatement(null, null, null, null).type).toBe('SelamaStatement');
    });
    it('buatArahkanStatement', () => {
      expect(AST.buatArahkanStatement(null, null, null).type).toBe('ArahkanStatement');
    });
    it('buatMuatUlangStatement', () => {
      expect(AST.buatMuatUlangStatement(null).type).toBe('MuatUlangStatement');
    });
    it('buatKembaliStatement', () => {
      expect(AST.buatKembaliStatement(null).type).toBe('KembaliStatement');
    });
    it('buatTambahkanStatement', () => {
      expect(AST.buatTambahkanStatement(null, null, null, null).type).toBe('TambahkanStatement');
    });
    it('buatKurangiStatement with value', () => {
      expect(
        AST.buatKurangiStatement(null, null, null, AST.buatLiteral(1, 'number', null)).value
      ).toBeDefined();
    });
    it('buatSisipkanStatement', () => {
      expect(AST.buatSisipkanStatement(null, null, null, null).type).toBe('SisipkanStatement');
    });
    it('buatJalankanExpression with arguments', () => {
      expect(
        AST.buatJalankanExpression(null, 'jalankan', null, null, [
          AST.buatLiteral(1, 'number', null),
        ]).arguments
      ).toBeDefined();
    });
    it('buatPanggilNativeExpression', () => {
      expect(AST.buatPanggilNativeExpression(null, [], null, null).type).toBe(
        'PanggilNativeExpression'
      );
    });
    it('buatRantaiAksi', () => {
      expect(AST.buatRantaiAksi(null, [], null).type).toBe('RantaiAksi');
    });
  });
});
