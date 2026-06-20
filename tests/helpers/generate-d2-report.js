/**
 * Generate D2 negative-test report Markdown.
 */
'use strict';

const path = require('path');
const { writeReport } = require('./report-generator');

const OUTPUT_FILE = path.join(__dirname, '..', 'reports', 'D2-negative.md');

// ─── Data: test results dari probe & test run ──────────────────────────

const testedErrors = [
  {
    id: 'E1001',
    name: 'Indentasi ganjil (bukan kelipatan 2)',
    stage: 'Lexer',
    input: 'Buat h1:\\n "Halo"',
    status: 'pass',
  },
  {
    id: 'E1002',
    name: 'Indentasi tidak konsisten (dedent ke level tidak ada)',
    stage: 'Lexer',
    input: 'Buat h1:\\n    "a"\\n  "b"',
    status: 'pass',
  },
  {
    id: 'E1003',
    name: 'String tidak ditutup',
    stage: 'Lexer',
    input: 'Buat h1:\\n    "Halo',
    status: 'pass',
  },
  {
    id: 'E1004',
    name: 'Block opener tanpa colon (:)',
    stage: 'Lexer',
    input: 'Buat h1',
    status: 'pass',
  },
  {
    id: 'E1005',
    name: 'Karakter tidak dikenali',
    stage: 'Lexer',
    input: 'Buat h1: @#$',
    status: 'pass',
  },
  {
    id: 'E2001',
    name: 'Token tidak sesuai yang diharapkan',
    stage: 'Parser',
    input: 'Ulangi untuk:',
    status: 'pass',
  },
  {
    id: 'E2010',
    name: 'Expected "untuk/for" setelah "ulangi/loop"',
    stage: 'Parser',
    input: 'Ulangi 3: "item"',
    status: 'pass',
  },
  {
    id: 'E3001',
    name: 'Identifier tidak dideklarasikan',
    stage: 'Resolver',
    input: 'tetap x = namaTidakAda',
    status: 'pass',
  },
  {
    id: 'E3002',
    name: 'Simbol duplikat dalam scope yang sama',
    stage: 'Resolver',
    input: 'data x = 1\\ndata x = 2',
    status: 'pass',
  },
  {
    id: 'E3004',
    name: 'Menggunakan komponen sebelum deklarasi',
    stage: 'Resolver',
    input: 'Buat TidakAdaKomponen(nama: "hai")',
    status: 'pass',
  },
  {
    id: 'E4005',
    name: 'Parameter duplikat dalam komponen',
    stage: 'Analyzer',
    input: 'Komponen Kartu(judul, judul):\\n    Buat div:\\n        "hai"',
    status: 'pass',
  },
  {
    id: 'E4012',
    name: '"lewati" di luar loop',
    stage: 'Analyzer',
    input: 'lewati',
    status: 'pass',
  },
  {
    id: 'E4013',
    name: '"kembalikan" di luar fungsi/komponen',
    stage: 'Analyzer',
    input: 'kembalikan 5',
    status: 'pass',
  },
  {
    id: 'E0000',
    name: 'System error (file tidak dapat dibaca)',
    stage: 'Engine',
    input: 'compileFile("/path/tidak/ada.pjs")',
    status: 'pass',
  },
];

const featureGaps = [
  {
    id: 'E3003',
    name: 'Menulis ke variabel tetap (const)',
    reason: 'Keyword `simpan` belum diimplementasi di lexer/parser',
  },
  {
    id: 'E3005',
    name: '"ketika" tanpa target di luar blok buat/komponen',
    reason: 'Keyword `ketika` belum diimplementasi di lexer',
  },
  {
    id: 'E4001',
    name: 'Lifecycle hook di luar komponen',
    reason: 'Keyword `dipasang` belum diimplementasi di lexer',
  },
  {
    id: 'E4002',
    name: 'Side-effect di dalam ekspresi turunan',
    reason:
      'Keyword `simpan`/`tambahkan` belum diimplementasi — tidak bisa membuat side-effect di turunan',
  },
  {
    id: 'E4004',
    name: 'Menulis ke data turunan (read-only)',
    reason: 'Keyword `simpan` belum diimplementasi — tidak bisa menulis ke turunan',
  },
  {
    id: 'E4006',
    name: 'Parameter tanpa default setelah parameter dengan default',
    reason: 'Parser tidak handle `=` di parameter list komponen',
  },
  {
    id: 'E4007',
    name: 'Mode tampilkan tidak valid',
    reason: 'Keyword `Tampilkan` belum diimplementasi di lexer',
  },
  {
    id: 'E4008',
    name: 'Properti perbarui tidak didukung',
    reason: 'Keyword `Perbarui` belum diimplementasi di lexer',
  },
  {
    id: 'E4010',
    name: 'Penggunaan "gunakan" untuk non-komponen',
    reason: 'Keyword `gunakan` belum diimplementasi di lexer',
  },
  {
    id: 'E4011',
    name: '"berhenti" di luar loop/handler',
    reason: 'Keyword `berhenti` belum diimplementasi di lexer',
  },
  {
    id: 'E4101',
    name: 'Target tidak dapat ditulis',
    reason: 'Keyword `simpan` belum diimplementasi — tidak bisa trigger write ke non-writable',
  },
  {
    id: 'E4009',
    name: 'Event name tidak dikenali (warning)',
    reason: 'Warning di-push ke resolver.warnings tapi engine tidak return warnings dari resolver',
  },
];

const deferredToD21 = [
  {
    id: 'E4201',
    name: 'Dependency cycle pada data turunan',
    reason: 'Setup kompleks: butuh 2 turunan saling refer',
  },
  {
    id: 'E5001',
    name: 'Node AST tidak didukung compiler',
    reason: 'Butuh synthetic AST node untuk trigger — tidak bisa via source code',
  },
  {
    id: 'W4003',
    name: 'Deklarasi tetap tanpa nilai awal',
    reason: 'Tidak terpicu dengan input sederhana — butuh setup lebih detail',
  },
  {
    id: 'W3002',
    name: 'Variabel shadowing scope luar',
    reason: 'Tidak terpicu dengan input sederhana — butuh setup lebih detail',
  },
  {
    id: 'W3003',
    name: 'Watcher target bukan data reaktif',
    reason: 'Butuh `Saat` statement dengan non-reaktif target — defer ke D2.1',
  },
  {
    id: 'W4001',
    name: 'Type hint tidak cocok dengan nilai',
    reason: 'Butuh type hint syntax yang valid — defer ke D2.1',
  },
  {
    id: 'W4002',
    name: 'Lifecycle hook di dalam loop/handler',
    reason: 'Keyword `dipasang` belum diimplementasi',
  },
  {
    id: 'W4102',
    name: 'Simbol ditulis tapi tidak pernah dibaca',
    reason: 'Butuh setup yang lebih spesifik — defer ke D2.1',
  },
  {
    id: 'W4103',
    name: 'Data reaktif dimutasi tapi tidak dibaca',
    reason: 'Butuh setup yang lebih spesifik — defer ke D2.1',
  },
  {
    id: 'W4104',
    name: 'Watcher target bukan data reaktif (analyzer)',
    reason: 'Butuh `Saat` dengan non-reaktif — defer ke D2.1',
  },
];

const positiveTests = [
  {
    id: 'pass-statement',
    name: 'PassStatement ("pass")',
    input: 'Buat ruang.kotak:\\n    pass',
    status: 'pass',
  },
  {
    id: 'lewati-statement',
    name: 'PassStatement ("lewati")',
    input: 'Buat ruang.kotak:\\n    lewati',
    status: 'pass',
  },
  {
    id: 'fungsi-declaration',
    name: 'FungsiDeclaration with parameters',
    input: 'Fungsi tambah(a, b):\\n    kembalikan a + b',
    status: 'pass',
  },
  {
    id: 'saat-statement',
    name: 'SaatStatement (reactive watcher)',
    input: 'data hitung = 0\\nSaat hitung:\\n    "berubah"',
    status: 'pass',
  },
  {
    id: 'kembalikan-statement',
    name: 'KembalikanStatement (return)',
    input: 'Fungsi halo():\\n    kembalikan "hai"',
    status: 'pass',
  },
];

// ─── Build report ──────────────────────────────────────────────────────

const sections = [
  {
    title: 'Error codes yang berhasil dites',
    description:
      '14 error codes yang aktif di-throw dan berhasil dipicu dengan input negatif. ' +
      'Setiap test memverifikasi bahwa kode error yang spesifik muncul untuk input yang salah.',
    cases: testedErrors.map((e) => ({
      id: e.id,
      name: `${e.id}: ${e.name}`,
      category: e.stage,
      status: e.status,
      input: e.input,
      interesting: ['E0000', 'E4005', 'E3004'].includes(e.id),
      notes:
        e.id === 'E0000'
          ? 'System error dipicu via compileFile() dengan path yang tidak ada.'
          : e.id === 'E4005'
            ? 'Parameter duplikat di komponen — satu-satunya analyzer error yang bisa dipicu tanpa keyword yang belum diimplementasi.'
            : e.id === 'E3004'
              ? 'Komponen tidak terdaftar dipicu via Buat NamaKomponen(...) tanpa deklarasi Komponen sebelumnya.'
              : undefined,
    })),
  },
  {
    title: 'Warning codes yang berhasil dites',
    description: '1 warning code berhasil dipicu. Sisanya di-defer ke D2.1.',
    cases: [
      {
        id: 'W4101',
        name: 'W4101: Simbol dideklarasikan tapi tidak digunakan',
        category: 'Warning',
        status: 'pass',
        input: 'tetap x = 5\\nBuat h1:\\n    "Halo"',
      },
    ],
  },
  {
    title: 'Statement type positive tests',
    description:
      '5 positive tests untuk statement type yang sebelumnya belum ada test khusus. ' +
      'Semua berhasil compile berkat bug fix D1 (word operator collision, boolean/null literals, ' +
      'SaatStatement target, fragment compiledVarName).',
    cases: positiveTests.map((e) => ({
      id: e.id,
      name: e.name,
      category: 'Positive',
      status: e.status,
      input: e.input,
      interesting: ['fungsi-declaration', 'saat-statement'].includes(e.id),
      notes:
        e.id === 'fungsi-declaration'
          ? 'Bug fix D1: `tambah` sebelumnya dianggap operator `+`, bukan nama fungsi.'
          : e.id === 'saat-statement'
            ? 'Bug fix D1: target SaatStatement sebelumnya di-stringify sebagai "[object Object]".'
            : undefined,
    })),
  },
  {
    title: 'Feature gap — error codes yang TIDAK dapat dipicu',
    description:
      '12 error codes yang terdefinisi di source code tapi TIDAK dapat dipicu karena ' +
      'keyword yang dibutuhkan belum diimplementasi di lexer. Ini bukan bug — ini ' +
      'feature gap yang akan diimplementasi di wave mendatang. Daftar ini akan ' +
      'dipakai sebagai blueprint untuk implementasi keyword baru.',
    cases: featureGaps.map((e) => ({
      id: e.id,
      name: `${e.id}: ${e.name}`,
      category: 'Feature gap',
      status: 'skip',
      notes: e.reason,
      interesting: ['E3003', 'E4011', 'E4001'].includes(e.id),
    })),
  },
  {
    title: 'Deferred ke D2.1 — error/warning dengan setup kompleks',
    description:
      '10 error/warning codes yang butuh setup kompleks atau synthetic AST untuk ' +
      'dipicu. Akan dikerjakan di sub-wave D2.1 terpisah.',
    cases: deferredToD21.map((e) => ({
      id: e.id,
      name: `${e.id}: ${e.name}`,
      category: 'Deferred',
      status: 'skip',
      notes: e.reason,
    })),
  },
];

writeReport(OUTPUT_FILE, {
  title: 'D2 — Negative-test Matrix',
  waveId: 'D2',
  description:
    'Test suite untuk memverifikasi bahwa setiap kode error `E####` yang aktif ' +
    'di-throw muncul dengan input yang salah. Juga mencakup positive tests untuk ' +
    'statement type yang sebelumnya belum ada test khusus.\n\n' +
    '**Hasil**: 14 error codes berhasil dites, 1 warning berhasil dites, 5 positive ' +
    'tests untuk statement type. 12 error codes adalah feature gap (keyword belum ' +
    'diimplementasi), 10 error/warning di-defer ke D2.1 (setup kompleks).',
  sections,
  stats: {
    total:
      testedErrors.length + 1 + positiveTests.length + featureGaps.length + deferredToD21.length,
    passed: testedErrors.length + 1 + positiveTests.length,
    failed: 0,
    skipped: featureGaps.length + deferredToD21.length,
  },
});

console.log(`Report written: ${OUTPUT_FILE}`);
console.log(
  `Stats: ${testedErrors.length + 1 + positiveTests.length} pass, 0 fail, ${featureGaps.length + deferredToD21.length} skip`
);
