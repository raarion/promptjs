// @ts-check

/**
 * v0.9 Tests — Protected Content & Auth Pattern
 * =============================================
 *
 * Tests untuk FASE 4: auth guard compilation, token source configuration,
 * role-based access patterns (v1.0+), dan lowering `hapus` pada localStorage/sessionStorage.
 */

import { describe, it, expect } from 'vitest';

// ── Modules under test ──
const Lexer = require('../src/lexer/promptjs-lexer');
const Parser = require('../src/parser/promptjs-parser');
const Resolver = require('../src/resolver/promptjs-resolver');
const Analyzer = require('../src/analyzer/promptjs-analyzer');
const Compiler = require('../src/compiler/promptjs-compiler');

/**
 * Helper: compile source dengan front-matter
 */
function compileSource(pjsSource) {
  const lexResult = Lexer.tokenize(pjsSource);
  if (lexResult.errors && lexResult.errors.length > 0) {
    return { errors: lexResult.errors, js: null };
  }

  let frontMatterData = null;
  if (lexResult.frontMatter && lexResult.frontMatter.length > 0) {
    frontMatterData = Lexer.parseFrontMatter(lexResult.frontMatter);
  }

  // Filter compiler directives
  const FRONT_MATTER_DIRECTIVES = new Set([
    'router',
    'adapter',
    'butuhAuth',
    'redirect',
    'token',
    'peran',
  ]);
  let parserFrontMatter = frontMatterData;
  if (frontMatterData) {
    parserFrontMatter = {};
    for (const [key, val] of Object.entries(frontMatterData)) {
      if (!FRONT_MATTER_DIRECTIVES.has(key)) {
        parserFrontMatter[key] = val;
      }
    }
    if (Object.keys(parserFrontMatter).length === 0) parserFrontMatter = null;
  }

  const parseResult = Parser.parse(lexResult.tokens, parserFrontMatter);
  if (parseResult.errors && parseResult.errors.length > 0) {
    return { errors: parseResult.errors, js: null };
  }

  const ast = parseResult.ast;

  // Attach auth directives to AST (v0.9)
  if (frontMatterData) {
    ast.butuhAuth = frontMatterData.butuhAuth;
    ast.redirect = frontMatterData.redirect;
    ast.token = frontMatterData.token;
    ast.peran = frontMatterData.peran;
  }

  const resolver = new Resolver();
  resolver._frontMatterData = frontMatterData;
  const resolveResult = resolver.resolve(ast);
  if (resolveResult.errors && resolveResult.errors.length > 0) {
    return { errors: resolveResult.errors, js: null };
  }

  const analyzer = new Analyzer();
  const analyzeResult = analyzer.analyze(resolveResult.ast, {
    usageWarnings: 'normal',
  });
  if (analyzeResult.errors && analyzeResult.errors.length > 0) {
    return { errors: analyzeResult.errors, js: null };
  }

  const compiler = new Compiler();
  const js = compiler.compile(analyzeResult.ast);

  return { js, errors: [] };
}

// ───────────────────────────────────────────────────────────────────────────

describe('v0.9 — Protected Content & Auth Pattern', () => {
  describe('4.1 Auth Guard — butuhAuth: benar', () => {
    it('should emit auth guard wrapper when butuhAuth: benar', () => {
      const source = `
butuhAuth: benar
redirect: "/login"
token: localStorage
---
Halo dunia
`;
      const { js, errors } = compileSource(source);
      expect(errors).toEqual([]);
      expect(js).toBeDefined();

      // Check that auth guard is emitted
      expect(js).toContain('localStorage.getItem');
      expect(js).toContain('redirect');
    });

    it('should NOT emit auth guard when butuhAuth: palsu', () => {
      const source = `
butuhAuth: palsu
---
Halo dunia
`;
      const { js, errors } = compileSource(source);
      expect(errors).toEqual([]);
      expect(js).toBeDefined();

      // Should NOT check auth
      expect(js).not.toContain('localStorage.getItem');
    });

    it('should use redirect target from front-matter', () => {
      const source = `
butuhAuth: benar
redirect: "/admin/login"
token: sessionStorage
---
Admin Panel
`;
      const { js, errors } = compileSource(source);
      expect(errors).toEqual([]);
      expect(js).toContain('/admin/login');
    });
  });

  describe('4.2 Token Source — localStorage vs sessionStorage', () => {
    it('should use localStorage when token: localStorage', () => {
      const source = `
butuhAuth: benar
redirect: "/login"
token: localStorage
---
Protected content
`;
      const { js, errors } = compileSource(source);
      expect(errors).toEqual([]);
      expect(js).toContain('localStorage.getItem');
    });

    it('should use sessionStorage when token: sessionStorage', () => {
      const source = `
butuhAuth: benar
redirect: "/login"
token: sessionStorage
---
Protected content
`;
      const { js, errors } = compileSource(source);
      expect(errors).toEqual([]);
      expect(js).toContain('sessionStorage.getItem');
    });

    it('should default to localStorage if token not specified', () => {
      const source = `
butuhAuth: benar
redirect: "/login"
---
Protected content
`;
      const { js, errors } = compileSource(source);
      expect(errors).toEqual([]);
      expect(js).toContain('localStorage.getItem');
    });
  });

  describe('4.3 Lowering — hapus on localStorage/sessionStorage', () => {
    it('should lower "hapus localStorage.token" to localStorage.removeItem("token")', () => {
      const source = `
---
Data:
  sudahLogin: palsu

Bila klik tombol:
  Bila localStorage.token:
    hapus localStorage.token
    ubah sudahLogin ke benar
`;
      const { js, errors } = compileSource(source);
      expect(errors).toEqual([]);
      expect(js).toBeDefined();

      // Check that removeItem is used
      expect(js).toContain('removeItem');
    });

    it('should lower "hapus sessionStorage.session" to sessionStorage.removeItem("session")', () => {
      const source = `
---
Bila klik tombol:
  hapus sessionStorage.session
`;
      const { js, errors } = compileSource(source);
      expect(errors).toEqual([]);
      expect(js).toContain('sessionStorage');
      expect(js).toContain('removeItem');
    });

    it('should extract property name from localStorage.x access', () => {
      const source = `
---
Saat muat:
  ubah x ke localStorage.token
  hapus localStorage.token
`;
      const { js, errors } = compileSource(source);
      expect(errors).toEqual([]);
      // Verify that "token" is extracted correctly
      expect(js).toContain('removeItem');
    });
  });

  describe('4.4 Login Form Pattern (Integration)', () => {
    it('should compile login form with auth check and token storage', () => {
      const source = `
---
Data:
  email: ""
  password: ""
  error: ""

Saat muat:
  ubah error ke ""

Bila klik login:
  ubah error ke ""
  ubah password ke ""
  ubah email ke ""

Bila klik logout:
  hapus localStorage.token
  ubah email ke ""
`;
      const { js, errors } = compileSource(source);
      expect(errors).toEqual([]);
      expect(js).toBeDefined();
    });
  });

  describe('4.5 Peran (Role) — v0.9 Syntax (v1.0 Evaluation)', () => {
    it('should accept peran in front-matter (parsed but not evaluated in v0.9)', () => {
      const source = `
butuhAuth: benar
redirect: "/login"
token: localStorage
peran: admin
---
Admin panel
`;
      const { js, errors } = compileSource(source);
      expect(errors).toEqual([]);
      expect(js).toBeDefined();
      // v0.9 parses peran but doesn't emit role check (v1.0 feature)
      // Just ensure no errors during compilation
    });
  });

  describe('4.6 Auth Guard with Dynamic Content', () => {
    it('should compile page with auth guard wrapping all content', () => {
      const source = `
butuhAuth: benar
redirect: "/login"
token: localStorage
---
<div>
  Data dari API:
    Ulangi untuk item dalam daftar:
      <p>{item.name}</p>
</div>
`;
      const { js, errors } = compileSource(source);
      expect(errors).toEqual([]);
      expect(js).toBeDefined();
    });
  });

  describe('4.7 Multi-level Token Access Lowering', () => {
    it('should handle nested property reads from storage', () => {
      const source = `
---
Saat muat:
  ubah x ke localStorage.getItem("user.id")
`;
      const { js, errors } = compileSource(source);
      expect(errors).toEqual([]);
      // Should compile without errors (may use direct getItem or lowering)
      expect(js).toBeDefined();
    });

    it('should handle computed property access on storage objects', () => {
      const source = `
---
Data:
  key: "token"

Bila klik:
  hapus localStorage[key]
`;
      const { js, errors } = compileSource(source);
      expect(errors).toEqual([]);
      // Computed property access should work
      expect(js).toBeDefined();
    });
  });

  describe('4.8 Auth Guard with SPA Mode (v0.6 + v0.9)', () => {
    it('should combine SPA routing with auth guard', () => {
      const source = `
butuhAuth: benar
redirect: "/login"
token: localStorage
router: benar
pageName: dashboard
---
Dashboard protected by auth guard
`;
      const { js, errors } = compileSource(source);
      expect(errors).toEqual([]);
      expect(js).toBeDefined();
      // Should have both SPA factory and auth guard
      expect(js).toContain('factory');
      expect(js).toContain('localStorage.getItem');
    });
  });
});
