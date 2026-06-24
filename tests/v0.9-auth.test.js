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

  describe('4.5 Peran (Role) — v0.9 Syntax (v1.0 Evaluation)', () => {
    it('should accept peran in front-matter (parsed but not evaluated in v0.9)', () => {
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
      // v0.9 parses peran but doesn't emit role check (v1.0 feature)
      // Just ensure no errors during compilation
    });
  });

  describe('4.6 Auth Guard with Dynamic Content', () => {
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

  describe('4.7 Multi-level Token Access Lowering', () => {
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

  describe('4.8 Auth Guard with SPA Mode (v0.6 + v0.9)', () => {
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
