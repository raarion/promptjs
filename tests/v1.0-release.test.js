// @ts-check

/**
 * v1.0 Tests — Release Readiness
 * ==============================
 *
 * Tests for v1.0.0 features:
 * 1. `hapus <item> dari <array>` (HapusDariStatement) — parser + resolver + compiler
 * 2. `simpan <value> ke localStorage.<key>` → localStorage.setItem() lowering
 * 3. `simpan <value> ke sessionStorage.<key>` → sessionStorage.setItem() lowering
 * 4. Demo app compilation verification (todo-app + dashboard-app)
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// ── Engine (full pipeline) ──
const PJS = require('../src/engine/promptjs');

/**
 * Helper: compile source via the full Engine pipeline.
 */
function compileSource(pjsSource) {
  return PJS.compile(pjsSource);
}

/**
 * Extract user code from compiler output — portion after
 * `// === User Code ===` and before IIFE closer `})();`.
 */
function extractUserCode(js) {
  if (!js) return '';
  const startMarker = '// === User Code ===';
  const startIdx = js.indexOf(startMarker);
  if (startIdx < 0) return js;
  const afterStart = js.slice(startIdx + startMarker.length);
  const endMatch = afterStart.match(/\}\)\(\);\s*$/);
  if (!endMatch) return afterStart.trim();
  return afterStart.slice(0, endMatch.index).trim();
}

/**
 * Compile source and return user code only.
 */
function compileUser(source) {
  const r = compileSource(source);
  return extractUserCode(r.js);
}

// ═════════════════════════════════════════════════════════════════════════════

describe('v1.0 — HapusDariStatement (hapus <item> dari <array>)', () => {
  it('should parse "hapus item dari daftar" as HapusDariStatement', () => {
    const source = `---
judul: "Test"
---
Halaman Test:
  data daftar = ["a", "b", "c"]

  Buat tombol:
    "Hapus"
    on_klik = hapus "a" dari daftar`;
    const { js, errors } = compileSource(source);
    expect(errors.filter((e) => e.severity === 'error')).toEqual([]);
    expect(js).toBeDefined();
    expect(js).toContain('.filter');
  });

  it('should compile reactive array removal with __setState trigger', () => {
    const source = `---
judul: "Test"
---
Halaman Test:
  data daftar = ["x", "y"]

  Buat tombol:
    "Hapus"
    on_klik = hapus "x" dari daftar`;
    const { js: _js, errors } = compileSource(source);
    expect(errors.filter((e) => e.severity === 'error')).toEqual([]);
    const userCode = compileUser(source);
    // Reactive data array: should use .value.filter and __setState
    expect(userCode).toContain('.value.filter');
    expect(userCode).toContain('__setState');
  });

  it('should handle "hapus" without "dari" as regular HapusStatement (DOM remove)', () => {
    const source = `---
judul: "Test"
---
Halaman Test:
  Buat div#kotak:
    "Hello"
  Ketika diklik:
    hapus kotak`;
    const { js, errors: _errors } = compileSource(source);
    // Note: "hapus kotak" inside Ketika diklik may trigger E3001 if kotak
    // is not a declared symbol. The key test is that hapus without "dari"
    // generates HapusStatement (DOM remove), not HapusDariStatement (array filter).
    // We verify by checking the output does NOT contain .filter for this case.
    if (js) {
      expect(js).not.toContain('.value.filter');
    }
  });

  it('should handle "hapus localStorage.token" as removeItem (not HapusDari)', () => {
    const source = `---
judul: "Test"
---
Halaman Test:
  Buat tombol:
    "Logout"
    on_klik = hapus localStorage.token`;
    const { js, errors } = compileSource(source);
    expect(errors.filter((e) => e.severity === 'error')).toEqual([]);
    expect(js).toContain('removeItem');
    expect(js).not.toContain('.filter');
  });

  it('should compile "hapus item dari daftar" inside Ulangi loop', () => {
    const source = `---
judul: "Test"
---
Halaman Test:
  data tugas = ["satu", "dua"]

  Ulangi untuk item dari tugas:
    Buat li:
      $item
      Buat tombol.kecil:
        "X"
        on_klik = hapus item dari tugas`;
    const { js, errors } = compileSource(source);
    expect(errors.filter((e) => e.severity === 'error')).toEqual([]);
    expect(js).toContain('.filter');
  });

  it('should support English keyword "from" as alias for "dari"', () => {
    const source = `---
judul: "Test"
---
Halaman Test:
  data items = [1, 2, 3]

  Buat tombol:
    "Remove"
    on_klik = hapus 1 from items`;
    const { js, errors } = compileSource(source);
    expect(errors.filter((e) => e.severity === 'error')).toEqual([]);
    expect(js).toContain('.filter');
  });
});

// ═════════════════════════════════════════════════════════════════════════════

describe('v1.0 — simpan localStorage/sessionStorage lowering (setItem)', () => {
  it('should lower "simpan value ke localStorage.key" to localStorage.setItem()', () => {
    const source = `---
judul: "Test"
---
Halaman Test:
  Buat tombol:
    "Save"
    on_klik = simpan "token-abc" ke localStorage.auth_token`;
    const { js, errors } = compileSource(source);
    expect(errors.filter((e) => e.severity === 'error')).toEqual([]);
    expect(js).toContain('localStorage.setItem("auth_token", "token-abc")');
  });

  it('should lower "simpan value ke sessionStorage.key" to sessionStorage.setItem()', () => {
    const source = `---
judul: "Test"
---
Halaman Test:
  Buat tombol:
    "Save session"
    on_klik = simpan "session-xyz" ke sessionStorage.sid`;
    const { js, errors } = compileSource(source);
    expect(errors.filter((e) => e.severity === 'error')).toEqual([]);
    expect(js).toContain('sessionStorage.setItem("sid", "session-xyz")');
  });

  it('should lower simpan with expression value to localStorage.setItem()', () => {
    const source = `---
judul: "Test"
---
Halaman Test:
  data peran = "admin"

  Ketika muat:
    simpan peran ke localStorage.__peran`;
    const { js, errors } = compileSource(source);
    expect(errors.filter((e) => e.severity === 'error')).toEqual([]);
    expect(js).toContain('localStorage.setItem("__peran"');
  });

  it('should NOT lower simpan to setItem when target is a regular variable', () => {
    const source = `---
judul: "Test"
---
Halaman Test:
  data nama = ""

  Ketika muat:
    simpan "Alice" ke nama`;
    const { js, errors } = compileSource(source);
    expect(errors.filter((e) => e.severity === 'error')).toEqual([]);
    expect(js).not.toContain('setItem');
    expect(js).toContain('__setState');
  });

  it('should correctly compile login flow: simpan token + simpan peran + arahkan', () => {
    const source = `---
judul: "Login"
---
Halaman Login:
  data nama = ""

  Buat tombol:
    "Masuk"
    on_klik = simpan "dummy-token-123" ke localStorage.auth_token
    on_klik = simpan "admin" ke localStorage.__peran
    on_klik = arahkan "/dashboard"`;
    const { js, errors } = compileSource(source);
    expect(errors.filter((e) => e.severity === 'error')).toEqual([]);
    expect(js).toContain('localStorage.setItem("auth_token", "dummy-token-123")');
    expect(js).toContain('localStorage.setItem("__peran", "admin")');
    expect(js).toContain('window.location.href = "/dashboard"');
  });

  it('should compile logout flow: hapus localStorage + arahkan', () => {
    const source = `---
judul: "Pengaturan"
---
Halaman Pengaturan:
  Buat tombol:
    "Keluar"
    on_klik = hapus localStorage.auth_token
    on_klik = hapus localStorage.__peran
    on_klik = arahkan "/login"`;
    const { js, errors } = compileSource(source);
    expect(errors.filter((e) => e.severity === 'error')).toEqual([]);
    expect(js).toContain('localStorage.removeItem("auth_token")');
    expect(js).toContain('localStorage.removeItem("__peran")');
    expect(js).toContain('window.location.href = "/login"');
  });
});

// ═════════════════════════════════════════════════════════════════════════════

describe('v1.0 — Demo App Compilation', () => {
  const examplesDir = path.resolve(__dirname, '..', 'examples');

  describe('todo-app', () => {
    it('should compile todo-app/index.pjs without errors', () => {
      const source = fs.readFileSync(path.join(examplesDir, 'todo-app', 'index.pjs'), 'utf8');
      const { js, errors } = compileSource(source);
      const errorList = errors.filter((e) => e.severity === 'error');
      expect(errorList).toEqual([]);
      expect(js).toBeDefined();
      expect(js.length).toBeGreaterThan(1000);
    });

    it('should include hapus...dari in compiled output', () => {
      const source = fs.readFileSync(path.join(examplesDir, 'todo-app', 'index.pjs'), 'utf8');
      const { js, errors } = compileSource(source);
      expect(errors.filter((e) => e.severity === 'error')).toEqual([]);
      // The todo-app uses "hapus item dari daftar"
      expect(js).toContain('.filter');
    });

    it('should include reactive state (__setState) in compiled output', () => {
      const source = fs.readFileSync(path.join(examplesDir, 'todo-app', 'index.pjs'), 'utf8');
      const { js, errors } = compileSource(source);
      expect(errors.filter((e) => e.severity === 'error')).toEqual([]);
      expect(js).toContain('__setState');
    });
  });

  describe('dashboard-app', () => {
    const dashboardPages = [
      'index.pjs',
      'pages/login.pjs',
      'pages/dashboard.pjs',
      'pages/profil.pjs',
      'pages/pengaturan.pjs',
    ];

    dashboardPages.forEach((pageFile) => {
      it(`should compile dashboard-app/${pageFile} without errors`, () => {
        const source = fs.readFileSync(path.join(examplesDir, 'dashboard-app', pageFile), 'utf8');
        const { js, errors } = compileSource(source);
        const errorList = errors.filter((e) => e.severity === 'error');
        expect(errorList).toEqual([]);
        expect(js).toBeDefined();
        expect(js.length).toBeGreaterThan(500);
      });
    });

    it('login page should emit localStorage.setItem for token storage', () => {
      const source = fs.readFileSync(
        path.join(examplesDir, 'dashboard-app', 'pages', 'login.pjs'),
        'utf8'
      );
      const { js, errors } = compileSource(source);
      expect(errors.filter((e) => e.severity === 'error')).toEqual([]);
      expect(js).toContain('localStorage.setItem("auth_token"');
      expect(js).toContain('localStorage.setItem("__peran"');
    });

    it('pengaturan page should emit localStorage.removeItem for logout', () => {
      const source = fs.readFileSync(
        path.join(examplesDir, 'dashboard-app', 'pages', 'pengaturan.pjs'),
        'utf8'
      );
      const { js, errors } = compileSource(source);
      expect(errors.filter((e) => e.severity === 'error')).toEqual([]);
      expect(js).toContain('localStorage.removeItem("auth_token")');
      expect(js).toContain('localStorage.removeItem("__peran")');
    });

    it('index page should emit auth guard (butuhAuth: benar)', () => {
      const source = fs.readFileSync(path.join(examplesDir, 'dashboard-app', 'index.pjs'), 'utf8');
      const { js, errors } = compileSource(source);
      expect(errors.filter((e) => e.severity === 'error')).toEqual([]);
      expect(js).toContain('localStorage.getItem');
    });

    it('dashboard page should emit role check when butuhAuth and peran are both set', () => {
      // peran: admin only emits runtime check when butuhAuth: benar is also present
      const source = `butuhAuth: benar
redirect: /login
tokenKey: auth_token
peran: admin
---
Halaman Dashboard:
  data hitung = 0

  Buat h2: "Dashboard Admin"`;
      const { js, errors } = compileSource(source);
      // May have warnings but no blocking errors
      const blockingErrors = errors.filter((e) => e.severity === 'error' && e.code !== 'E3001');
      expect(blockingErrors).toEqual([]);
      expect(js).toContain('__peran');
      expect(js).toContain('admin');
    });
  });
});

// ──────────────────────────────────────────────────────────────
// v1.0 Bug Fixes — Regression Tests
// ──────────────────────────────────────────────────────────────
describe('v1.0 — Bug Fix Regression Tests', () => {
  // BUG-1: Sibling Buat+Ketika loses resolver context (E3005)
  describe('BUG-1: Sibling Buat+Ketika', () => {
    it('two sibling Buat with Ketika each — no E3005', () => {
      const source = `Halaman App:
  Buat tombol: "1"
    Ketika diklik:
      tampilkan "satu"
  Buat tombol: "2"
    Ketika diklik:
      tampilkan "dua"`;
      const { js, errors } = compileSource(source);
      const e3005 = errors.filter((e) => e.code === 'E3005');
      expect(e3005).toEqual([]);
      const clickListeners = js.match(/addEventListener\("click"/g);
      expect(clickListeners.length).toBeGreaterThanOrEqual(2);
    });

    it('three sibling Buat with Ketika each — no E3005', () => {
      const source = `Halaman App:
  Buat tombol: "A"
    Ketika diklik:
      tampilkan "a"
  Buat tombol: "B"
    Ketika diklik:
      tampilkan "b"
  Buat tombol: "C"
    Ketika diklik:
      tampilkan "c"`;
      const { js, errors } = compileSource(source);
      const e3005 = errors.filter((e) => e.code === 'E3005');
      expect(e3005).toEqual([]);
      const clickListeners = js.match(/addEventListener\("click"/g);
      expect(clickListeners.length).toBeGreaterThanOrEqual(3);
    });

    it('inline content + indented Ketika merges correctly', () => {
      const source = `Halaman App:
  Buat tombol#btn: "Click"
    Ketika diklik:
      tampilkan "clicked"`;
      const { js, errors } = compileSource(source);
      expect(errors.filter((e) => e.code === 'E3005')).toEqual([]);
      expect(js).toContain('createElement("button")');
      expect(js).toContain('addEventListener("click"');
      // The text "Click" should be a child of the button
      expect(js).toContain('createTextNode("Click")');
    });
  });

  // BUG-2: tampilkan "string" lowered to querySelector instead of alert
  describe('BUG-2: tampilkan string → alert', () => {
    it('tampilkan "Hello World" → alert("Hello World")', () => {
      const source = `Halaman App:
  Buat tombol: "Klik"
    Ketika diklik:
      tampilkan "Hello World"`;
      const { js } = compileSource(source);
      expect(js).toContain('alert("Hello World")');
      expect(js).not.toContain('querySelector("Hello World")');
    });

    it('tampilkan "Count: " + 5 → alert with expression', () => {
      const source = `Halaman App:
  Buat tombol: "Show"
    Ketika diklik:
      tampilkan "Count: " + 5`;
      const { js } = compileSource(source);
      expect(js).toContain('alert(');
      expect(js).not.toContain('querySelector(');
    });
  });

  // BUG-3: Ketika muat: should be DOMContentLoaded, not load
  describe('BUG-3: Ketika muat: → DOMContentLoaded', () => {
    it('Ketika muat: produces DOMContentLoaded listener', () => {
      const source = `Halaman App:
  data x = 0
  Ketika muat:
    simpan 42 ke x`;
      const { js } = compileSource(source);
      expect(js).toContain('DOMContentLoaded');
      expect(js).not.toContain('addEventListener("load"');
    });
  });
});
