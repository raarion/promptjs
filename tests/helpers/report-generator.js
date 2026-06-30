'use strict';

/**
 * Zero-dependency Markdown report generator for Wave D test suites.
 *
 * Generates human-readable Markdown reports from structured test results,
 * following the agreed "B+C middle ground" format:
 *   - Ringkasan tabel di awal (semua test case)
 *   - Section detail per test case yang "interesting" (gagal, edge case,
 *     bug fix, atau test yang dokumentasi visualnya penting)
 *
 * Output di-commit ke `tests/reports/D<N>-<name>.md` sebagai bahan
 * dokumentasi Wave E.
 *
 * Bahasa: Indonesia (sesuai keputusan K1).
 */

const fs = require('fs');
const path = require('path');

/**
 * @typedef {Object} TestCase
 * @property {string} id - Test ID unik (mis. 'buat-statement-simple')
 * @property {string} name - Nama deskriptif test
 * @property {string} category - Kategori (mis. 'BuatStatement', 'Lexer', 'E1001')
 * @property {'pass' | 'fail' | 'skip'} status - Status test
 * @property {string} [input] - Source input (untuk display)
 * @property {string} [expected] - Expected output/behavior
 * @property {string} [actual] - Actual output (jika berbeda dari expected)
 * @property {string} [notes] - Catatan tambahan
 * @property {boolean} [interesting] - Jika true, test case ini akan dapat
 *   section detail terpisah di luar tabel ringkasan
 * @property {string} [snapshotFile] - Path ke file snapshot (opsional)
 * @property {string} [snapshotLine] - Baris di snapshot file (opsional)
 */

/**
 * @typedef {Object} ReportSection
 * @property {string} title - Judul section (mis. 'Statement: BuatStatement')
 * @property {string} [description] - Deskripsi section
 * @property {TestCase[]} cases - Daftar test case dalam section ini
 */

/**
 * @typedef {Object} ReportOptions
 * @property {string} title - Judul report (mis. 'D1 — Snapshot Codegen Tests')
 * @property {string} waveId - ID wave (mis. 'D1', 'D2', 'D2.1', 'D3')
 * @property {string} [description] - Deskripsi report (paragraf pembuka)
 * @property {string} [date] - Tanggal report (default: today ISO)
 * @property {ReportSection[]} sections - Daftar section dalam report
 * @property {{ total: number, passed: number, failed: number, skipped: number }} [stats] - Statistik
 */

/**
 * Escape karakter markdown special dalam inline text.
 *
 * @param {string} text
 * @returns {string}
 */
function escapeMd(text) {
  if (text == null) return '';
  return String(text).replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\n/g, ' ↵ ');
}

/**
 * Format code block dengan fence yang tepat.
 *
 * @param {string} code
 * @param {string} [lang='']
 * @returns {string}
 */
function codeBlock(code, lang = '') {
  if (code == null) return '';
  return '```' + lang + '\n' + String(code) + '\n```\n';
}

/**
 * Format tabel ringkasan untuk satu section.
 *
 * @param {TestCase[]} cases
 * @returns {string}
 */
function summaryTable(cases) {
  const hasSnapshot = cases.some((c) => c.snapshotFile);
  const header = hasSnapshot
    ? '| # | Test ID | Nama | Status | Snapshot |'
    : '| # | Test ID | Nama | Status |';
  const sep = hasSnapshot
    ? '|---|---------|------|--------|----------|'
    : '|---|---------|------|--------|';

  const rows = cases.map((c, i) => {
    const statusIcon = c.status === 'pass' ? '✅' : c.status === 'fail' ? '❌' : '⏭️';
    const snapshotRef = c.snapshotFile
      ? `[${c.snapshotFile.split('/').pop()}${c.snapshotLine ? `:${c.snapshotLine}` : ''}](../${c.snapshotFile})`
      : '';
    return hasSnapshot
      ? `| ${i + 1} | \`${c.id}\` | ${escapeMd(c.name)} | ${statusIcon} | ${snapshotRef} |`
      : `| ${i + 1} | \`${c.id}\` | ${escapeMd(c.name)} | ${statusIcon} |`;
  });

  return [header, sep, ...rows].join('\n') + '\n';
}

/**
 * Format section detail untuk satu test case yang "interesting".
 *
 * @param {TestCase} c
 * @param {number} idx - Index dalam section (untuk numbering)
 * @returns {string}
 */
function detailSection(c, idx) {
  const lines = [];
  const statusIcon = c.status === 'pass' ? '✅' : c.status === 'fail' ? '❌' : '⏭️';

  lines.push(`### ${idx}. \`${c.id}\` — ${c.name} ${statusIcon}`);
  lines.push('');

  if (c.category) {
    lines.push(`**Kategori**: ${c.category}`);
    lines.push('');
  }

  if (c.input != null) {
    lines.push('**Input**:');
    lines.push('');
    lines.push(codeBlock(c.input, 'pjs'));
  }

  if (c.expected != null) {
    lines.push('**Expected**:');
    lines.push('');
    lines.push(codeBlock(c.expected));
  }

  if (c.actual != null && c.actual !== c.expected) {
    lines.push('**Actual**:');
    lines.push('');
    lines.push(codeBlock(c.actual));
  }

  if (c.snapshotFile) {
    lines.push(
      `**Snapshot**: \`${c.snapshotFile}\`${c.snapshotLine ? ` (line ${c.snapshotLine})` : ''}`
    );
    lines.push('');
  }

  if (c.notes) {
    lines.push('**Catatan**:');
    lines.push('');
    lines.push(c.notes);
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  return lines.join('\n');
}

/**
 * Generate Markdown report dari struktur data yang diberikan.
 *
 * @param {ReportOptions} opts
 * @returns {string} Markdown string
 */
function generateReport(opts) {
  const lines = [];
  const date = opts.date || new Date().toISOString().slice(0, 10);

  // Header
  lines.push(`# ${opts.title}`);
  lines.push('');
  lines.push(`> **Wave**: ${opts.waveId}  `);
  lines.push(`> **Tanggal**: ${date}  `);
  if (opts.stats) {
    const { total, passed, failed, skipped } = opts.stats;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0';
    lines.push(
      `> **Statistik**: ${passed}/${total} lulus (${passRate}%) • ${failed} gagal • ${skipped} skip  `
    );
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  // Description
  if (opts.description) {
    lines.push(opts.description);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  // Daftar Isi
  if (opts.sections && opts.sections.length > 0) {
    lines.push('## Daftar Isi');
    lines.push('');
    opts.sections.forEach((s, i) => {
      lines.push(`${i + 1}. [${s.title}](#${slugify(s.title)})`);
    });
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  // Sections
  opts.sections.forEach((section, idx) => {
    lines.push(`## ${idx + 1}. ${section.title}`);
    lines.push('');

    if (section.description) {
      lines.push(section.description);
      lines.push('');
    }

    // Tabel ringkasan
    lines.push('### Ringkasan');
    lines.push('');
    lines.push(summaryTable(section.cases));
    lines.push('');

    // Detail untuk test case yang interesting
    const interesting = section.cases.filter((c) => c.interesting);
    if (interesting.length > 0) {
      lines.push('### Detail Test Case');
      lines.push('');
      interesting.forEach((c, i) => {
        lines.push(detailSection(c, i + 1));
      });
    }
  });

  return lines.join('\n');
}

/**
 * Slugify string untuk anchor link di Markdown.
 *
 * @param {string} s
 * @returns {string}
 */
function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Tulis report ke file.
 *
 * @param {string} filepath - Path output (mis. 'tests/reports/D1-snapshot.md')
 * @param {ReportOptions} opts
 * @returns {string} Path file yang ditulis
 */
function writeReport(filepath, opts) {
  const content = generateReport(opts);
  fs.mkdirSync(path.dirname(filepath), { recursive: true });
  fs.writeFileSync(filepath, content, 'utf-8');
  return filepath;
}

module.exports = {
  generateReport,
  writeReport,
  escapeMd,
  codeBlock,
  summaryTable,
  detailSection,
  slugify,
};
