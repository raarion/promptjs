/**
 * Generate D1 snapshot report Markdown dari snapshot file.
 *
 * Membaca `tests/__snapshots__/snapshot-codegen.test.js.snap`, parse
 * setiap snapshot, dan hasilkan `tests/reports/D1-snapshot.md` dengan
 * format B+C middle-ground (tabel ringkasan + detail test case interesting).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { writeReport } = require('./report-generator');

const SNAPSHOT_FILE = path.join(__dirname, '..', '__snapshots__', 'snapshot-codegen.test.js.snap');
const OUTPUT_FILE = path.join(__dirname, '..', 'reports', 'D1-snapshot.md');

/**
 * Parse snapshot file menjadi map { testKey: snapshotContent }.
 *
 * @param {string} content - Isi file .snap
 * @returns {Object<string, string>}
 */
function parseSnapshots(content) {
  const out = {};
  // Pattern: exports[`<test key> 1`] = `<content>`;
  // Content bisa multi-line, bisa mengandung backtick escaped (\`)
  const regex = /exports\[`([^`]+)`\] = `([\s\S]*?)`;\s*\n/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const key = match[1];
    const value = match[2];
    out[key] = value;
  }
  return out;
}

/**
 * Klasifikasikan test key menjadi section + test case.
 *
 * @param {string} key - Test key (mis. "D1 — Snapshot Codegen > Statement: BuatStatement > buat-simple: ...")
 * @returns {{ section: string, name: string, id: string }}
 */
function classifyKey(key) {
  // Pattern: "D1 — Snapshot Codegen > <Section> > <name>"
  const parts = key.split(' > ');
  if (parts.length < 3) {
    return { section: 'Lainnya', name: key, id: key };
  }
  const section = parts[1];
  const name = parts[2];
  // Generate ID dari name: ambil sebelum ":"
  const id = name.split(':')[0].trim().toLowerCase().replace(/\s+/g, '-');
  return { section, name, id };
}

/**
 * Cek apakah test case "interesting" (perlu section detail).
 * Kriteria: snapshot kosong, atau test case tertentu yang ingin ditampilkan.
 *
 * @param {string} key
 * @param {string} snapshot
 * @returns {boolean}
 */
function isInteresting(key, snapshot) {
  // Snapshot kosong = compile error / no output
  if (!snapshot || snapshot.trim() === '' || snapshot.trim() === '""') {
    return true;
  }
  // Test case dengan bug fix history
  const interestingIds = [
    'fungsi-with-params', // bug fix #1: lexer word operator collision
    'saat-basic', // bug fix #2: resolver SaatStatement target
    'on-event-klik', // bug fix #3: fragment compiledVarName
    'literal-boolean', // bug fix #4: boolean/null literals
    'literal-null',
    'binary-logic',
    'binary-word', // word operators
    'composite-counter', // end-to-end
    'composite-list',
  ];
  const { id } = classifyKey(key);
  return interestingIds.includes(id);
}

/**
 * Ekstrak source code dari test case name.
 *
 * @param {string} name - Test name (mis. "buat-simple: Buat h1: \"Hello\"")
 * @returns {string}
 */
function extractSource(name) {
  const colonIdx = name.indexOf(':');
  if (colonIdx < 0) return '';
  return name.substring(colonIdx + 1).trim();
}

// ─── Main ──────────────────────────────────────────────────────────────

const snapContent = fs.readFileSync(SNAPSHOT_FILE, 'utf-8');
const snapshots = parseSnapshots(snapContent);

console.log(`Parsed ${Object.keys(snapshots).length} snapshots`);

// Kelompokkan snapshot per section
const sectionMap = new Map();
let totalPass = 0;
let totalFail = 0;
const totalSkip = 0;

for (const [key, snap] of Object.entries(snapshots)) {
  const { section, name, id } = classifyKey(key);
  if (!sectionMap.has(section)) sectionMap.set(section, []);
  const source = extractSource(name);
  const isEmpty = !snap || snap.trim() === '' || snap.trim() === '""';
  const status = isEmpty ? 'fail' : 'pass';
  if (status === 'pass') totalPass++;
  else totalFail++;

  sectionMap.get(section).push({
    id,
    name: name,
    category: section,
    status,
    input: source,
    actual: isEmpty ? '(kosong — compile error atau tidak ada output)' : snap,
    interesting: isInteresting(key, snap),
    snapshotFile: 'tests/__snapshots__/snapshot-codegen.test.js.snap',
  });
}

const sections = Array.from(sectionMap.entries()).map(([title, cases]) => ({
  title,
  description: '',
  cases: cases.sort((a, b) => a.id.localeCompare(b.id)),
}));

const reportOpts = {
  title: 'D1 — Snapshot Codegen Tests',
  waveId: 'D1',
  description:
    'Snapshot test suite untuk mengunci output codegen per statement type dan expression type. ' +
    'Setiap perubahan codegen yang mengubah output akan terdeteksi otomatis saat `npm test` dijalankan.\n\n' +
    '**Bug fix yang terkait dengan D1:**\n' +
    '1. **Lexer** — `_tokenizeDeclaration` sekarang parse nama identifier secara eksplisit untuk ' +
    'Fungsi/Komponen/Data/Tetap/Ubah/Turunan/Saat, menghindari collision dengan word operators ' +
    '(`tambah`/`kali`/`dan`/`atau`/`tidak`). Sebelum fix: `Fungsi tambah(a, b):` gagal karena `tambah` ' +
    'dianggap operator `+`.\n' +
    '2. **Lexer** — Tambah `TK_BENAR`/`TK_SALAH`/`TK_KOSONG` ke `TT` dan `benar`/`salah`/`kosong` ' +
    '(serta `true`/`false`/`null`) ke `KEYWORDS`. Sebelum fix: `tetap x = benar` gagal karena ' +
    '`benar` dianggap identifier.\n' +
    '3. **Parser** — `_parsePrimaryExpression` sekarang handle `TK_BENAR`/`TK_SALAH`/`TK_KOSONG` ' +
    'menjadi Literal node dengan value `true`/`false`/`null`.\n' +
    '4. **Resolver** — `visitSaatStatement` sekarang handle target berupa AST node ' +
    '(Identifier/MemberExpression), bukan hanya string. Sebelum fix: `Saat hitung:` gagal dengan ' +
    'E3001 "Identifier [object Object] tidak dideklarasikan".\n' +
    '5. **Compiler** — `visitBuatStatement` untuk fragment sekarang mewariskan `compiledVarName` ' +
    'dari parent, sehingga event handler tanpa target eksplisit ' +
    '(mis. `on_klik = ...` di dalam multi-child Buat body) resolve ke parent element yang benar. ' +
    'Sebelum fix: emit `__el_2.addEventListener(...)` padahal `__el_2` belum dideklarasikan.\n\n' +
    '**Catatan**: snapshot berisi user code saja (bagian setelah `// === User Code ===` dan sebelum ' +
    'IIFE closer `})();`), bukan full output compiler. Runtime helpers (~80 baris boilerplate) ' +
    'di-skip supaya perubahan runtime helpers tidak membuat semua snapshot fail.',
  sections,
  stats: {
    total: totalPass + totalFail + totalSkip,
    passed: totalPass,
    failed: totalFail,
    skipped: totalSkip,
  },
};

writeReport(OUTPUT_FILE, reportOpts);
console.log(`Report written: ${OUTPUT_FILE}`);
console.log(`Stats: ${totalPass} pass, ${totalFail} fail, ${totalSkip} skip`);
