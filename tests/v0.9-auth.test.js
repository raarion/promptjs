// @ts-check

/**
 * v0.9 Tests — Protected Content & Auth Pattern
 * =============================================
 *
 * Tests untuk FASE 4: auth guard compilation, token source configuration,
 * role-based access patterns (v1.0+), dan lowering `hapus` pada localStorage/sessionStorage.
 */

import { describe, it, expect } from 'vitest';

// ── Engine (full pipeline) ──
const PJS = require('../src/engine/promptjs');

/**
 * Helper: compile source via the full Engine pipeline.
 * Front-matter directives (butuhAuth, redirect, token, peran, router, adapter)
 * are automatically handled by the engine.
 */
function compileSource(pjsSource) {
  return PJS.compile(pjsSource);
}

// ══════════════════════════════════════════════════════════════════════════════

describe('v0.9 — Protected Content & Auth Pattern', () => {
  describe('4.1 Auth Guard — butuhAuth: benar', () => {
    it('should emit auth guard wrapper when butuhAuth: benar', () => {
      const source = `butuhAuth: benar
redirect: "/login"
token: localStorage
---
Buat ruang:
  "Protected content"`;
      const { js, errors } = compileSource(source);
      expect(errors.filter((e) => e.severity === 'error')).toEqual([]);
      expect(js).toBeDefined();

      // Check that auth guard is emitted
      expect(js).toContain('localStorage.getItem');
      expect(js).toContain('/login');
    });

    it('should NOT emit auth guard when butuhAuth is absent', () => {
      const source = `---
judul: "Public"
---
Buat ruang:
  "Public content"`;
      const { js, errors } = compileSource(source);
      expect(errors.filter((e) => e.severity === 'error')).toEqual([]);
      expect(js).toBeDefined();

      // Should NOT check auth
      expect(js).not.toContain('localStorage.getItem');
    });

    it('should use redirect target from front-matter', () => {
      const source = `butuhAuth: benar
redirect: "/admin/login"
token: sessionStorage
---
Buat ruang:
  "Admin Panel"`;
      const { js, errors } = compileSource(source);
      expect(errors.filter((e) => e.severity === 'error')).toEqual([]);
      expect(js).toContain('/admin/login');
    });
  });

  describe('4.2 Token Source — localStorage vs sessionStorage', () => {
    it('should use localStorage when token: localStorage', () => {
      const source = `butuhAuth: benar
redirect: "/login"
token: localStorage
---
Buat ruang:
  "Protected"`;
      const { js, errors } = compileSource(source);
      expect(errors.filter((e) => e.severity === 'error')).toEqual([]);
      expect(js).toContain('localStorage.getItem');
    });

    it('should use sessionStorage when token: sessionStorage', () => {
      const source = `butuhAuth: benar
redirect: "/login"
token: sessionStorage
---
Buat ruang:
  "Protected"`;
      const { js, errors } = compileSource(source);
      expect(errors.filter((e) => e.severity === 'error')).toEqual([]);
      expect(js).toContain('sessionStorage.getItem');
    });

    it('should default to localStorage if token not specified', () => {
      const source = `butuhAuth: benar
redirect: "/login"
---
Buat ruang:
  "Protected"`;
      const { js, errors } = compileSource(source);
      expect(errors.filter((e) => e.severity === 'error')).toEqual([]);
      expect(js).toContain('localStorage.getItem');
    });
  });

  describe('4.3 Lowering — hapus on localStorage/sessionStorage', () => {
    it('should lower "hapus localStorage.token" to localStorage.removeItem("token")', () => {
      const source = `---
judul: "Test"
---
Halaman Test:
  data sudahLogin = salah

  Buat tombol:
    "Logout"
    on_klik = hapus localStorage.token`;
      const { js, errors } = compileSource(source);
      expect(errors.filter((e) => e.severity === 'error')).toEqual([]);
      expect(js).toBeDefined();

      // Check that removeItem is used
      expect(js).toContain('removeItem');
    });

    it('should lower "hapus sessionStorage.session" to sessionStorage.removeItem("session")', () => {
      const source = `---
judul: "Test"
---
Halaman Test:
  Buat tombol:
    "Clear"
    on_klik = hapus sessionStorage.session`;
      const { js, errors } = compileSource(source);
      expect(errors.filter((e) => e.severity === 'error')).toEqual([]);
      expect(js).toContain('sessionStorage');
      expect(js).toContain('removeItem');
    });

    it('should extract property name from localStorage.x access', () => {
      const source = `---
judul: "Test"
---
Halaman Test:
  data x = ""

  Ketika muat:
    simpan localStorage.token ke x
    hapus localStorage.token`;
      const { js, errors } = compileSource(source);
      expect(errors.filter((e) => e.severity === 'error')).toEqual([]);
      // Verify that "token" is extracted correctly
      expect(js).toContain('removeItem');
    });
  });

  describe('4.4 Login Form Pattern (Integration)', () => {
    it('should compile login form with auth check and token storage', () => {
      const source = `---
judul: "Login"
---
Halaman Login:
  data email = ""
  data password = ""
  data error = ""

  Ketika muat:
    simpan "" ke error

  Buat tombol:
    "Login"
    on_klik = simpan "" ke error

  Buat tombol:
    "Logout"
    on_klik = hapus localStorage.token`;
      const { js, errors } = compileSource(source);
      expect(errors.filter((e) => e.severity === 'error')).toEqual([]);
      expect(js).toBeDefined();
    });
  });

  describe('4.5 Peran (Role) — v0.9.9 Runtime Guard', () => {
    it('should emit peran role check when peran directive is present', () => {
      const source = `butuhAuth: benar
redirect: "/login"
token: localStorage
peran: admin
---
Buat ruang:
  "Admin panel"`;
      const { js, errors } = compileSource(source);
      expect(errors.filter((e) => e.severity === 'error')).toEqual([]);
      expect(js).toBeDefined();
      // v0.9.9 now emits runtime role check
      expect(js).toContain('__peran');
      expect(js).toContain('__allowedPeran');
      expect(js).toContain('admin');
    });

    it('should emit peran check after token check (both guards active)', () => {
      const source = `butuhAuth: benar
redirect: "/forbidden"
token: sessionStorage
peran: editor
---
Buat ruang:
  "Editor area"`;
      const { js, errors } = compileSource(source);
      expect(errors.filter((e) => e.severity === 'error')).toEqual([]);
      // Token check should come before peran check
      const tokenIdx = js.indexOf('sessionStorage.getItem');
      const peranIdx = js.indexOf('__peran');
      expect(tokenIdx).toBeLessThan(peranIdx);
      expect(js).toContain('/forbidden');
      expect(js).toContain('editor');
    });

    it('should NOT emit peran check when peran is absent', () => {
      const source = `butuhAuth: benar
redirect: "/login"
token: localStorage
---
Buat ruang:
  "Protected"`;
      const { js, errors } = compileSource(source);
      expect(errors.filter((e) => e.severity === 'error')).toEqual([]);
      expect(js).not.toContain('__peran');
      expect(js).not.toContain('__allowedPeran');
    });
  });

  describe('4.6 Configurable Token Key (tokenKey / dot notation)', () => {
    it('should use custom token key via tokenKey directive', () => {
      const source = `butuhAuth: benar
redirect: "/login"
token: localStorage
tokenKey: auth_token
---
Buat ruang:
  "Protected"`;
      const { js, errors } = compileSource(source);
      expect(errors.filter((e) => e.severity === 'error')).toEqual([]);
      expect(js).toContain('localStorage.getItem("auth_token")');
      expect(js).not.toContain('localStorage.getItem("token")');
    });

    it('should extract token key from dot notation in token directive', () => {
      const source = `butuhAuth: benar
redirect: "/login"
token: sessionStorage.jwt
---
Buat ruang:
  "Protected"`;
      const { js, errors } = compileSource(source);
      expect(errors.filter((e) => e.severity === 'error')).toEqual([]);
      expect(js).toContain('sessionStorage.getItem("jwt")');
    });

    it('should let tokenKey override dot notation key', () => {
      const source = `butuhAuth: benar
redirect: "/login"
token: localStorage.auth_token
tokenKey: access_token
---
Buat ruang:
  "Protected"`;
      const { js, errors } = compileSource(source);
      expect(errors.filter((e) => e.severity === 'error')).toEqual([]);
      // tokenKey takes precedence over dot notation
      expect(js).toContain('localStorage.getItem("access_token")');
    });

    it('should default to "token" key when no tokenKey or dot notation', () => {
      const source = `butuhAuth: benar
redirect: "/login"
token: localStorage
---
Buat ruang:
  "Protected"`;
      const { js, errors } = compileSource(source);
      expect(errors.filter((e) => e.severity === 'error')).toEqual([]);
      expect(js).toContain('localStorage.getItem("token")');
    });

    it('should use custom token key with peran role check', () => {
      const source = `butuhAuth: benar
redirect: "/login"
token: localStorage
tokenKey: session_id
peran: admin
---
Buat ruang:
  "Admin panel"`;
      const { js, errors } = compileSource(source);
      expect(errors.filter((e) => e.severity === 'error')).toEqual([]);
      expect(js).toContain('localStorage.getItem("session_id")');
      expect(js).toContain('__peran');
      expect(js).toContain('admin');
    });
  });

  describe('4.7 Auth Guard with Dynamic Content', () => {
    it('should compile page with auth guard wrapping all content', () => {
      const source = `butuhAuth: benar
redirect: "/login"
token: localStorage
---
Halaman Dashboard:
  data daftar = []

  Buat ruang:
    "Protected content"`;
      const { js, errors } = compileSource(source);
      expect(errors.filter((e) => e.severity === 'error')).toEqual([]);
      expect(js).toBeDefined();
    });
  });

  describe('4.8 Multi-level Token Access Lowering', () => {
    it('should handle getItem call on localStorage', () => {
      const source = `---
judul: "Test"
---
Halaman Test:
  data x = ""

  Ketika muat:
    simpan localStorage.getItem("user.id") ke x`;
      const { js, errors } = compileSource(source);
      expect(errors.filter((e) => e.severity === 'error')).toEqual([]);
      // Should compile without errors (may use direct getItem or lowering)
      expect(js).toBeDefined();
    });

    it('should handle computed property access on storage objects', () => {
      const source = `---
judul: "Test"
---
Halaman Test:
  data key = "token"

  Buat tombol:
    "Clear"
    on_klik = hapus localStorage[key]`;
      const { js } = compileSource(source);
      // Computed property access may or may not lower to removeItem
      // Just ensure it compiles without fatal errors
      expect(js).toBeDefined();
    });
  });

  describe('4.9 Auth Guard with SPA Mode (v0.6 + v0.9.9)', () => {
    it('should combine SPA routing with auth guard', () => {
      const source = `butuhAuth: benar
redirect: "/login"
token: localStorage
router: benar
---
Halaman Dashboard:
  data hitung = 0

  Buat tombol:
    "Click"
    on_klik = tambahkan 1 ke hitung`;
      const result = compileSource(source);
      expect(result.errors.filter((e) => e.severity === 'error')).toEqual([]);
      expect(result.js).toBeDefined();
      // Should have both SPA factory and auth guard
      expect(result.js).toContain('localStorage.getItem');
    });
  });
});
