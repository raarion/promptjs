// @ts-check
/**
 * v0.5.0 FASE 0 — Compiler Infrastructure Verification Tests
 * ============================================================================
 * Tests for:
 *   0.1 Source Maps (V3 + VLQ encoding)
 *   0.2 Tree Shaking Runtime Helpers
 *   0.3 Error Boundaries (try/catch in event handlers)
 */

import { describe, it, expect } from 'vitest';
import { compile } from '../src/engine/promptjs.js';
import Codegen from '../src/compiler/utils/codegen.js';
import RuntimeEmitter from '../src/compiler/emitters/runtime.js';

// ─── Helper ─────────────────────────────────────────────────────────────────

/** Compile and return JS + sourceMap */
function compileWithMap(source) {
  return compile(source, { source: 'test.pjs', dev: true });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 0.1 SOURCE MAPS
// ═══════════════════════════════════════════════════════════════════════════════

describe('v0.5 — 0.1 Source Maps', () => {
  describe('VLQ encoding (codegen.js)', () => {
    it('encodes zero correctly', () => {
      expect(Codegen.encodeVLQ(0)).toBe('A');
    });

    it('encodes positive integers', () => {
      // 1 → sign=0, value=1 → binary 000010 → VLQ = 000010 → AAB... wait let me think
      // value=1: vlq = 1 << 1 = 2 (binary: 000010)
      // digit = 2 & 0x1F = 2, vlq >>>= 5 → 0
      // VLQ_BASE64[2] = 'C'
      expect(Codegen.encodeVLQ(1)).toBe('C');
    });

    it('encodes negative integers', () => {
      // value=-1: vlq = ((-(-1)) << 1) | 1 = (1 << 1) | 1 = 3
      // digit = 3 & 0x1F = 3, vlq >>>= 5 → 0
      // VLQ_BASE64[3] = 'D'
      expect(Codegen.encodeVLQ(-1)).toBe('D');
    });

    it('encodes larger values with continuation bit', () => {
      // value=16: vlq = 16 << 1 = 32 (binary: 100000)
      // digit = 32 & 0x1F = 0, continuation = 1, so digit = 0x20 = 32
      //   → VLQ_BASE64[32] = 'g'
      // vlq = 32 >>> 5 = 1
      // digit = 1 & 0x1F = 1, vlq >>>= 5 → 0
      //   → VLQ_BASE64[1] = 'B'
      // Result: 'gB'
      expect(Codegen.encodeVLQ(16)).toBe('gB');
    });
  });

  describe('Source Map V3 structure', () => {
    it('returns a valid source map object from compile()', () => {
      const result = compile('Buat h1: "Hello"');
      expect(result.success).toBe(true);
      expect(result.sourceMap).not.toBeNull();
      expect(result.sourceMap.version).toBe(3);
      expect(result.sourceMap.sources.length).toBeGreaterThan(0);
      expect(typeof result.sourceMap.mappings).toBe('string');
      expect(result.sourceMap.names).toEqual([]);
    });

    it('uses default source name when no file is given', () => {
      const result = compile('Buat p: "test"');
      expect(result.sourceMap.file).toBe('promptjs');
      expect(result.sourceMap.sources).toContain('promptjs');
    });

    it('has mappings for statements with source locations', () => {
      const result = compileWithMap('Buat h1: "Hello"\nBuat p: "World"');
      expect(result.success).toBe(true);
      // Mappings should contain semicolons (one per output line with mapping)
      const mappings = result.sourceMap.mappings;
      // At least some non-empty segments should exist
      const segments = mappings.split(';').filter((s) => s.length > 0);
      expect(segments.length).toBeGreaterThan(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 0.2 TREE SHAKING RUNTIME HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

describe('v0.5 — 0.2 Tree Shaking Runtime Helpers', () => {
  it('omits all runtime helpers when only static DOM is used', () => {
    const result = compile('Buat h1: "Halo"\nBuat p: "Dunia"');
    expect(result.success).toBe(true);
    // Should NOT contain any runtime helper functions
    expect(result.js).not.toContain('__createReactive');
    expect(result.js).not.toContain('__createComputed');
    expect(result.js).not.toContain('__watch');
    expect(result.js).not.toContain('__setState');
    expect(result.js).not.toContain('__cleanup');
    expect(result.js).not.toContain('__pjs_handleError');
    expect(result.js).not.toContain('__subscribers');
    expect(result.js).not.toContain('__effectMap');
    // Count lines — should be small for static DOM only
    const lineCount = result.js.split('\n').length;
    expect(lineCount).toBeLessThan(40);
  });

  it('includes only __createReactive when data is used', () => {
    const result = compile('data hitung = 0\nBuat h1: "Counter"');
    expect(result.success).toBe(true);
    expect(result.js).toContain('__createReactive');
    // Should include reactive infra
    expect(result.js).toContain('__subscribers');
    expect(result.js).toContain('__effectMap');
    // Should NOT include helpers not used
    expect(result.js).not.toContain('__createComputed');
    expect(result.js).not.toContain('__watch');
    expect(result.js).not.toContain('__cleanup');
  });

  it('includes __createComputed + __createReactive for turunan', () => {
    const result = compile('data hitung = 0\nturunan ganda = hitung * 2\nBuat p: ganda');
    expect(result.success).toBe(true);
    expect(result.js).toContain('__createReactive');
    expect(result.js).toContain('__createComputed');
    expect(result.js).not.toContain('__watch');
    expect(result.js).not.toContain('__cleanup');
  });

  it('includes __watch for saat statement', () => {
    const result = compile(
      'data nama = "Andi"\nBuat p #info:\n    saat nama:\n        teks = nama'
    );
    expect(result.success).toBe(true);
    expect(result.js).toContain('__createReactive');
    expect(result.js).toContain('__watch');
  });

  it('includes __pjs_handleError only when events are used', () => {
    const result = compile('Buat tombol:\n    "Klik"\n    on_klik = alert("hai")');
    expect(result.success).toBe(true);
    expect(result.js).toContain('__pjs_handleError');
    // Static-only helpers should NOT appear
    expect(result.js).not.toContain('__createReactive');
    expect(result.js).not.toContain('__watch');
  });

  it('static-only output is significantly smaller than full-reactive', () => {
    const staticResult = compile('Buat h1: "Halo"\nBuat p: "Dunia"');
    const reactiveResult = compile(
      'data hitung = 0\nturunan ganda = hitung * 2\n' +
        'Buat tombol:\n    "Klik"\n    on_klik = alert(hitung)'
    );

    expect(staticResult.success).toBe(true);
    expect(reactiveResult.success).toBe(true);
    const staticSize = staticResult.js.length;
    const reactiveSize = reactiveResult.js.length;
    // Static output should be at least 2x smaller
    expect(staticSize).toBeLessThan(reactiveSize / 2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 0.3 ERROR BOUNDARIES
// ═══════════════════════════════════════════════════════════════════════════════

describe('v0.5 — 0.3 Error Boundaries', () => {
  it('wraps event handler body in try/catch', () => {
    const result = compile('Buat tombol:\n    "Klik"\n    on_klik = alert("hi")');
    expect(result.success).toBe(true);
    // Must have try/catch in the event listener
    expect(result.js).toContain('try {');
    expect(result.js).toContain('} catch(__e) {');
    expect(result.js).toContain('__pjs_handleError(__e,');
    expect(result.js).toContain('__pjs_handleError');
  });

  it('error boundary context includes event hook name', () => {
    const result = compile('Buat tombol:\n    "Klik"\n    on_klik = alert("hi")');
    expect(result.success).toBe(true);
    // Should reference the specific event hook
    expect(result.js).toContain('"on_diklik"');
  });

  it('error boundary is NOT present when no events are used', () => {
    const result = compile('Buat h1: "Hello"');
    expect(result.success).toBe(true);
    expect(result.js).not.toContain('try {');
    expect(result.js).not.toContain('__pjs_handleError');
  });

  it('error boundary helper has correct structure', () => {
    // Verify the __pjs_handleError helper exists in the runtime map
    const helperCode = RuntimeEmitter.RUNTIME_HELPER_MAP.__pjs_handleError;
    expect(helperCode).toBeDefined();
    expect(helperCode).toContain('console.error');
    expect(helperCode).toContain('[PromptJS]');
    expect(helperCode).toContain('__pjsClearError');
  });

  it('multiple events each get their own error boundary', () => {
    const result = compile(
      'Buat tombol:\n    "Klik"\n    on_klik = alert("klik")\n    on_hover = alert("hover")'
    );
    expect(result.success).toBe(true);
    // Count try/catch occurrences — should be 2 (one per event)
    const tryMatches = result.js.match(/try \{/g);
    expect(tryMatches).not.toBeNull();
    expect(tryMatches.length).toBe(2);
    const catchMatches = result.js.match(/catch\(__e\)/g);
    expect(catchMatches).not.toBeNull();
    expect(catchMatches.length).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BACKWARD COMPATIBILITY — 100% existing tests still pass
// ═══════════════════════════════════════════════════════════════════════════════

describe('v0.5 — Backward Compatibility', () => {
  it('compile result includes sourceMap property', () => {
    const result = compile('Buat h1: "test"');
    expect(result).toHaveProperty('sourceMap');
    expect(result).toHaveProperty('js');
    expect(result).toHaveProperty('css');
    expect(result).toHaveProperty('errors');
    expect(result).toHaveProperty('warnings');
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('ast');
  });

  it('legacy RUNTIME_HELPERS monolith still exported', () => {
    expect(RuntimeEmitter.RUNTIME_HELPERS).toBeDefined();
    expect(typeof RuntimeEmitter.RUNTIME_HELPERS).toBe('string');
    expect(RuntimeEmitter.RUNTIME_HELPERS.length).toBeGreaterThan(0);
    expect(RuntimeEmitter.RUNTIME_HELPERS).toContain('__createReactive');
  });

  it('RUNTIME_HELPER_MAP has all expected helpers', () => {
    const map = RuntimeEmitter.RUNTIME_HELPER_MAP;
    expect(map.__createReactive).toBeDefined();
    expect(map.__createComputed).toBeDefined();
    expect(map.__watch).toBeDefined();
    expect(map.__setState).toBeDefined();
    expect(map.__cleanup).toBeDefined();
    expect(map.__pjs_handleError).toBeDefined();
    expect(map.__promptjs_panjang).toBeDefined();
    expect(map.__promptjs_apakahKosong).toBeDefined();
    expect(map.__promptjs_apakahAda).toBeDefined();
  });
});
